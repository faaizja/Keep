-- Run this in the Supabase SQL editor.
--
-- Row-level security decides WHICH ROWS a role may touch. It cannot grant
-- access to a table the role has no privilege on in the first place. That
-- is what "permission denied for table records" means. Tables created
-- through the SQL editor do not always inherit the default grants that
-- tables created through the dashboard do.

grant usage on schema public to anon, authenticated;

grant select, insert, update on table public.records to anon, authenticated;
grant select, insert, update on table public.shares  to anon, authenticated;

-- Delete is deliberately not granted. Nothing in Keep deletes a row:
-- revoking a share empties it in place. So there is no request anyone
-- can craft that destroys someone else's record.

-- Check it worked. This should list six rows (select/insert/update on
-- each table) for the role "anon".
select table_name, privilege_type, grantee
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in ('records', 'shares')
  and grantee = 'anon'
order by table_name, privilege_type;
