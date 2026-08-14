create index if not exists usuarios_admin_registro_idx
  on public.usuarios (creado_en desc, id desc);

create index if not exists membresias_usuario_admin_usuario_fin_idx
  on public.membresias_usuario (id_usuario, fecha_fin desc);

create or replace view public.admin_user_summary
with (security_invoker = true)
as
with practice_totals as (
  select id_usuario, count(*)::bigint as practice_sessions
  from public.sesion_practica
  group by id_usuario
),
payment_totals as (
  select
    id_usuario,
    count(*)::bigint as payment_count,
    coalesce(sum(monto), 0)::numeric(12, 2) as paid_amount
  from public.transacciones_pago
  where lower(estado) in (
    'exitoso', 'exitosa', 'pagado', 'pagada', 'paid',
    'approved', 'aprobado', 'aprobada', 'success', 'succeeded'
  )
    and metodo_pago <> 'simulacion'
    and verificado_proveedor_en is not null
    and culqi_charge_id like 'chr_live_%'
  group by id_usuario
),
latest_membership as (
  select distinct on (id_usuario)
    id_usuario,
    esta_activa,
    fecha_inicio,
    fecha_fin
  from public.membresias_usuario
  order by id_usuario, fecha_fin desc, id desc
)
select
  u.id,
  coalesce(
    nullif(trim(concat_ws(' ', u.primer_nombre, u.apellido)), ''),
    nullif(u.nombre_usuario, ''),
    u.correo_electronico
  ) as display_name,
  u.correo_electronico as email,
  u.nombre_usuario as username,
  coalesce(u.rol, 'USUARIO') as role,
  u.creado_en as registered_at,
  coalesce(practice_totals.practice_sessions, 0)::bigint as practice_sessions,
  coalesce(payment_totals.payment_count, 0)::bigint as payment_count,
  coalesce(payment_totals.paid_amount, 0)::numeric(12, 2) as paid_amount,
  latest_membership.fecha_inicio as membership_started_at,
  latest_membership.fecha_fin as membership_ends_at,
  case
    when latest_membership.esta_activa = true and latest_membership.fecha_fin >= now() then 'Suscripcion activa'
    when latest_membership.esta_activa = false and latest_membership.fecha_fin >= now() then 'Suscripcion cancelada'
    when coalesce(payment_totals.payment_count, 0) > 0 then 'Pago anterior'
    when coalesce(practice_totals.practice_sessions, 0) > 0 then 'Practico sin pagar'
    else 'Registro'
  end as status
from public.usuarios u
left join practice_totals on practice_totals.id_usuario = u.id
left join payment_totals on payment_totals.id_usuario = u.id
left join latest_membership on latest_membership.id_usuario = u.id;

revoke all on table public.admin_user_summary from public, anon, authenticated, service_role;
grant select on table public.admin_user_summary to service_role;

comment on view public.admin_user_summary is
  'Resumen privado para busqueda, ordenamiento y paginacion del panel administrador.';
