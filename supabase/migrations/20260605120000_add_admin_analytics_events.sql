create table if not exists public.eventos_analytics (
  id bigserial primary key,
  visitor_id text,
  id_usuario integer references public.usuarios(id) on delete set null,
  tipo_evento text not null,
  ruta text,
  titulo text,
  referrer text,
  user_agent text,
  metadata jsonb not null default '{}'::jsonb,
  creado_en timestamptz not null default now()
);

create index if not exists idx_eventos_analytics_creado_en
  on public.eventos_analytics (creado_en desc);

create index if not exists idx_eventos_analytics_tipo_creado
  on public.eventos_analytics (tipo_evento, creado_en desc);

create index if not exists idx_eventos_analytics_usuario
  on public.eventos_analytics (id_usuario, creado_en desc);

create index if not exists idx_eventos_analytics_visitor
  on public.eventos_analytics (visitor_id, creado_en desc);
