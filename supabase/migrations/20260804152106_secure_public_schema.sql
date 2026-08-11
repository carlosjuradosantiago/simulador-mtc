begin;

-- All application data is accessed through the Edge Function with service_role.
-- Keep the Data API closed to browser roles and use RLS as a second boundary.
do $security$
declare
  table_record record;
begin
  for table_record in
    select n.nspname as schema_name, c.relname as table_name
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind in ('r', 'p')
  loop
    execute format(
      'alter table %I.%I enable row level security',
      table_record.schema_name,
      table_record.table_name
    );
  end loop;
end
$security$;

revoke all privileges on all tables in schema public from anon, authenticated;
revoke all privileges on all sequences in schema public from anon, authenticated;
revoke execute on all functions in schema public from public, anon, authenticated;

alter default privileges for role postgres in schema public
  revoke select, insert, update, delete, truncate, references, trigger
  on tables from anon, authenticated;

alter default privileges for role postgres in schema public
  revoke usage, select, update on sequences from anon, authenticated;

alter default privileges for role postgres in schema public
  revoke execute on functions from public, anon, authenticated;

alter view public.vw_ranking_usuarios set (security_invoker = true);
alter view public.vw_resumen_usuario set (security_invoker = true);

alter function public.update_updated_at_column() set search_path = pg_catalog;

commit;
