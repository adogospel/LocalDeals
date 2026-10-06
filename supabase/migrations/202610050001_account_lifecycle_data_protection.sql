-- Phase 3: account lifecycle, data portability, consent evidence and deletion.
-- Auth identities are removed by the delete-account Edge Function. Marketplace
-- tombstones deliberately remain detached from auth.users so completed deals
-- keep their referential integrity without retaining direct identifiers.

create type public.account_status as enum ('active', 'deleted');
create type public.legal_document_type as enum ('terms', 'privacy');

alter table public.profiles
  drop constraint profiles_id_fkey,
  add column account_status public.account_status not null default 'active',
  add column deleted_at timestamptz;

alter table public.profiles
  add constraint profiles_deleted_state_check check (
    (account_status = 'active' and deleted_at is null)
    or (account_status = 'deleted' and deleted_at is not null)
  );

create index profiles_active_idx
on public.profiles (id)
where account_status = 'active';

create table public.legal_document_versions (
  id uuid primary key default gen_random_uuid(),
  document_type public.legal_document_type not null,
  version text not null check (version ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'),
  title_fr text not null check (char_length(trim(title_fr)) between 3 and 100),
  title_en text not null check (char_length(trim(title_en)) between 3 and 100),
  effective_at timestamptz not null,
  requires_consent boolean not null default true,
  is_active boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  unique (document_type, version)
);

create unique index legal_document_versions_one_active_idx
on public.legal_document_versions (document_type)
where is_active;

create table public.user_consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  document_version_id uuid not null references public.legal_document_versions (id) on delete restrict,
  source text not null default 'in_app' check (source in ('sign_up', 'in_app')),
  accepted_at timestamptz not null default timezone('utc', now()),
  unique (user_id, document_version_id)
);

create index user_consents_user_idx
on public.user_consents (user_id, accepted_at desc);

create table public.account_audit_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  subject_fingerprint text not null check (subject_fingerprint ~ '^[a-f0-9]{64}$'),
  event_type text not null check (event_type in (
    'legal_consent_accepted',
    'data_export_created',
    'account_deletion_prepared',
    'account_deletion_completed',
    'account_deletion_failed'
  )),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  occurred_at timestamptz not null default timezone('utc', now()),
  expires_at timestamptz not null default (timezone('utc', now()) + interval '730 days')
);

create index account_audit_events_user_idx
on public.account_audit_events (user_id, occurred_at desc)
where user_id is not null;

create index account_audit_events_expiry_idx
on public.account_audit_events (expires_at);

create table public.data_retention_policies (
  data_class text primary key,
  retention_days integer check (retention_days is null or retention_days between 0 and 3650),
  action_on_deletion text not null check (action_on_deletion in ('delete', 'anonymize', 'retain_then_delete')),
  purpose_fr text not null,
  purpose_en text not null,
  updated_at timestamptz not null default timezone('utc', now())
);

insert into public.legal_document_versions (
  document_type, version, title_fr, title_en, effective_at, requires_consent, is_active
)
values
  ('terms', '2026-10-05', 'Conditions d’utilisation', 'Terms of Use', '2026-10-05 00:00:00+00', true, true),
  ('privacy', '2026-10-05', 'Politique de confidentialité', 'Privacy Policy', '2026-10-05 00:00:00+00', true, true);

insert into public.data_retention_policies (
  data_class, retention_days, action_on_deletion, purpose_fr, purpose_en
)
values
  ('auth_identity', 0, 'delete', 'Suppression immédiate de l’identité de connexion.', 'Authentication identity is deleted immediately.'),
  ('profile_and_media', 0, 'delete', 'Suppression immédiate du profil, des photos et des préférences.', 'Profile, photos and preferences are deleted immediately.'),
  ('marketplace_content', 0, 'anonymize', 'Les annonces et messages nécessaires à une transaction sont anonymisés.', 'Listings and messages needed for transaction integrity are anonymized.'),
  ('transaction_integrity', null, 'anonymize', 'Les montants et statuts sont conservés sans identité directe pour préserver les transactions des deux parties.', 'Amounts and statuses are retained without direct identity to preserve both parties transaction records.'),
  ('moderation_evidence', 730, 'retain_then_delete', 'Les preuves minimales de sécurité sont conservées au maximum 24 mois.', 'Minimum safety evidence is retained for up to 24 months.'),
  ('privacy_audit', 730, 'retain_then_delete', 'La preuve technique des demandes de confidentialité est conservée au maximum 24 mois.', 'Technical proof of privacy requests is retained for up to 24 months.');

