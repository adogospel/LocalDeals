create type public.deal_status as enum ('pending_handover', 'completed', 'cancelled');
create type public.notification_kind as enum (
  'message', 'offer_received', 'offer_accepted', 'offer_declined',
  'deal_created', 'deal_confirmed', 'deal_completed', 'deal_cancelled', 'review_received'
);
create type public.report_reason as enum ('scam', 'prohibited_item', 'harassment', 'spam', 'counterfeit', 'other');
create type public.report_status as enum ('open', 'reviewing', 'resolved', 'dismissed');

create table public.deals (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete restrict,
  conversation_id uuid not null references public.conversations (id) on delete restrict,
  offer_id uuid not null unique references public.offers (id) on delete restrict,
  buyer_id uuid not null references public.profiles (id) on delete restrict,
  seller_id uuid not null references public.profiles (id) on delete restrict,
  amount bigint not null check (amount between 100 and 1000000000),
  status public.deal_status not null default 'pending_handover',
  buyer_confirmed_at timestamptz,
  seller_confirmed_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  cancelled_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint deals_distinct_participants check (buyer_id <> seller_id),
  constraint deals_canceller_is_participant check (cancelled_by is null or cancelled_by in (buyer_id, seller_id))
);

create unique index deals_one_active_per_listing_idx
on public.deals (listing_id)
where status = 'pending_handover';

create index deals_buyer_history_idx on public.deals (buyer_id, created_at desc);
create index deals_seller_history_idx on public.deals (seller_id, created_at desc);
create index deals_conversation_idx on public.deals (conversation_id, created_at desc);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references public.deals (id) on delete restrict,
  author_id uuid not null references public.profiles (id) on delete restrict,
  subject_id uuid not null references public.profiles (id) on delete restrict,
  score smallint not null check (score between 1 and 5),
  comment text check (comment is null or char_length(trim(comment)) between 3 and 500),
  created_at timestamptz not null default timezone('utc', now()),
  constraint reviews_distinct_users check (author_id <> subject_id),
  unique (deal_id, author_id)
);

create index reviews_subject_idx on public.reviews (subject_id, created_at desc);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  actor_id uuid references public.profiles (id) on delete set null,
  kind public.notification_kind not null,
  listing_id uuid references public.listings (id) on delete cascade,
  conversation_id uuid references public.conversations (id) on delete cascade,
  deal_id uuid references public.deals (id) on delete cascade,
  review_id uuid references public.reviews (id) on delete cascade,
  title text not null check (char_length(trim(title)) between 2 and 100),
  body text not null check (char_length(trim(body)) between 2 and 240),
  read_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create index notifications_inbox_idx on public.notifications (recipient_id, read_at, created_at desc);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  reported_user_id uuid references public.profiles (id) on delete set null,
  listing_id uuid references public.listings (id) on delete set null,
  message_id uuid references public.messages (id) on delete set null,
  reason public.report_reason not null,
  details text check (details is null or char_length(trim(details)) between 5 and 1000),
  status public.report_status not null default 'open',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint reports_exactly_one_target check (num_nonnulls(reported_user_id, listing_id, message_id) = 1),
  constraint reports_cannot_target_self check (reported_user_id is null or reported_user_id <> reporter_id)
);

create index reports_reporter_idx on public.reports (reporter_id, created_at desc);
create index reports_moderation_idx on public.reports (status, created_at);

create trigger deals_set_updated_at before update on public.deals
for each row execute function public.set_updated_at();

create trigger reports_set_updated_at before update on public.reports
for each row execute function public.set_updated_at();

alter table public.deals enable row level security;
alter table public.reviews enable row level security;
alter table public.notifications enable row level security;
alter table public.reports enable row level security;

revoke all on table public.deals from anon, authenticated;
revoke all on table public.reviews from anon, authenticated;
revoke all on table public.notifications from anon, authenticated;
revoke all on table public.reports from anon, authenticated;

grant select on table public.deals to authenticated;
grant select on table public.reviews to anon, authenticated;
grant select on table public.notifications to authenticated;
grant select on table public.reports to authenticated;
grant usage on type public.deal_status to authenticated;
grant usage on type public.notification_kind to authenticated;
grant usage on type public.report_reason to authenticated;
grant usage on type public.report_status to authenticated;

create policy "Participants can read their deals"
on public.deals for select to authenticated
using ((select auth.uid()) in (buyer_id, seller_id));

create policy "Deal participants can read transaction listings"
on public.listings for select to authenticated
using (
  exists (
    select 1 from public.deals
    where deals.listing_id = listings.id
      and (select auth.uid()) in (deals.buyer_id, deals.seller_id)
  )
);

create policy "Deal participants can read transaction images"
on public.listing_images for select to authenticated
using (
  exists (
    select 1 from public.deals
    where deals.listing_id = listing_images.listing_id
      and (select auth.uid()) in (deals.buyer_id, deals.seller_id)
  )
);

