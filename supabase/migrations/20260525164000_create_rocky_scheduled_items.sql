create extension if not exists pgcrypto;

create table if not exists public.rocky_scheduled_items (
  id uuid primary key default gen_random_uuid(),
  device_id text not null,
  title text not null,
  kind text not null check (kind in ('task', 'reminder', 'alarm')),
  scheduled_for timestamptz not null,
  timezone text not null default 'UTC',
  repeat_rule text not null default 'none' check (repeat_rule in ('none', 'daily', 'weekdays', 'weekly', 'monthly')),
  interval_minutes integer,
  window_start_time text,
  window_end_time text,
  notes text,
  status text not null default 'pending' check (status in ('pending', 'completed', 'dismissed', 'missed', 'cancelled')),
  snoozed_until timestamptz,
  last_delivered_at timestamptz,
  delivered_count integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.rocky_scheduled_items
  add column if not exists interval_minutes integer,
  add column if not exists window_start_time text,
  add column if not exists window_end_time text;

create index if not exists rocky_scheduled_items_device_id_idx
  on public.rocky_scheduled_items (device_id, scheduled_for);

create or replace function public.set_rocky_scheduled_items_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists rocky_scheduled_items_updated_at on public.rocky_scheduled_items;

create trigger rocky_scheduled_items_updated_at
before update on public.rocky_scheduled_items
for each row
execute function public.set_rocky_scheduled_items_updated_at();