alter table public.legal_document_versions enable row level security;
alter table public.user_consents enable row level security;
alter table public.account_audit_events enable row level security;
alter table public.data_retention_policies enable row level security;

revoke all on table public.legal_document_versions from anon, authenticated;
revoke all on table public.user_consents from anon, authenticated;
revoke all on table public.account_audit_events from anon, authenticated;
revoke all on table public.data_retention_policies from anon, authenticated;

grant select on table public.legal_document_versions to anon, authenticated;
grant select on table public.user_consents to authenticated;
grant select on table public.account_audit_events to authenticated;
grant select on table public.data_retention_policies to anon, authenticated;
grant usage on type public.account_status to authenticated;
grant usage on type public.legal_document_type to anon, authenticated;

create policy "Everyone can read active legal document versions"
on public.legal_document_versions for select to anon, authenticated
using (is_active);

create policy "Users can read only their consent history"
on public.user_consents for select to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can read only their privacy audit events"
on public.account_audit_events for select to authenticated
using ((select auth.uid()) = user_id);

create policy "Everyone can read the retention policy"
on public.data_retention_policies for select to anon, authenticated
using (true);

create function public.account_fingerprint(p_user_id uuid)
returns text
language sql
immutable
security invoker
set search_path = ''
as $$
  select md5(p_user_id::text || ':localdeals:v1') || md5('localdeals:v1:' || p_user_id::text);
$$;

create function public.is_active_account()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and account_status = 'active'
      and deleted_at is null
  );
$$;

revoke all on function public.account_fingerprint(uuid) from public, anon, authenticated;
revoke all on function public.is_active_account() from public, anon;
grant execute on function public.is_active_account() to authenticated;

drop policy if exists "Authenticated users can view marketplace profiles" on public.profiles;
drop policy if exists "Users can create only their own profile" on public.profiles;
drop policy if exists "Users can update only their own profile" on public.profiles;
drop policy if exists "Public can view completed marketplace profiles" on public.profiles;

create policy "Authenticated users can view active marketplace profiles"
on public.profiles for select to authenticated
using (account_status = 'active');

create policy "Users can create only their own active profile"
on public.profiles for insert to authenticated
with check (
  (select auth.uid()) = id
  and account_status = 'active'
  and deleted_at is null
);

create policy "Users can update only their own active profile"
on public.profiles for update to authenticated
using (
  (select auth.uid()) = id
  and account_status = 'active'
  and deleted_at is null
)
with check (
  (select auth.uid()) = id
  and account_status = 'active'
  and deleted_at is null
);

create policy "Public can view completed active marketplace profiles"
on public.profiles for select to anon
using (onboarding_completed and account_status = 'active' and deleted_at is null);

-- Restrictive policies immediately close reads performed with a stale JWT after
-- deletion. Existing permissive business policies still decide which active
-- users can access each row.
create policy "Active accounts can access profiles"
on public.profiles as restrictive for all to authenticated
using (public.is_active_account())
with check (public.is_active_account());

create policy "Active accounts can access listings"
on public.listings as restrictive for all to authenticated
using (public.is_active_account())
with check (public.is_active_account());

create policy "Active accounts can access listing images"
on public.listing_images as restrictive for all to authenticated
using (public.is_active_account())
with check (public.is_active_account());

create policy "Active accounts can access favorites"
on public.favorites as restrictive for all to authenticated
using (public.is_active_account())
with check (public.is_active_account());

create policy "Active accounts can access conversations"
on public.conversations as restrictive for all to authenticated
using (public.is_active_account())
with check (public.is_active_account());

create policy "Active accounts can access offers"
on public.offers as restrictive for all to authenticated
using (public.is_active_account())
with check (public.is_active_account());

create policy "Active accounts can access messages"
on public.messages as restrictive for all to authenticated
using (public.is_active_account())
with check (public.is_active_account());

create policy "Active accounts can access deals"
on public.deals as restrictive for all to authenticated
using (public.is_active_account())
with check (public.is_active_account());

create policy "Active accounts can access reviews"
on public.reviews as restrictive for all to authenticated
using (public.is_active_account())
with check (public.is_active_account());

create policy "Active accounts can access notifications"
on public.notifications as restrictive for all to authenticated
using (public.is_active_account())
with check (public.is_active_account());

create policy "Active accounts can access reports"
on public.reports as restrictive for all to authenticated
using (public.is_active_account())
with check (public.is_active_account());