create policy "Public can read verified reviews"
on public.reviews for select to anon, authenticated
using (true);

create policy "Users can read their notifications"
on public.notifications for select to authenticated
using ((select auth.uid()) = recipient_id);

create policy "Reporters can read their reports"
on public.reports for select to authenticated
using ((select auth.uid()) = reporter_id);

create function public.create_deal_after_offer_acceptance()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'accepted' and old.status is distinct from 'accepted' then
    insert into public.deals (
      listing_id, conversation_id, offer_id, buyer_id, seller_id, amount
    ) values (
      new.listing_id, new.conversation_id, new.id, new.buyer_id, new.seller_id, new.amount
    );
  end if;
  return new;
end;
$$;

insert into public.deals (listing_id, conversation_id, offer_id, buyer_id, seller_id, amount)
select offer.listing_id, offer.conversation_id, offer.id, offer.buyer_id, offer.seller_id, offer.amount
from public.offers offer
where offer.status = 'accepted'
  and not exists (select 1 from public.deals where deals.offer_id = offer.id);

create trigger offers_create_deal
after update of status on public.offers
for each row execute function public.create_deal_after_offer_acceptance();

create function public.notify_message_recipient()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_conversation public.conversations%rowtype;
  recipient uuid;
begin
  if new.kind <> 'text' or new.sender_id is null then return new; end if;
  select * into selected_conversation from public.conversations where id = new.conversation_id;
  recipient := case when new.sender_id = selected_conversation.buyer_id
    then selected_conversation.seller_id else selected_conversation.buyer_id end;
  insert into public.notifications (recipient_id, actor_id, kind, listing_id, conversation_id, title, body)
  values (recipient, new.sender_id, 'message', selected_conversation.listing_id, new.conversation_id,
    'Nouveau message', left(new.body, 240));
  return new;
end;
$$;

create trigger messages_create_notification
after insert on public.messages
for each row execute function public.notify_message_recipient();

create function public.notify_offer_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.notifications (recipient_id, actor_id, kind, listing_id, conversation_id, title, body)
    values (new.seller_id, new.buyer_id, 'offer_received', new.listing_id, new.conversation_id,
      'Nouvelle offre', 'Un acheteur vous propose un nouveau prix.');
  elsif old.status is distinct from new.status and new.status in ('accepted', 'declined') then
    insert into public.notifications (recipient_id, actor_id, kind, listing_id, conversation_id, title, body)
    values (new.buyer_id, new.seller_id,
      case when new.status = 'accepted' then 'offer_accepted'::public.notification_kind else 'offer_declined'::public.notification_kind end,
      new.listing_id, new.conversation_id,
      case when new.status = 'accepted' then 'Offre acceptée' else 'Offre refusée' end,
      case when new.status = 'accepted' then 'Organisez maintenant la remise de l’article.' else 'Le vendeur n’a pas retenu cette proposition.' end);
  end if;
  return new;
end;
$$;

create trigger offers_create_notification
after insert or update of status on public.offers
for each row execute function public.notify_offer_event();

create function public.notify_new_deal()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.notifications (recipient_id, actor_id, kind, listing_id, conversation_id, deal_id, title, body)
  values (new.buyer_id, new.seller_id, 'deal_created', new.listing_id, new.conversation_id, new.id,
    'Transaction à finaliser', 'Confirmez la remise seulement après avoir vérifié l’article.');
  return new;
end;
$$;

create trigger deals_create_notification
after insert on public.deals
for each row execute function public.notify_new_deal();

create function public.notify_deal_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  recipient uuid;
begin
  if old.status is distinct from new.status and new.status = 'completed' then
    insert into public.notifications (recipient_id, kind, listing_id, conversation_id, deal_id, title, body)
    values
      (new.buyer_id, 'deal_completed', new.listing_id, new.conversation_id, new.id, 'Transaction terminée', 'Vous pouvez maintenant laisser un avis vérifié.'),
      (new.seller_id, 'deal_completed', new.listing_id, new.conversation_id, new.id, 'Vente terminée', 'Vous pouvez maintenant laisser un avis vérifié.');
  elsif old.status is distinct from new.status and new.status = 'cancelled' then
    recipient := case when new.cancelled_by = new.buyer_id then new.seller_id else new.buyer_id end;
    insert into public.notifications (recipient_id, actor_id, kind, listing_id, conversation_id, deal_id, title, body)
    values (recipient, new.cancelled_by, 'deal_cancelled', new.listing_id, new.conversation_id, new.id,
      'Transaction annulée', 'L’article est de nouveau disponible à la vente.');
  elsif old.buyer_confirmed_at is null and new.buyer_confirmed_at is not null then
    insert into public.notifications (recipient_id, actor_id, kind, listing_id, conversation_id, deal_id, title, body)
    values (new.seller_id, new.buyer_id, 'deal_confirmed', new.listing_id, new.conversation_id, new.id,
      'Remise confirmée', 'L’acheteur a confirmé avoir reçu et vérifié l’article.');
  elsif old.seller_confirmed_at is null and new.seller_confirmed_at is not null then
    insert into public.notifications (recipient_id, actor_id, kind, listing_id, conversation_id, deal_id, title, body)
    values (new.buyer_id, new.seller_id, 'deal_confirmed', new.listing_id, new.conversation_id, new.id,
      'Remise confirmée', 'Le vendeur a confirmé avoir remis l’article.');
  end if;
  return new;
