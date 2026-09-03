-- Run this once in the Supabase SQL editor (Project -> SQL Editor -> New query)
-- for a fresh project. It creates the table that stores each player's game
-- profile (level, inventory, essences, gear, etc.) as JSON, keyed by their
-- auth user id, with row-level security so a user can only ever read or
-- write their own row.

create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null,
  is_admin boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can read their own profile"
  on public.profiles for select
  using (auth.uid() = user_id);

create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = user_id);

-- is_admin is account-level, not regular game data, so it must not be
-- settable by the player themselves — neither the INSERT nor the UPDATE
-- policy above has a column-level restriction, so without this trigger a
-- signed-in user could set is_admin=true on their very first save
-- (saveCloudProfile in the app uses upsert, so a brand-new row goes through
-- INSERT, not UPDATE) or flip it later with a raw REST/SQL call. This
-- trigger silently forces is_admin back to a safe value for any request
-- made as the "authenticated" role (i.e. through the app / anon key) on
-- both INSERT (forced to false — a legitimate signup never sets it) and
-- UPDATE (kept at its previous value); it only stays open to the SQL
-- editor (superuser) or a future service_role-based backend, neither of
-- which authenticates as "authenticated".
create or replace function public.protect_is_admin()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() = 'authenticated' then
    if TG_OP = 'INSERT' then
      new.is_admin := false;
    elsif new.is_admin is distinct from old.is_admin then
      new.is_admin := old.is_admin;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_is_admin_trigger on public.profiles;

create trigger protect_is_admin_trigger
  before insert or update on public.profiles
  for each row
  execute function public.protect_is_admin();

-- After signing up an "admin" account through the app itself (Supabase Auth
-- needs the real signup flow to create the auth.users row and password), run
-- this once to grant it admin rights. Replace the email if you used a
-- different username — the app maps "아이디" to "아이디@users.my-new-project.local".
--
-- update public.profiles
-- set is_admin = true
-- where user_id = (select id from auth.users where email = 'admin@users.my-new-project.local');