create policy "Active accounts can access their consents"
on public.user_consents as restrictive for select to authenticated
using (public.is_active_account());

create policy "Active accounts can access their privacy audit"
on public.account_audit_events as restrictive for select to authenticated
using (public.is_active_account());

create function public.block_inactive_account_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is not null and not public.is_active_account() then
    raise exception 'Active account required' using errcode = '42501';
  end if;
  return coalesce(new, old);
end;
$$;

revoke all on function public.block_inactive_account_mutation() from public, anon, authenticated;

create trigger profiles_require_active_account
before insert or update or delete on public.profiles
for each row execute function public.block_inactive_account_mutation();
create trigger listings_require_active_account
before insert or update or delete on public.listings
for each row execute function public.block_inactive_account_mutation();
create trigger listing_images_require_active_account
before insert or update or delete on public.listing_images
for each row execute function public.block_inactive_account_mutation();
create trigger favorites_require_active_account
before insert or update or delete on public.favorites
for each row execute function public.block_inactive_account_mutation();
create trigger conversations_require_active_account
before insert or update or delete on public.conversations
for each row execute function public.block_inactive_account_mutation();
create trigger offers_require_active_account
before insert or update or delete on public.offers
for each row execute function public.block_inactive_account_mutation();
create trigger messages_require_active_account
before insert or update or delete on public.messages
for each row execute function public.block_inactive_account_mutation();
create trigger deals_require_active_account
before insert or update or delete on public.deals
for each row execute function public.block_inactive_account_mutation();
create trigger reviews_require_active_account
before insert or update or delete on public.reviews
for each row execute function public.block_inactive_account_mutation();
create trigger notifications_require_active_account
before insert or update or delete on public.notifications
for each row execute function public.block_inactive_account_mutation();
create trigger reports_require_active_account
before insert or update or delete on public.reports
for each row execute function public.block_inactive_account_mutation();

create function public.get_my_consent_status()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when auth.uid() is null or not public.is_active_account() then
      jsonb_build_object('has_required_consents', false, 'required_versions', '{}'::jsonb)
    else jsonb_build_object(
      'has_required_consents', not exists (
        select 1
        from public.legal_document_versions document
        where document.is_active
          and document.requires_consent
          and not exists (
            select 1
            from public.user_consents consent
            where consent.user_id = auth.uid()
              and consent.document_version_id = document.id
          )
      ),
      'required_versions', coalesce((
        select jsonb_object_agg(document.document_type::text, document.version)
        from public.legal_document_versions document
        where document.is_active and document.requires_consent
      ), '{}'::jsonb)
    )
  end;
$$;

create function public.accept_required_legal_documents()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  accepted_versions jsonb;
begin
  if current_user_id is null or not public.is_active_account() then
    raise exception 'Active account required' using errcode = '42501';
  end if;

  insert into public.user_consents (user_id, document_version_id, source)
  select current_user_id, document.id, 'in_app'
  from public.legal_document_versions document
  where document.is_active and document.requires_consent
  on conflict (user_id, document_version_id) do nothing;

  select coalesce(jsonb_object_agg(document.document_type::text, document.version), '{}'::jsonb)
  into accepted_versions
  from public.legal_document_versions document
  where document.is_active and document.requires_consent;

  insert into public.account_audit_events (
    user_id, subject_fingerprint, event_type, metadata
  ) values (
    current_user_id,
    public.account_fingerprint(current_user_id),
    'legal_consent_accepted',
    jsonb_build_object('versions', accepted_versions)
  );

  return public.get_my_consent_status();
end;
$$;

