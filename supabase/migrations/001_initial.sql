-- Create djkj schema
create schema if not exists djkj;

-- Set search path
set search_path to djkj;

create table djkj.clients (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  name text not null,
  email text not null,
  phone text not null,
  notes text
);

create table djkj.bookings (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  client_id uuid references djkj.clients(id) on delete cascade,
  status text not null default 'inquiry_sent'
    check (status in (
      'inquiry_sent','inquiry_submitted','confirmed','agreement_sent',
      'signed','deposit_paid','completed','cancelled'
    )),
  event_date date,
  event_type text,
  venue text,
  guest_count integer,
  start_time time,
  hours integer,
  total_price integer,
  deposit_amount integer,
  package_name text,
  signed_at timestamptz,
  client_signature text,
  contract_pdf_path text,
  internal_notes text,
  inquiry_token uuid default gen_random_uuid() unique
);

create table djkj.email_log (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  booking_id uuid references djkj.bookings(id) on delete cascade,
  type text,
  to_email text,
  resend_id text,
  status text default 'sent'
);

-- RLS policies
alter table djkj.clients enable row level security;
alter table djkj.bookings enable row level security;
alter table djkj.email_log enable row level security;

-- Authenticated users can do everything on clients and bookings
create policy "auth_full_access_clients" on djkj.clients
  for all to authenticated using (true) with check (true);

create policy "auth_full_access_bookings" on djkj.bookings
  for all to authenticated using (true) with check (true);

create policy "auth_full_access_email_log" on djkj.email_log
  for all to authenticated using (true) with check (true);

-- Public can read booking by inquiry_token (for client form)
create policy "public_read_booking_by_token" on djkj.bookings
  for select to anon
  using (inquiry_token is not null);

-- Public can update booking by inquiry_token (for client form submission)
create policy "public_update_booking_by_token" on djkj.bookings
  for update to anon
  using (inquiry_token is not null);

-- Public can read booking for signing (by id)
create policy "public_read_booking_for_sign" on djkj.bookings
  for select to anon
  using (true);

-- Updated_at trigger
create or replace function djkj.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger bookings_updated_at
  before update on djkj.bookings
  for each row execute function djkj.update_updated_at();
