alter table public.libro_reclamaciones
  add column if not exists respuesta_enviada_en timestamptz,
  add column if not exists respuesta_email_id varchar(160),
  add column if not exists ultimo_error_envio text;

alter table public.libro_reclamaciones
  drop constraint if exists libro_reclamaciones_estado_reclamo_check;

alter table public.libro_reclamaciones
  add constraint libro_reclamaciones_estado_reclamo_check
  check (estado_reclamo in ('PENDIENTE', 'EN_PROCESO', 'ATENDIDO'));

create index if not exists idx_libro_reclamaciones_gestion
  on public.libro_reclamaciones (estado_reclamo, fecha_limite_respuesta, fecha_registro desc);

alter table public.libro_reclamaciones enable row level security;
revoke all on table public.libro_reclamaciones from anon, authenticated;

comment on column public.libro_reclamaciones.respuesta_enviada_en
  is 'Fecha en que la respuesta formal fue enviada al consumidor.';
comment on column public.libro_reclamaciones.respuesta_email_id
  is 'Identificador del proveedor de correo para conservar evidencia del envio.';
comment on column public.libro_reclamaciones.ultimo_error_envio
  is 'Ultimo error de entrega; se elimina despues de un envio exitoso.';
