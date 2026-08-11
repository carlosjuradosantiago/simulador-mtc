alter table public.usuarios
  add column if not exists rol text not null default 'USUARIO';

update public.usuarios
set rol = 'USUARIO'
where rol is null or upper(rol) not in ('USUARIO', 'ADMIN');

alter table public.usuarios
  alter column rol set default 'USUARIO',
  alter column rol set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.usuarios'::regclass
      and conname = 'usuarios_rol_check'
  ) then
    alter table public.usuarios
      add constraint usuarios_rol_check check (rol in ('USUARIO', 'ADMIN'));
  end if;
end
$$;

update public.usuarios
set rol = 'ADMIN', actualizado_en = now()
where lower(trim(correo_electronico)) = 'ivan.carlos23@gmail.com';

create index if not exists idx_usuarios_rol on public.usuarios (rol);
create index if not exists idx_eventos_analytics_tipo_creado
  on public.eventos_analytics (tipo_evento, creado_en desc);
create index if not exists idx_membresias_usuario_activa_fin
  on public.membresias_usuario (esta_activa, fecha_fin desc);