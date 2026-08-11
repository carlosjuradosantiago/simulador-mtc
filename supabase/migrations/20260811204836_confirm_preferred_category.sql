alter table public.configuracion_usuario
  add column if not exists categoria_confirmada boolean not null default false;

comment on column public.configuracion_usuario.categoria_confirmada is
  'Indica que la persona eligio explicitamente la categoria de licencia que prepara.';
