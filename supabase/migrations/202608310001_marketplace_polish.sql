-- Prevent new buyers and new offers from entering a transaction after a listing is reserved.
-- Existing participants can still reopen their conversation from the transaction flow.

create or replace function public.get_or_create_conversation(p_listing_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  listing_seller_id uuid;
  conversation_id uuid;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  select id into conversation_id
  from public.conversations
  where listing_id = p_listing_id
    and buyer_id = current_user_id;

  if conversation_id is not null then
    return conversation_id;
  end if;

  select seller_id into listing_seller_id
  from public.listings
  where id = p_listing_id
    and status = 'published';

  if listing_seller_id is null then
    raise exception 'Listing unavailable';
  end if;
  if listing_seller_id = current_user_id then
    raise exception 'You cannot contact yourself about your own listing';
  end if;

  insert into public.conversations (listing_id, buyer_id, seller_id)
  values (p_listing_id, current_user_id, listing_seller_id)
  on conflict (listing_id, buyer_id, seller_id)
  do update set updated_at = public.conversations.updated_at
  returning id into conversation_id;

  return conversation_id;
end;
$$;

create or replace function public.create_conversation_offer(p_conversation_id uuid, p_amount bigint)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  selected_conversation public.conversations%rowtype;
  selected_listing public.listings%rowtype;
  offer_id uuid;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;
  if p_amount not between 100 and 1000000000 then
    raise exception 'Offer amount is invalid';
  end if;

  select * into selected_conversation
  from public.conversations
  where id = p_conversation_id
  for update;

  if selected_conversation.id is null or selected_conversation.buyer_id <> current_user_id then
    raise exception 'Only the buyer can make an offer';
  end if;

  select * into selected_listing
  from public.listings
  where id = selected_conversation.listing_id
  for update;

  if selected_listing.status <> 'published' then
    raise exception 'Listing unavailable for offers';
  end if;

  update public.offers
  set status = 'cancelled', responded_at = timezone('utc', now())
  where conversation_id = p_conversation_id and status = 'pending';

  insert into public.offers (
    conversation_id, listing_id, buyer_id, seller_id, amount
  ) values (
    selected_conversation.id,
    selected_conversation.listing_id,
    selected_conversation.buyer_id,
    selected_conversation.seller_id,
    p_amount
  ) returning id into offer_id;

  insert into public.messages (conversation_id, sender_id, kind, offer_id)
  values (selected_conversation.id, current_user_id, 'offer', offer_id);

  return offer_id;
end;
$$;

revoke all on function public.get_or_create_conversation(uuid) from public, anon;
revoke all on function public.create_conversation_offer(uuid, bigint) from public, anon;
grant execute on function public.get_or_create_conversation(uuid) to authenticated;
grant execute on function public.create_conversation_offer(uuid, bigint) to authenticated;
