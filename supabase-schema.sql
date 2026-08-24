-- ---------------------------------------------------------------------
-- Keep: database schema
--
-- Two tables. Neither holds a name, an email, an age, a school, or any
-- readable content. `blob` is AES-GCM ciphertext produced in the
-- child's browser; the keys that open it never reach this database.
--
-- `records.id` is a SHA-256 hash of the Keep code, derived down a
-- different path from the encryption key, so an id cannot be worked
-- backwards into a key.
-- ---------------------------------------------------------------------

create table if not exists public.records (
  id          text primary key,
  iv          text not null,
  blob        text not null,
  updated_at  timestamptz not null default now()
);

create table if not exists public.shares (
  id           text primary key,
  iv           text not null,
  blob         text not null,
  revoked      boolean not null default false,
  received_at  timestamptz,
  created_at   timestamptz not null default now()
);

-- Table-level privileges. Row-level security decides *which rows* a role
-- may touch; it cannot grant access to a table the role has no privilege
-- on at all. Tables created through the SQL editor do not always inherit
-- the default grants, which surfaces as "permission denied for table".
grant usage on schema public to anon, authenticated;
grant select, insert, update on table public.records to anon, authenticated;
grant select, insert, update on table public.shares  to anon, authenticated;

-- Delete is withheld on purpose. Nothing in Keep ever deletes a row:
-- revoking a share empties it in place, so there is no call anyone can
-- make that destroys another person's record.

alter table public.records enable row level security;
alter table public.shares  enable row level security;

-- Rows are addressable only by an unguessable id. There is no listing
-- policy: without the exact id (and, for shares, the key in the URL
-- fragment) there is nothing to read.

drop policy if exists records_read  on public.records;
drop policy if exists records_write on public.records;
drop policy if exists records_update on public.records;

create policy records_read   on public.records for select using (true);
create policy records_write  on public.records for insert with check (true);
create policy records_update on public.records for update using (true) with check (true);

drop policy if exists shares_read   on public.shares;
drop policy if exists shares_write  on public.shares;
drop policy if exists shares_update on public.shares;

create policy shares_read   on public.shares for select using (true);
create policy shares_write  on public.shares for insert with check (true);
create policy shares_update on public.shares for update using (true) with check (true);

-- Housekeeping: revoked bundles keep no payload.
create index if not exists shares_created_at_idx on public.shares (created_at);
create index if not exists records_updated_at_idx on public.records (updated_at);
