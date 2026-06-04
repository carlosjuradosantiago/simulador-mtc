-- Remove automated visual QA data created while validating responsive UI adjustments.

begin;

create temporary table tmp_simulamanejo_visual_smoke_usuarios on commit drop as
select id
from public.usuarios
where correo_electronico like 'pw\_%@example.com' escape '\';

create temporary table tmp_simulamanejo_visual_smoke_intentos on commit drop as
select id
from public.intento
where id_usuario in (select id from tmp_simulamanejo_visual_smoke_usuarios);

create temporary table tmp_simulamanejo_visual_smoke_membresias on commit drop as
select id
from public.membresias_usuario
where id_usuario in (select id from tmp_simulamanejo_visual_smoke_usuarios);

delete from public.respuesta_intento
where id_intento in (select id from tmp_simulamanejo_visual_smoke_intentos);

delete from public.historial_membresias
where id_usuario in (select id from tmp_simulamanejo_visual_smoke_usuarios)
   or id_membresia in (select id from tmp_simulamanejo_visual_smoke_membresias);

delete from public.progreso_clase_usuario
where id_usuario in (select id from tmp_simulamanejo_visual_smoke_usuarios);

delete from public.configuracion_usuario
where id_usuario in (select id from tmp_simulamanejo_visual_smoke_usuarios);

delete from public.transacciones_pago
where id_usuario in (select id from tmp_simulamanejo_visual_smoke_usuarios);

delete from public.membresias_usuario
where id_usuario in (select id from tmp_simulamanejo_visual_smoke_usuarios);

delete from public.intento
where id_usuario in (select id from tmp_simulamanejo_visual_smoke_usuarios);

delete from public.sesion_practica
where id_usuario in (select id from tmp_simulamanejo_visual_smoke_usuarios);

delete from public.usuarios
where id in (select id from tmp_simulamanejo_visual_smoke_usuarios);

delete from public.users
where email like 'pw\_%@example.com' escape '\';

delete from public.libro_reclamaciones
where email like 'pw\_%@example.com' escape '\';

commit;
