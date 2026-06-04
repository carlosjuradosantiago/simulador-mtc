-- Remove automated Playwright smoke-test data created by this backend validation pass
-- and reset identity/serial sequences that were behind existing imported data.

begin;

create temporary table tmp_simulamanejo_test_usuarios on commit drop as
select id
from public.usuarios
where correo_electronico like 'pw\_%@example.com' escape '\';

create temporary table tmp_simulamanejo_test_intentos on commit drop as
select id
from public.intento
where id_usuario in (select id from tmp_simulamanejo_test_usuarios);

create temporary table tmp_simulamanejo_test_membresias on commit drop as
select id
from public.membresias_usuario
where id_usuario in (select id from tmp_simulamanejo_test_usuarios);

delete from public.respuesta_intento
where id_intento in (select id from tmp_simulamanejo_test_intentos);

delete from public.historial_membresias
where id_usuario in (select id from tmp_simulamanejo_test_usuarios)
   or id_membresia in (select id from tmp_simulamanejo_test_membresias);

delete from public.progreso_clase_usuario
where id_usuario in (select id from tmp_simulamanejo_test_usuarios);

delete from public.configuracion_usuario
where id_usuario in (select id from tmp_simulamanejo_test_usuarios);

delete from public.transacciones_pago
where id_usuario in (select id from tmp_simulamanejo_test_usuarios);

delete from public.membresias_usuario
where id_usuario in (select id from tmp_simulamanejo_test_usuarios);

delete from public.intento
where id_usuario in (select id from tmp_simulamanejo_test_usuarios);

delete from public.sesion_practica
where id_usuario in (select id from tmp_simulamanejo_test_usuarios);

delete from public.usuarios
where id in (select id from tmp_simulamanejo_test_usuarios);

delete from public.users
where email like 'pw\_%@example.com' escape '\';

delete from public.libro_reclamaciones
where email like 'pw\_%@example.com' escape '\';

create or replace function pg_temp.reset_sequence(table_name text, column_name text)
returns void
language plpgsql
as $$
declare
  sequence_name text;
  max_id bigint;
begin
  sequence_name := pg_get_serial_sequence(table_name, column_name);
  if sequence_name is null then
    return;
  end if;

  execute format('select coalesce(max(%I), 0) from %s', column_name, table_name) into max_id;
  execute 'select setval($1, $2, true)' using sequence_name, greatest(max_id, 1);
end;
$$;

select pg_temp.reset_sequence('public.usuarios', 'id');
select pg_temp.reset_sequence('public.users', 'id');
select pg_temp.reset_sequence('public.sesion_practica', 'id');
select pg_temp.reset_sequence('public.intento', 'id');
select pg_temp.reset_sequence('public.respuesta_intento', 'id');
select pg_temp.reset_sequence('public.membresias_usuario', 'id');
select pg_temp.reset_sequence('public.historial_membresias', 'id');
select pg_temp.reset_sequence('public.transacciones_pago', 'id');
select pg_temp.reset_sequence('public.libro_reclamaciones', 'id');
select pg_temp.reset_sequence('public.clases', 'id');
select pg_temp.reset_sequence('public.lecciones_clase', 'id');

commit;
