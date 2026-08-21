-- Run this once in the Supabase SQL editor (Project -> SQL Editor -> New query)
-- for a fresh project. It creates the table that stores each player's game
-- profile (level, inventory, essences, gear, etc.) as JSON, keyed by their
-- auth user id, with row-level security so a user can only ever read or
-- write their own row.

create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null,
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
