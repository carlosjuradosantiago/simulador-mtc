alter table public.transacciones_pago
  add column if not exists culqi_subscription_id text,
  add column if not exists origen_cobro varchar(24) not null default 'pago_unico';

alter table public.transacciones_pago
  drop constraint if exists transacciones_pago_origen_cobro_check;

alter table public.transacciones_pago
  add constraint transacciones_pago_origen_cobro_check
  check (origen_cobro in ('pago_unico', 'suscripcion_inicial', 'renovacion_automatica'));

create index if not exists idx_transacciones_culqi_subscription
  on public.transacciones_pago (culqi_subscription_id, creado_en desc)
  where culqi_subscription_id is not null;

comment on column public.transacciones_pago.culqi_subscription_id is
  'Identificador opaco de la suscripcion Culqi; nunca contiene datos de tarjeta.';

create table if not exists public.configuracion_planes_culqi (
  id bigserial primary key,
  id_plan_membresia integer not null references public.planes_membresia(id),
  ambiente varchar(8) not null check (ambiente in ('test', 'live')),
  culqi_plan_id text not null unique,
  monto_centimos integer not null check (monto_centimos >= 300),
  moneda varchar(3) not null default 'PEN' check (moneda in ('PEN', 'USD')),
  intervalo_unidad smallint not null default 3 check (intervalo_unidad between 1 and 6),
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  unique (id_plan_membresia, ambiente)
);

create table if not exists public.suscripciones_culqi (
  id bigserial primary key,
  id_usuario bigint not null references public.usuarios(id),
  id_plan_membresia integer not null references public.planes_membresia(id),
  id_transaccion_inicial bigint not null unique references public.transacciones_pago(id),
  culqi_customer_id text,
  culqi_card_id text,
  culqi_plan_id text,
  culqi_subscription_id text unique,
  estado varchar(20) not null default 'preparando'
    check (estado in ('preparando', 'creada', 'activa', 'en_cola', 'cancelada', 'fallida', 'finalizada')),
  renovacion_automatica boolean not null default true,
  proximo_cobro_en timestamptz,
  periodo_actual integer,
  culqi_card_brand text,
  culqi_card_last4 varchar(4),
  datos_facturacion jsonb not null default '{}'::jsonb,
  terminos_aceptados_en timestamptz not null,
  cancelada_en timestamptz,
  mensaje_error text,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  check (culqi_card_last4 is null or culqi_card_last4 ~ '^[0-9]{4}$'),
  check (culqi_subscription_id is not null or estado in ('preparando', 'fallida'))
);

create unique index if not exists suscripciones_culqi_usuario_activa_uidx
  on public.suscripciones_culqi (id_usuario)
  where renovacion_automatica = true
    and estado in ('preparando', 'creada', 'activa', 'en_cola');

create index if not exists idx_suscripciones_culqi_card
  on public.suscripciones_culqi (culqi_card_id)
  where culqi_card_id is not null;

create index if not exists idx_suscripciones_culqi_usuario
  on public.suscripciones_culqi (id_usuario, creado_en desc);

alter table public.configuracion_planes_culqi enable row level security;
alter table public.suscripciones_culqi enable row level security;

revoke all on table public.configuracion_planes_culqi from public, anon, authenticated;
revoke all on table public.suscripciones_culqi from public, anon, authenticated;
revoke all on sequence public.configuracion_planes_culqi_id_seq from public, anon, authenticated;
revoke all on sequence public.suscripciones_culqi_id_seq from public, anon, authenticated;

grant all on table public.configuracion_planes_culqi to service_role;
grant all on table public.suscripciones_culqi to service_role;
grant usage, select on sequence public.configuracion_planes_culqi_id_seq to service_role;
grant usage, select on sequence public.suscripciones_culqi_id_seq to service_role;

comment on table public.configuracion_planes_culqi is
  'Relacion privada entre planes internos y planes recurrentes de Culqi.';

comment on table public.suscripciones_culqi is
  'Estado privado de cobro recurrente. Solo almacena identificadores opacos y los ultimos cuatro digitos.';
