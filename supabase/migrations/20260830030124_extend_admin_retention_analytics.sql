create or replace view public.admin_user_summary
with (security_invoker = true)
as
with visitor_owners as (
  select
    visitor_id,
    min(id_usuario)::bigint as id_usuario
  from public.eventos_analytics
  where visitor_id is not null
    and id_usuario is not null
  group by visitor_id
  having count(distinct id_usuario) = 1
),
classified_events as (
  select
    event.id,
    coalesce(event.id_usuario::bigint, visitor_owners.id_usuario) as id_usuario,
    event.creado_en,
    case
      when lower(event.user_agent) ~ '(bot|spider|crawler|crawl|slurp|bingpreview|headlesschrome|lighthouse|pagespeed|google-inspectiontool|facebookexternalhit|whatsapp|telegrambot|twitterbot|linkedinbot|curl|wget|python-requests|go-http-client)' then 'bot'
      when lower(event.user_agent) ~ '(ipad|tablet|kindle|silk|playbook)'
        or (lower(event.user_agent) like '%android%' and lower(event.user_agent) not like '%mobile%') then 'tablet'
      when lower(event.user_agent) ~ '(iphone|ipod|android|mobile|windows phone|iemobile|opera mini)' then 'mobile'
      when nullif(btrim(event.user_agent), '') is null then 'unknown'
      else 'desktop'
    end as device
  from public.eventos_analytics event
  left join visitor_owners on visitor_owners.visitor_id = event.visitor_id
  where coalesce(event.id_usuario::bigint, visitor_owners.id_usuario) is not null
),
human_events as (
  select *
  from classified_events
  where device <> 'bot'
),
analytics_totals as (
  select
    id_usuario,
    (array_agg(device order by creado_en, id))[1] as first_device,
    (array_agg(device order by creado_en desc, id desc))[1] as last_device
  from human_events
  group by id_usuario
),
normalized_sessions as (
  select
    id,
    id_usuario,
    coalesce(created_at, creado_en at time zone 'UTC', hora_inicio at time zone 'UTC') as started_at,
    coalesce(fecha_fin, updated_at, hora_fin at time zone 'UTC') as ended_at,
    upper(coalesce(estado, '')) = 'FINALIZADO' or fecha_fin is not null as completed
  from public.sesion_practica
),
practice_totals as (
  select
    id_usuario,
    count(*)::bigint as practice_sessions,
    count(*)::bigint as started_sessions,
    count(*) filter (where completed)::bigint as completed_sessions,
    min(started_at) as first_practice_at
  from normalized_sessions
  group by id_usuario
),
normalized_attempts as (
  select
    id,
    id_usuario,
    coalesce(fecha_inicio, created_at, hora_inicio at time zone 'UTC') as started_at,
    coalesce(fecha_fin, created_at, hora_fin at time zone 'UTC') as ended_at
  from public.intento
),
attempt_totals as (
  select
    id_usuario,
    count(*)::bigint as attempts
  from normalized_attempts
  group by id_usuario
),
activity_rows as (
  select id_usuario, creado_en as active_at
  from human_events
  union all
  select id_usuario, started_at
  from normalized_sessions
  where started_at is not null
  union all
  select id_usuario, coalesce(ended_at, started_at)
  from normalized_attempts
  where coalesce(ended_at, started_at) is not null
),
activity_totals as (
  select
    activity_rows.id_usuario,
    max(activity_rows.active_at) as last_active_at,
    count(distinct (activity_rows.active_at at time zone 'America/Lima')::date)::bigint as active_days,
    bool_or(
      (activity_rows.active_at at time zone 'America/Lima')::date
        > ((users.creado_en at time zone 'UTC') at time zone 'America/Lima')::date
    ) as returned_after_registration
  from activity_rows
  join public.usuarios users on users.id = activity_rows.id_usuario
  where activity_rows.active_at >= users.creado_en at time zone 'UTC'
  group by activity_rows.id_usuario
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
  users.id,
  coalesce(
    nullif(trim(concat_ws(' ', users.primer_nombre, users.apellido)), ''),
    nullif(users.nombre_usuario, ''),
    users.correo_electronico
  ) as display_name,
  users.correo_electronico as email,
  users.nombre_usuario as username,
  coalesce(users.rol, 'USUARIO') as role,
  users.creado_en as registered_at,
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
  end as status,
  coalesce(analytics_totals.first_device, 'unknown') as first_device,
  coalesce(analytics_totals.last_device, 'unknown') as last_device,
  coalesce(activity_totals.last_active_at, users.creado_en at time zone 'UTC') as last_active_at,
  coalesce(activity_totals.active_days, 0)::bigint as active_days,
  coalesce(practice_totals.started_sessions, 0)::bigint as started_sessions,
  coalesce(practice_totals.completed_sessions, 0)::bigint as completed_sessions,
  coalesce(attempt_totals.attempts, 0)::bigint as attempts,
  coalesce(activity_totals.returned_after_registration, false) as returned_after_registration,
  practice_totals.first_practice_at,
  case
    when practice_totals.first_practice_at is null then null
    else round(
      greatest(
        extract(epoch from (practice_totals.first_practice_at - (users.creado_en at time zone 'UTC'))) / 60,
        0
      ),
      1
    )
  end as minutes_to_first_practice
from public.usuarios users
left join analytics_totals on analytics_totals.id_usuario = users.id
left join practice_totals on practice_totals.id_usuario = users.id
left join attempt_totals on attempt_totals.id_usuario = users.id
left join activity_totals on activity_totals.id_usuario = users.id
left join payment_totals on payment_totals.id_usuario = users.id
left join latest_membership on latest_membership.id_usuario = users.id;

revoke all on table public.admin_user_summary from public, anon, authenticated, service_role;
grant select on table public.admin_user_summary to service_role;

comment on view public.admin_user_summary is
  'Resumen privado de usuarios, activacion, retencion y dispositivo para el panel administrador.';
