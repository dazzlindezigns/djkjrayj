create table if not exists djkj.surveys (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  booking_id uuid references djkj.bookings(id) on delete cascade unique,
  app_rating integer check (app_rating between 1 and 5),
  app_comments text,
  dj_rating integer check (dj_rating between 1 and 5),
  dj_comments text
);

alter table djkj.surveys enable row level security;

drop policy if exists "auth_full_access_surveys" on djkj.surveys;
create policy "auth_full_access_surveys" on djkj.surveys
  for all to authenticated using (true) with check (true);

drop policy if exists "public_insert_survey" on djkj.surveys;
create policy "public_insert_survey" on djkj.surveys
  for insert to anon with check (true);

drop policy if exists "public_read_survey" on djkj.surveys;
create policy "public_read_survey" on djkj.surveys
  for select to anon using (true);

grant usage on schema djkj to anon, authenticated, service_role;
grant all on djkj.surveys to anon, authenticated, service_role;
grant all on all sequences in schema djkj to anon, authenticated, service_role;
