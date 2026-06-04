create table if not exists public.auth_email_codes (
  id bigserial primary key,
  usuario_id integer references public.usuarios(id) on delete cascade,
  email text not null,
  purpose text not null check (purpose in ('EMAIL_VERIFICATION', 'PASSWORD_RESET')),
  code_hash text not null,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  attempts integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_auth_email_codes_lookup
  on public.auth_email_codes (lower(email), purpose, consumed_at, expires_at desc);

create index if not exists idx_auth_email_codes_usuario
  on public.auth_email_codes (usuario_id);