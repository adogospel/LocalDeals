begin;

create extension if not exists pgtap with schema extensions;
select plan(11);

select has_table('public', 'legal_document_versions', 'legal document versions table exists');
select has_column('public', 'profiles', 'account_status', 'profiles expose an account lifecycle state');

insert into public.profiles (id, display_name, preferred_language)
values
  ('11111111-1111-1111-1111-111111111111', 'Account A', 'fr'),
  ('22222222-2222-2222-2222-222222222222', 'Account B', 'fr');

insert into public.user_consents (user_id, document_version_id, source)
select profile.id, document.id, 'in_app'
from public.profiles profile
cross join public.legal_document_versions document
where profile.id in (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222'
)
and document.is_active;

insert into public.account_audit_events (user_id, subject_fingerprint, event_type)
values
  (
    '11111111-1111-1111-1111-111111111111',
    public.account_fingerprint('11111111-1111-1111-1111-111111111111'),
    'legal_consent_accepted'
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    public.account_fingerprint('22222222-2222-2222-2222-222222222222'),
    'legal_consent_accepted'
  );

insert into public.reports (reporter_id, reported_user_id, reason, details, created_at, updated_at)
values (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  'other',
  'Expired moderation evidence',
  timezone('utc', now()) - interval '731 days',
  timezone('utc', now()) - interval '731 days'
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  json_build_object('sub', '11111111-1111-1111-1111-111111111111', 'role', 'authenticated')::text,
  true
);

select results_eq(
  $$select count(*) from public.user_consents where user_id = '11111111-1111-1111-1111-111111111111'$$,
  array[2::bigint],
  'an account can read its own consent evidence'
);

select results_eq(
  $$select count(*) from public.user_consents where user_id = '22222222-2222-2222-2222-222222222222'$$,
  array[0::bigint],
  'an account cannot read another account consent evidence'
);

select results_eq(
  $$select count(*) from public.account_audit_events where user_id = '11111111-1111-1111-1111-111111111111'$$,
  array[1::bigint],
  'an account can read its own privacy audit'
);

select results_eq(
  $$select count(*) from public.account_audit_events where user_id = '22222222-2222-2222-2222-222222222222'$$,
  array[0::bigint],
  'an account cannot read another account privacy audit'
);

select results_eq(
  $$update public.profiles set display_name = 'Compromised' where id = '22222222-2222-2222-2222-222222222222' returning id$$,
  array[]::uuid[],
  'an account cannot update another profile'
);

select results_eq(
  $$select (public.get_my_consent_status() ->> 'has_required_consents')::boolean$$,
  array[true],
  'the consent status RPC is scoped to the authenticated account'
);

reset role;
update public.profiles
set account_status = 'deleted', deleted_at = timezone('utc', now())
where id = '11111111-1111-1111-1111-111111111111';
set local role authenticated;

select results_eq(
  $$select count(*) from public.profiles$$,
  array[0::bigint],
  'a stale JWT cannot read data after account deletion'
);

select throws_ok(
  $$select public.export_my_personal_data()$$,
  '42501',
  'Active account required',
  'a stale JWT cannot export data after account deletion'
);

reset role;
select set_config('request.jwt.claims', '{}'::text, true);
select results_eq(
  $$select (public.purge_expired_privacy_records() ->> 'moderation_evidence')::bigint$$,
  array[1::bigint],
  'the retention purge removes moderation evidence after 730 days'
);

select * from finish();
rollback;
