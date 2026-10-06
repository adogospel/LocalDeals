begin;

create table public.conversation_user_states (
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  pinned_at timestamptz,
  archived_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (conversation_id, user_id)
);

create index conversation_user_states_inbox_idx
on public.conversation_user_states (user_id, archived_at, pinned_at desc)
where deleted_at is null;

create trigger conversation_user_states_set_updated_at
before update on public.conversation_user_states
for each row execute function public.set_updated_at();

create function public.validate_conversation_user_state_participant()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.conversations conversation
    where conversation.id = new.conversation_id
      and new.user_id in (conversation.buyer_id, conversation.seller_id)
  ) then
    raise exception 'Conversation participant required';
  end if;
  return new;
end;
$$;

create trigger conversation_user_states_validate_participant
before insert or update on public.conversation_user_states
for each row execute function public.validate_conversation_user_state_participant();

alter table public.conversation_user_states enable row level security;
revoke all on table public.conversation_user_states from anon, authenticated;
grant select on table public.conversation_user_states to authenticated;

create policy "Users can read their conversation inbox state"
on public.conversation_user_states for select to authenticated
using (
  (select auth.uid()) = user_id
  and exists (
    select 1
    from public.conversations conversation
    where conversation.id = conversation_user_states.conversation_id
      and (select auth.uid()) in (conversation.buyer_id, conversation.seller_id)
  )
);

create policy "Active accounts can access conversation inbox state"
on public.conversation_user_states as restrictive for select to authenticated
using (public.is_active_account());

create trigger conversation_user_states_require_active_account
before insert or update or delete on public.conversation_user_states
for each row execute function public.block_inactive_account_mutation();

create function public.set_conversation_inbox_state(p_conversation_id uuid, p_action text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  changed_at timestamptz := timezone('utc', now());
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;
  if not public.is_active_account() then
    raise exception 'Active account required' using errcode = '42501';
  end if;
  if p_action is null or p_action not in ('pin', 'unpin', 'archive', 'unarchive', 'delete') then
    raise exception 'Unsupported conversation action';
  end if;
  if not exists (
    select 1
    from public.conversations conversation
    where conversation.id = p_conversation_id
      and current_user_id in (conversation.buyer_id, conversation.seller_id)
  ) then
    raise exception 'Conversation unavailable';
  end if;

  insert into public.conversation_user_states (
    conversation_id,
    user_id,
    pinned_at,
    archived_at,
    deleted_at
  ) values (
    p_conversation_id,
    current_user_id,
    case when p_action = 'pin' then changed_at else null end,
    case when p_action = 'archive' then changed_at else null end,
    case when p_action = 'delete' then changed_at else null end
  )
  on conflict (conversation_id, user_id) do update
  set pinned_at = case
        when p_action = 'pin' then changed_at
        when p_action in ('unpin', 'archive', 'delete') then null
        else conversation_user_states.pinned_at
      end,
      archived_at = case
        when p_action = 'archive' then changed_at
        when p_action in ('pin', 'unarchive', 'delete') then null
        else conversation_user_states.archived_at
      end,
      deleted_at = case
        when p_action = 'delete' then changed_at
        when p_action in ('pin', 'archive', 'unarchive') then null
        else conversation_user_states.deleted_at
      end,
      updated_at = changed_at;
end;
$$;

revoke all on function public.validate_conversation_user_state_participant() from public, anon, authenticated;
revoke all on function public.set_conversation_inbox_state(uuid, text) from public, anon;
grant execute on function public.set_conversation_inbox_state(uuid, text) to authenticated;

create or replace function public.touch_conversation_after_message()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.conversations
  set last_message_at = new.created_at
  where id = new.conversation_id;

  update public.conversation_user_states
  set archived_at = null,
      deleted_at = null,
      updated_at = new.created_at
  where conversation_id = new.conversation_id;

  return new;
end;
$$;

alter table public.conversation_user_states replica identity full;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'conversation_user_states'
  ) then
    alter publication supabase_realtime add table public.conversation_user_states;
  end if;
end;
$$;

comment on table public.conversation_user_states
is 'Per-user inbox state for private conversations. Deletion hides a thread only for that participant.';

commit;
