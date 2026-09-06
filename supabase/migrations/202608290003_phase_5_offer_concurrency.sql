create or replace function public.respond_to_conversation_offer(p_offer_id uuid, p_accept boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  selected_offer public.offers%rowtype;
  current_listing_status public.listing_status;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  select * into selected_offer
  from public.offers
  where id = p_offer_id
  for update;

  if selected_offer.id is null or selected_offer.seller_id <> current_user_id then
    raise exception 'Only the seller can respond to this offer';
  end if;
  if selected_offer.status <> 'pending' then
    raise exception 'This offer is no longer pending';
  end if;

  if p_accept then
    select status into current_listing_status
    from public.listings
    where id = selected_offer.listing_id
    for update;

    if current_listing_status not in ('published', 'reserved') then
      raise exception 'Listing unavailable for this offer';
    end if;
    if exists (
      select 1 from public.offers
      where listing_id = selected_offer.listing_id
        and id <> p_offer_id
        and status = 'accepted'
    ) then
      raise exception 'Another offer has already been accepted for this listing';
    end if;
  end if;

  update public.offers
  set status = case when p_accept then 'accepted'::public.offer_status else 'declined'::public.offer_status end,
      responded_at = timezone('utc', now())
  where id = p_offer_id;

  if p_accept then
    update public.offers
    set status = 'declined', responded_at = timezone('utc', now())
    where listing_id = selected_offer.listing_id
      and id <> p_offer_id
      and status = 'pending';

    update public.listings
    set status = 'reserved'
    where id = selected_offer.listing_id;
  end if;

  insert into public.messages (conversation_id, kind, body)
  values (
    selected_offer.conversation_id,
    'system',
    case when p_accept then 'offer_accepted' else 'offer_declined' end
  );
end;
$$;

comment on function public.respond_to_conversation_offer(uuid, boolean)
is 'Seller-only offer response serialized on the listing row to prevent concurrent acceptances.';
