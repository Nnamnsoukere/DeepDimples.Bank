create extension if not exists pgcrypto;

create table if not exists public.ddb_transactions (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique,
  request_hash text not null,
  idempotency_key uuid not null unique,
  kind text not null check (kind in ('stablecoin_send','bank_payout','checkout')),
  provider text not null default 'flutterwave',
  provider_id text,
  provider_reference text not null unique,
  status text not null default 'NEW',
  amount numeric(30,8) not null,
  currency text not null,
  network text,
  recipient_address text,
  bank_code text,
  account_last4 text,
  metadata jsonb not null default '{}'::jsonb,
  provider_payload jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ddb_transactions_created_at_idx on public.ddb_transactions (created_at desc);
create index if not exists ddb_transactions_provider_id_idx on public.ddb_transactions (provider_id);
create index if not exists ddb_transactions_status_idx on public.ddb_transactions (status);

create table if not exists public.ddb_webhook_events (
  id uuid primary key default gen_random_uuid(),
  event_key text not null unique,
  event_type text,
  provider_id text,
  payload jsonb not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  processing_error text
);

alter table public.ddb_transactions enable row level security;
alter table public.ddb_webhook_events enable row level security;
revoke all on public.ddb_transactions from anon, authenticated;
revoke all on public.ddb_webhook_events from anon, authenticated;
grant all on public.ddb_transactions to service_role;
grant all on public.ddb_webhook_events to service_role;

create or replace function public.ddb_set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;
drop trigger if exists ddb_transactions_updated_at on public.ddb_transactions;
create trigger ddb_transactions_updated_at before update on public.ddb_transactions
for each row execute function public.ddb_set_updated_at();
