create type public.message_kind as enum ('text', 'offer', 'system');
create type public.offer_status as enum ('pending', 'accepted', 'declined', 'cancelled');

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  buyer_id uuid not null references public.profiles (id) on delete cascade,
  seller_id uuid not null references public.profiles (id) on delete cascade,
  buyer_last_read_at timestamptz,
  seller_last_read_at timestamptz,
  last_message_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint conversations_distinct_participants check (buyer_id <> seller_id),
  unique (listing_id, buyer_id, seller_id)
);

create table public.offers (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  listing_id uuid not null references public.listings (id) on delete cascade,
  buyer_id uuid not null references public.profiles (id) on delete cascade,
  seller_id uuid not null references public.profiles (id) on delete cascade,
  amount bigint not null check (amount between 100 and 1000000000),
  status public.offer_status not null default 'pending',
  responded_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint offers_distinct_participants check (buyer_id <> seller_id)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid references public.profiles (id) on delete set null,
  kind public.message_kind not null default 'text',
  body text,
  offer_id uuid unique references public.offers (id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  constraint messages_payload_matches_kind check (
    (kind = 'text' and sender_id is not null and offer_id is null and char_length(trim(body)) between 1 and 2000)
    or (kind = 'offer' and sender_id is not null and offer_id is not null and body is null)
    or (kind = 'system' and sender_id is null and offer_id is null and char_length(trim(body)) between 1 and 200)
  )
);

create index conversations_buyer_inbox_idx
on public.conversations (buyer_id, last_message_at desc);

create index conversations_seller_inbox_idx
on public.conversations (seller_id, last_message_at desc);

create index messages_conversation_timeline_idx
on public.messages (conversation_id, created_at, id);

create index offers_conversation_idx
on public.offers (conversation_id, created_at desc);

create unique index offers_one_pending_per_conversation_idx
on public.offers (conversation_id)
where status = 'pending';

create trigger conversations_set_updated_at
before update on public.conversations
for each row execute function public.set_updated_at();

create trigger offers_set_updated_at
before update on public.offers
for each row execute function public.set_updated_at();

create function public.touch_conversation_after_message()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.conversations
  set last_message_at = new.created_at
  where id = new.conversation_id;
  return new;
end;
$$;

create trigger messages_touch_conversation
after insert on public.messages
for each row execute function public.touch_conversation_after_message();

alter table public.conversations enable row level security;
alter table public.offers enable row level security;
alter table public.messages enable row level security;

revoke all on table public.conversations from anon, authenticated;
revoke all on table public.offers from anon, authenticated;
revoke all on table public.messages from anon, authenticated;

grant select on table public.conversations to authenticated;
grant select on table public.offers to authenticated;
grant select on table public.messages to authenticated;
grant usage on type public.message_kind to authenticated;
grant usage on type public.offer_status to authenticated;

create policy "Participants can read their conversations"
on public.conversations for select to authenticated
using ((select auth.uid()) in (buyer_id, seller_id));

create policy "Participants can read conversation offers"
on public.offers for select to authenticated
using (
  exists (
    select 1
    from public.conversations
    where conversations.id = offers.conversation_id
      and (select auth.uid()) in (conversations.buyer_id, conversations.seller_id)
  )
);

create policy "Participants can read conversation messages"
on public.messages for select to authenticated
using (
  exists (
    select 1
    from public.conversations
    where conversations.id = messages.conversation_id
      and (select auth.uid()) in (conversations.buyer_id, conversations.seller_id)
  )
);

create policy "Conversation participants can retain listing context"
on public.listings for select to authenticated
using (
  exists (
    select 1
    from public.conversations
    where conversations.listing_id = listings.id
      and (select auth.uid()) in (conversations.buyer_id, conversations.seller_id)
  )
);

create policy "Conversation participants can retain listing images"
on public.listing_images for select to authenticated
using (
  exists (
    select 1
    from public.conversations
    where conversations.listing_id = listing_images.listing_id
      and (select auth.uid()) in (conversations.buyer_id, conversations.seller_id)
  )
);

create function public.get_or_create_conversation(p_listing_id uuid)
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

  select seller_id into listing_seller_id
  from public.listings
  where id = p_listing_id
    and status in ('published', 'reserved');

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

create function public.send_conversation_message(p_conversation_id uuid, p_body text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  clean_body text := trim(p_body);
  message_id uuid;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;
  if char_length(clean_body) not between 1 and 2000 then
    raise exception 'Message must contain between 1 and 2000 characters';
  end if;
  if not exists (
    select 1 from public.conversations
    where id = p_conversation_id
      and current_user_id in (buyer_id, seller_id)
  ) then
    raise exception 'Conversation unavailable';
  end if;

  insert into public.messages (conversation_id, sender_id, kind, body)
  values (p_conversation_id, current_user_id, 'text', clean_body)
  returning id into message_id;
  return message_id;
end;
$$;

create function public.create_conversation_offer(p_conversation_id uuid, p_amount bigint)
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

  if selected_listing.status not in ('published', 'reserved') then
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

create function public.respond_to_conversation_offer(p_offer_id uuid, p_accept boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  selected_offer public.offers%rowtype;
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
  if p_accept and not exists (
    select 1 from public.listings
    where id = selected_offer.listing_id and status in ('published', 'reserved')
  ) then
    raise exception 'Listing unavailable for this offer';
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

create function public.cancel_conversation_offer(p_offer_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  selected_offer public.offers%rowtype;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  select * into selected_offer
  from public.offers
  where id = p_offer_id
  for update;

  if selected_offer.id is null or selected_offer.buyer_id <> current_user_id then
    raise exception 'Only the buyer can cancel this offer';
  end if;
  if selected_offer.status <> 'pending' then
    raise exception 'This offer is no longer pending';
  end if;

  update public.offers
  set status = 'cancelled', responded_at = timezone('utc', now())
  where id = p_offer_id;

  insert into public.messages (conversation_id, kind, body)
  values (selected_offer.conversation_id, 'system', 'offer_cancelled');
end;
$$;

create function public.mark_conversation_read(p_conversation_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  update public.conversations
  set buyer_last_read_at = case when buyer_id = current_user_id then timezone('utc', now()) else buyer_last_read_at end,
      seller_last_read_at = case when seller_id = current_user_id then timezone('utc', now()) else seller_last_read_at end
  where id = p_conversation_id
    and current_user_id in (buyer_id, seller_id);

  if not found then
    raise exception 'Conversation unavailable';
  end if;
end;
$$;

revoke all on function public.get_or_create_conversation(uuid) from public, anon;
revoke all on function public.send_conversation_message(uuid, text) from public, anon;
revoke all on function public.create_conversation_offer(uuid, bigint) from public, anon;
revoke all on function public.respond_to_conversation_offer(uuid, boolean) from public, anon;
revoke all on function public.cancel_conversation_offer(uuid) from public, anon;
revoke all on function public.mark_conversation_read(uuid) from public, anon;

grant execute on function public.get_or_create_conversation(uuid) to authenticated;
grant execute on function public.send_conversation_message(uuid, text) to authenticated;
grant execute on function public.create_conversation_offer(uuid, bigint) to authenticated;
grant execute on function public.respond_to_conversation_offer(uuid, boolean) to authenticated;
grant execute on function public.cancel_conversation_offer(uuid) to authenticated;
grant execute on function public.mark_conversation_read(uuid) to authenticated;

alter table public.conversations replica identity full;
alter table public.offers replica identity full;
alter table public.messages replica identity full;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'conversations'
  ) then
    alter publication supabase_realtime add table public.conversations;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'offers'
  ) then
    alter publication supabase_realtime add table public.offers;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;
end;
$$;

comment on table public.conversations is 'Private buyer-seller threads scoped to one listing.';
comment on table public.offers is 'Negotiation offers mutated only through role-checked RPC functions.';
comment on table public.messages is 'Private conversation timeline. Writes are validated by security definer functions.';