end;
$$;

create trigger deals_update_notification
after update on public.deals
for each row execute function public.notify_deal_event();

create function public.confirm_deal_handover(p_deal_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  selected_deal public.deals%rowtype;
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;
  select * into selected_deal from public.deals where id = p_deal_id for update;
  if selected_deal.id is null or current_user_id not in (selected_deal.buyer_id, selected_deal.seller_id) then
    raise exception 'Deal unavailable';
  end if;
  if selected_deal.status <> 'pending_handover' then raise exception 'Deal is no longer pending'; end if;

  update public.deals
  set buyer_confirmed_at = case when buyer_id = current_user_id then coalesce(buyer_confirmed_at, timezone('utc', now())) else buyer_confirmed_at end,
      seller_confirmed_at = case when seller_id = current_user_id then coalesce(seller_confirmed_at, timezone('utc', now())) else seller_confirmed_at end
  where id = p_deal_id
  returning * into selected_deal;

  if selected_deal.buyer_confirmed_at is not null and selected_deal.seller_confirmed_at is not null then
    update public.deals
    set status = 'completed', completed_at = timezone('utc', now())
    where id = p_deal_id;
    update public.listings set status = 'sold' where id = selected_deal.listing_id;
    insert into public.messages (conversation_id, kind, body)
    values (selected_deal.conversation_id, 'system', 'deal_completed');
  end if;
end;
$$;

create function public.cancel_deal(p_deal_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  selected_deal public.deals%rowtype;
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;
  select * into selected_deal from public.deals where id = p_deal_id for update;
  if selected_deal.id is null or current_user_id not in (selected_deal.buyer_id, selected_deal.seller_id) then
    raise exception 'Deal unavailable';
  end if;
  if selected_deal.status <> 'pending_handover' then raise exception 'Deal is no longer pending'; end if;
  if selected_deal.buyer_confirmed_at is not null or selected_deal.seller_confirmed_at is not null then
    raise exception 'A confirmed handover can no longer be cancelled';
  end if;

  update public.deals
  set status = 'cancelled', cancelled_at = timezone('utc', now()), cancelled_by = current_user_id
  where id = p_deal_id;
  update public.offers set status = 'cancelled', responded_at = timezone('utc', now()) where id = selected_deal.offer_id;
  update public.listings set status = 'published' where id = selected_deal.listing_id;
  insert into public.messages (conversation_id, kind, body)
  values (selected_deal.conversation_id, 'system', 'deal_cancelled');
end;
$$;

create function public.submit_deal_review(p_deal_id uuid, p_score smallint, p_comment text default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  selected_deal public.deals%rowtype;
  subject uuid;
  review_id uuid;
  clean_comment text := nullif(trim(p_comment), '');
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;
  if p_score not between 1 and 5 then raise exception 'Score must be between 1 and 5'; end if;
  if clean_comment is not null and char_length(clean_comment) not between 3 and 500 then raise exception 'Invalid review comment'; end if;
  select * into selected_deal from public.deals where id = p_deal_id;
  if selected_deal.id is null or selected_deal.status <> 'completed'
    or current_user_id not in (selected_deal.buyer_id, selected_deal.seller_id) then
    raise exception 'Completed deal required';
  end if;
  subject := case when current_user_id = selected_deal.buyer_id then selected_deal.seller_id else selected_deal.buyer_id end;
  insert into public.reviews (deal_id, author_id, subject_id, score, comment)
  values (p_deal_id, current_user_id, subject, p_score, clean_comment)
  returning id into review_id;
  return review_id;
end;
$$;

create function public.notify_new_review()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_deal public.deals%rowtype;
begin
  select * into selected_deal from public.deals where id = new.deal_id;
  insert into public.notifications (recipient_id, actor_id, kind, listing_id, conversation_id, deal_id, review_id, title, body)
  values (new.subject_id, new.author_id, 'review_received', selected_deal.listing_id, selected_deal.conversation_id,
    new.deal_id, new.id, 'Nouvel avis', 'Vous avez reçu un avis vérifié de ' || new.score::text || '/5.');
  return new;
end;
$$;

create trigger reviews_create_notification
after insert on public.reviews
for each row execute function public.notify_new_review();

create function public.mark_notification_read(p_notification_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.notifications set read_at = coalesce(read_at, timezone('utc', now()))
  where id = p_notification_id and recipient_id = auth.uid();
$$;

create function public.mark_all_notifications_read()
returns void
language sql
security definer
set search_path = ''
as $$
  update public.notifications set read_at = timezone('utc', now())
  where recipient_id = auth.uid() and read_at is null;
$$;

create function public.submit_report(p_target_type text, p_target_id uuid, p_reason public.report_reason, p_details text default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  report_id uuid;
  clean_details text := nullif(trim(p_details), '');
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;
  if clean_details is not null and char_length(clean_details) not between 5 and 1000 then raise exception 'Invalid report details'; end if;

  if p_target_type = 'user' then
    if p_target_id = current_user_id or not exists (select 1 from public.profiles where id = p_target_id) then
      raise exception 'Invalid reported user';
    end if;
    insert into public.reports (reporter_id, reported_user_id, reason, details)
    values (current_user_id, p_target_id, p_reason, clean_details) returning id into report_id;
  elsif p_target_type = 'listing' then
    if not exists (select 1 from public.listings where id = p_target_id and seller_id <> current_user_id) then
      raise exception 'Invalid reported listing';
    end if;
    insert into public.reports (reporter_id, listing_id, reason, details)
    values (current_user_id, p_target_id, p_reason, clean_details) returning id into report_id;
  elsif p_target_type = 'message' then
    if not exists (
      select 1 from public.messages
      join public.conversations on conversations.id = messages.conversation_id
      where messages.id = p_target_id
        and current_user_id in (conversations.buyer_id, conversations.seller_id)
        and messages.sender_id is distinct from current_user_id
    ) then raise exception 'Invalid reported message'; end if;
    insert into public.reports (reporter_id, message_id, reason, details)
    values (current_user_id, p_target_id, p_reason, clean_details) returning id into report_id;
  else
    raise exception 'Unsupported report target';
  end if;
  return report_id;
end;
$$;

create function public.get_public_profile_stats(p_user_id uuid)
returns table (average_rating numeric, review_count bigint, completed_sales bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select
    coalesce((select round(avg(score)::numeric, 1) from public.reviews where subject_id = p_user_id), 0),
    (select count(*) from public.reviews where subject_id = p_user_id),
    (select count(*) from public.deals where seller_id = p_user_id and status = 'completed')
  where exists (select 1 from public.profiles where id = p_user_id and onboarding_completed);
$$;

revoke all on function public.confirm_deal_handover(uuid) from public, anon;
revoke all on function public.cancel_deal(uuid) from public, anon;
revoke all on function public.submit_deal_review(uuid, smallint, text) from public, anon;
revoke all on function public.mark_notification_read(uuid) from public, anon;
revoke all on function public.mark_all_notifications_read() from public, anon;
revoke all on function public.submit_report(text, uuid, public.report_reason, text) from public, anon;
revoke all on function public.get_public_profile_stats(uuid) from public;
revoke all on function public.create_deal_after_offer_acceptance() from public, anon, authenticated;
revoke all on function public.notify_message_recipient() from public, anon, authenticated;
revoke all on function public.notify_offer_event() from public, anon, authenticated;
revoke all on function public.notify_new_deal() from public, anon, authenticated;
revoke all on function public.notify_deal_event() from public, anon, authenticated;
revoke all on function public.notify_new_review() from public, anon, authenticated;

grant execute on function public.confirm_deal_handover(uuid) to authenticated;
grant execute on function public.cancel_deal(uuid) to authenticated;
grant execute on function public.submit_deal_review(uuid, smallint, text) to authenticated;
grant execute on function public.mark_notification_read(uuid) to authenticated;
grant execute on function public.mark_all_notifications_read() to authenticated;
grant execute on function public.submit_report(text, uuid, public.report_reason, text) to authenticated;
grant execute on function public.get_public_profile_stats(uuid) to anon, authenticated;

alter table public.deals replica identity full;
alter table public.notifications replica identity full;
alter table public.reviews replica identity full;

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'deals') then
    alter publication supabase_realtime add table public.deals;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications') then
    alter publication supabase_realtime add table public.notifications;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'reviews') then
    alter publication supabase_realtime add table public.reviews;
  end if;
end;
$$;

comment on table public.deals is 'Verified handover lifecycle created only from accepted offers and completed by both participants.';
comment on table public.reviews is 'One verified review per participant after a completed LocalDeals transaction.';
comment on table public.notifications is 'Private in-app activity notifications generated by trusted database events.';
comment on table public.reports is 'Private safety reports visible to the reporter and future moderation tooling.';
