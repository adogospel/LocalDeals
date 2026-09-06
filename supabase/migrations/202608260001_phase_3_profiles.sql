create type public.app_language as enum ('fr', 'en');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (display_name is null or char_length(trim(display_name)) between 2 and 50),
  avatar_path text,
  city text check (city is null or char_length(trim(city)) between 2 and 60),
  neighborhood text check (neighborhood is null or char_length(trim(neighborhood)) <= 80),
  preferred_language public.app_language not null default 'fr',
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

comment on table public.profiles is 'Public marketplace identity. Phone numbers remain private in auth.users.';
comment on column public.profiles.avatar_path is 'Object path inside the public avatars storage bucket.';

alter table public.profiles enable row level security;

revoke all on table public.profiles from anon;
revoke all on table public.profiles from authenticated;
grant select, insert, update on table public.profiles to authenticated;
grant usage on type public.app_language to authenticated;

create policy "Authenticated users can view marketplace profiles"
on public.profiles
for select
to authenticated
using (true);

create policy "Users can create only their own profile"
on public.profiles
for insert
to authenticated
with check ((select auth.uid()) = id);

create policy "Users can update only their own profile"
on public.profiles
for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, preferred_language)
  values (new.id, 'fr')
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Authenticated users can read avatar metadata"
on storage.objects
for select
to authenticated
using (bucket_id = 'avatars');

create policy "Users can upload avatars into their own folder"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

create policy "Users can update their own avatars"
on storage.objects
for update
to authenticated
using (bucket_id = 'avatars' and owner_id = (select auth.uid()::text))
with check (
  bucket_id = 'avatars'
  and owner_id = (select auth.uid()::text)
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

create policy "Users can delete their own avatars"
on storage.objects
for delete
to authenticated
using (bucket_id = 'avatars' and owner_id = (select auth.uid()::text));