create function public.export_my_personal_data()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  export_document jsonb;
begin
  if current_user_id is null or not public.is_active_account() then
    raise exception 'Active account required' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'format', 'localdeals-personal-data-export',
    'format_version', 1,
    'generated_at', timezone('utc', now()),
    'account', coalesce((
      select jsonb_build_object(
        'id', account.id,
        'email', account.email,
        'phone', account.phone,
        'created_at', account.created_at,
        'last_sign_in_at', account.last_sign_in_at
      )
      from auth.users account
      where account.id = current_user_id
    ), '{}'::jsonb),
    'identities', coalesce((
      select jsonb_agg(jsonb_build_object(
        'provider', identity.provider,
        'created_at', identity.created_at,
        'last_sign_in_at', identity.last_sign_in_at
      ) order by identity.created_at)
      from auth.identities identity
      where identity.user_id = current_user_id
    ), '[]'::jsonb),
    'profile', coalesce((
      select to_jsonb(profile) - 'account_status' - 'deleted_at'
      from public.profiles profile
      where profile.id = current_user_id
    ), '{}'::jsonb),
    'listings', coalesce((
      select jsonb_agg(to_jsonb(listing) - 'search_vector' order by listing.created_at)
      from public.listings listing where listing.seller_id = current_user_id
    ), '[]'::jsonb),
    'listing_images', coalesce((
      select jsonb_agg(to_jsonb(image) order by image.created_at)
      from public.listing_images image
      join public.listings listing on listing.id = image.listing_id
      where listing.seller_id = current_user_id
    ), '[]'::jsonb),
    'favorites', coalesce((
      select jsonb_agg(to_jsonb(favorite) order by favorite.created_at)
      from public.favorites favorite where favorite.user_id = current_user_id
    ), '[]'::jsonb),
    'conversations', coalesce((
      select jsonb_agg(to_jsonb(conversation) order by conversation.created_at)
      from public.conversations conversation
      where current_user_id in (conversation.buyer_id, conversation.seller_id)
    ), '[]'::jsonb),
    'messages', coalesce((
      select jsonb_agg(to_jsonb(message) order by message.created_at)
      from public.messages message
      join public.conversations conversation on conversation.id = message.conversation_id
      where current_user_id in (conversation.buyer_id, conversation.seller_id)
    ), '[]'::jsonb),
    'offers', coalesce((
      select jsonb_agg(to_jsonb(offer) order by offer.created_at)
      from public.offers offer
      where current_user_id in (offer.buyer_id, offer.seller_id)
    ), '[]'::jsonb),
    'deals', coalesce((
      select jsonb_agg(to_jsonb(deal) order by deal.created_at)
      from public.deals deal
      where current_user_id in (deal.buyer_id, deal.seller_id)
    ), '[]'::jsonb),
    'reviews', coalesce((
      select jsonb_agg(to_jsonb(review) order by review.created_at)
      from public.reviews review
      where current_user_id in (review.author_id, review.subject_id)
    ), '[]'::jsonb),
    'notifications', coalesce((
      select jsonb_agg(to_jsonb(notification) order by notification.created_at)
      from public.notifications notification where notification.recipient_id = current_user_id
    ), '[]'::jsonb),
    'reports', coalesce((
      select jsonb_agg(to_jsonb(report) order by report.created_at)
      from public.reports report where report.reporter_id = current_user_id
    ), '[]'::jsonb),
    'consents', coalesce((
      select jsonb_agg(jsonb_build_object(
        'document_type', document.document_type,
        'version', document.version,
        'accepted_at', consent.accepted_at,
        'source', consent.source
      ) order by consent.accepted_at)
      from public.user_consents consent
      join public.legal_document_versions document on document.id = consent.document_version_id
      where consent.user_id = current_user_id
    ), '[]'::jsonb),
    'privacy_audit', coalesce((
      select jsonb_agg(
        (to_jsonb(event) - 'subject_fingerprint' - 'user_id')
        order by event.occurred_at
      )
      from public.account_audit_events event where event.user_id = current_user_id
    ), '[]'::jsonb),
    'retention_policy', coalesce((
      select jsonb_agg(to_jsonb(policy) order by policy.data_class)
      from public.data_retention_policies policy
    ), '[]'::jsonb)
  ) into export_document;

  insert into public.account_audit_events (
    user_id, subject_fingerprint, event_type, metadata
  ) values (
    current_user_id,
    public.account_fingerprint(current_user_id),
    'data_export_created',
    jsonb_build_object('format_version', 1)
  );

  return export_document;
end;
$$;

-- Only the trusted Edge Function may read deletion assets or anonymize an
-- account. The service role is never embedded in the mobile application.
create function public.get_account_deletion_assets(p_user_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'avatar_paths', coalesce((
      select jsonb_agg(profile.avatar_path)
      from public.profiles profile
      where profile.id = p_user_id and profile.avatar_path is not null
    ), '[]'::jsonb),
    'listing_image_paths', coalesce((
      select jsonb_agg(image.storage_path)
      from public.listing_images image
      join public.listings listing on listing.id = image.listing_id
      where listing.seller_id = p_user_id
    ), '[]'::jsonb)
  );
$$;

