-- Iron Haven Pass subscription rows (Stripe webhook / restore API).

create table if not exists public.ironhaven_pass_subs (
  player_id text primary key,
  stripe_customer_id text,
  stripe_subscription_id text,
  expires_at timestamptz not null,
  status text not null default 'active',
  updated_at timestamptz not null default now()
);

create index if not exists ironhaven_pass_subs_expires_idx
  on public.ironhaven_pass_subs (expires_at);

alter table public.ironhaven_pass_subs enable row level security;

-- Players can read their own row if you map auth.uid() → player_id;
-- service role (webhook) bypasses RLS.
create policy "pass_subs_select_own"
  on public.ironhaven_pass_subs
  for select
  using (true);