create function public.prepare_account_deletion(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  deletion_time timestamptz := timezone('utc', now());
  fingerprint text := public.account_fingerprint(p_user_id);
begin
  if not exists (
    select 1 from public.profiles
    where id = p_user_id and account_status = 'active'
  ) then
    if exists (
      select 1 from public.profiles
      where id = p_user_id and account_status = 'deleted'
    ) then
      return jsonb_build_object('status', 'already_deleted', 'fingerprint', fingerprint);
    end if;
    raise exception 'Active account not found';
  end if;

  -- Pending handovers with no confirmation can be safely cancelled. A deal
  -- already confirmed by either party is retained and anonymized so the other
  -- participant does not lose their transaction record.
  update public.deals
  set status = 'cancelled',
      cancelled_at = deletion_time,
      cancelled_by = p_user_id
  where p_user_id in (buyer_id, seller_id)
    and status = 'pending_handover'
    and buyer_confirmed_at is null
    and seller_confirmed_at is null;

  update public.offers offer
  set status = 'cancelled', responded_at = deletion_time
  where offer.id in (
    select deal.offer_id
    from public.deals deal
    where deal.cancelled_by = p_user_id
      and deal.cancelled_at = deletion_time
  );

  update public.listings listing
  set status = 'published'
  where listing.seller_id <> p_user_id
    and listing.id in (
      select deal.listing_id
      from public.deals deal
      where deal.cancelled_by = p_user_id
        and deal.cancelled_at = deletion_time
    )
    and not exists (
      select 1 from public.deals active_deal
      where active_deal.listing_id = listing.id
        and active_deal.status = 'pending_handover'
    );

  delete from public.notifications
  where recipient_id = p_user_id or actor_id = p_user_id;

  delete from public.favorites where user_id = p_user_id;
  delete from public.reviews where author_id = p_user_id or subject_id = p_user_id;

  update public.messages
  set body = '[Message supprimé]'
  where sender_id = p_user_id and kind = 'text';

  update public.reports
  set details = null
  where reporter_id = p_user_id
     or reported_user_id = p_user_id
     or message_id in (select id from public.messages where sender_id = p_user_id);

  delete from public.listing_images image
  using public.listings listing
  where image.listing_id = listing.id
    and listing.seller_id = p_user_id;

  update public.listings
  set title = 'Annonce supprimée',
      description = 'Contenu supprimé avec le compte.',
      price = 100,
      status = 'archived',
      city_id = null,
      neighborhood_id = null,
      custom_city = 'Données supprimées',
      custom_neighborhood = 'Données supprimées',
      city = 'Données supprimées',
      neighborhood = 'Données supprimées',
      published_at = null
  where seller_id = p_user_id;

  delete from public.user_consents where user_id = p_user_id;

  update public.profiles
  set display_name = 'Compte supprimé',
      avatar_path = null,
      city = null,
      neighborhood = null,
      city_id = null,
      neighborhood_id = null,
      custom_city = null,
      custom_neighborhood = null,
      onboarding_completed = false,
      account_status = 'deleted',
      deleted_at = deletion_time
  where id = p_user_id;

  update public.account_audit_events
  set user_id = null
  where user_id = p_user_id;

  insert into public.account_audit_events (
    user_id, subject_fingerprint, event_type, metadata, occurred_at
  ) values (
    null,
    fingerprint,
    'account_deletion_prepared',
    jsonb_build_object('anonymization_version', 1),
    deletion_time
  );

  return jsonb_build_object('status', 'prepared', 'fingerprint', fingerprint);
end;
$$;

create function public.record_account_deletion_result(
  p_fingerprint text,
  p_completed boolean,
  p_failure_code text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_fingerprint !~ '^[a-f0-9]{64}$' then
    raise exception 'Invalid account fingerprint';
  end if;

  insert into public.account_audit_events (
    user_id, subject_fingerprint, event_type, metadata
  ) values (
    null,
    p_fingerprint,
    case when p_completed then 'account_deletion_completed' else 'account_deletion_failed' end,
    case
      when p_completed then '{}'::jsonb
      else jsonb_build_object('failure_code', left(coalesce(p_failure_code, 'unknown'), 80))
    end
  );
end;
$$;

create function public.purge_expired_privacy_records()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  moderation_retention_days integer;
  audit_deleted_count bigint;
  reports_deleted_count bigint;
begin
  select retention_days
  into moderation_retention_days
  from public.data_retention_policies
  where data_class = 'moderation_evidence';

  if moderation_retention_days is null then
    raise exception 'Missing moderation evidence retention policy';
  end if;

  delete from public.account_audit_events
  where expires_at <= timezone('utc', now());
  get diagnostics audit_deleted_count = row_count;

  delete from public.reports
  where created_at <= timezone('utc', now()) - make_interval(days => moderation_retention_days);
  get diagnostics reports_deleted_count = row_count;

  return jsonb_build_object(
    'privacy_audit', audit_deleted_count,
    'moderation_evidence', reports_deleted_count
  );
end;
$$;

revoke all on function public.get_my_consent_status() from public, anon;
revoke all on function public.accept_required_legal_documents() from public, anon;
revoke all on function public.export_my_personal_data() from public, anon;
revoke all on function public.get_account_deletion_assets(uuid) from public, anon, authenticated;
revoke all on function public.prepare_account_deletion(uuid) from public, anon, authenticated;
revoke all on function public.record_account_deletion_result(text, boolean, text) from public, anon, authenticated;
revoke all on function public.purge_expired_privacy_records() from public, anon, authenticated;

grant execute on function public.get_my_consent_status() to authenticated;
grant execute on function public.accept_required_legal_documents() to authenticated;
grant execute on function public.export_my_personal_data() to authenticated;
grant execute on function public.get_account_deletion_assets(uuid) to service_role;
grant execute on function public.prepare_account_deletion(uuid) to service_role;
grant execute on function public.record_account_deletion_result(text, boolean, text) to service_role;
grant execute on function public.purge_expired_privacy_records() to service_role;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  metadata jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  metadata_city_id bigint;
  metadata_neighborhood_id bigint;
  metadata_name text;
  metadata_custom_city text;
  metadata_custom_neighborhood text;
  has_complete_profile boolean;
begin
  metadata_name := nullif(trim(coalesce(
    metadata ->> 'display_name',
    metadata ->> 'full_name',
    metadata ->> 'name'
  )), '');

  if coalesce(metadata ->> 'city_id', '') ~ '^[0-9]+$' then
    metadata_city_id := (metadata ->> 'city_id')::bigint;
  end if;

  if coalesce(metadata ->> 'neighborhood_id', '') ~ '^[0-9]+$' then
    metadata_neighborhood_id := (metadata ->> 'neighborhood_id')::bigint;
  end if;

  metadata_custom_city := nullif(trim(metadata ->> 'custom_city'), '');
  metadata_custom_neighborhood := nullif(trim(metadata ->> 'custom_neighborhood'), '');

  has_complete_profile := metadata_name is not null
    and (metadata_city_id is not null or metadata_custom_city is not null)
    and (metadata_neighborhood_id is not null or metadata_custom_neighborhood is not null);

  insert into public.profiles (
    id,
    display_name,
    city_id,
    neighborhood_id,
    custom_city,
    custom_neighborhood,
    preferred_language,
    onboarding_completed
  )
  values (
    new.id,
    metadata_name,
    metadata_city_id,
    metadata_neighborhood_id,
    metadata_custom_city,
    metadata_custom_neighborhood,
    case when metadata ->> 'preferred_language' = 'en' then 'en'::public.app_language else 'fr'::public.app_language end,
    has_complete_profile
  )
  on conflict (id) do nothing;

  insert into public.user_consents (user_id, document_version_id, source)
  select new.id, document.id, 'sign_up'
  from public.legal_document_versions document
  where document.is_active
    and document.requires_consent
    and metadata -> 'legal_consents' ->> document.document_type::text = document.version
  on conflict (user_id, document_version_id) do nothing;

  if found then
    insert into public.account_audit_events (
      user_id, subject_fingerprint, event_type, metadata
    ) values (
      new.id,
      public.account_fingerprint(new.id),
      'legal_consent_accepted',
      jsonb_build_object('source', 'sign_up')
    );
  end if;

  return new;
end;
$$;

comment on table public.legal_document_versions is 'Immutable, versioned legal documents presented to account holders.';
comment on table public.user_consents is 'Per-user evidence of acceptance for a specific legal document version.';
comment on table public.account_audit_events is 'Minimal privacy-operation audit with a two-year expiry and no email, phone or IP address.';
comment on table public.data_retention_policies is 'Machine-readable account deletion and retention policy shown in the app and included in exports.';
comment on function public.export_my_personal_data() is 'Authenticated, account-scoped JSON export. No service key is required by the mobile client.';
comment on function public.prepare_account_deletion(uuid) is 'Service-role-only irreversible anonymization performed immediately before Auth identity deletion.';
comment on function public.purge_expired_privacy_records() is 'Service-role-only purge enforcing expiry for privacy audit events and moderation evidence.';
