alter table public.transacciones_pago
  add column if not exists terminos_aceptados_en timestamptz,
  add column if not exists terminos_version text;

alter table public.transacciones_pago
  drop constraint if exists transacciones_pago_aceptacion_legal_check;

alter table public.transacciones_pago
  add constraint transacciones_pago_aceptacion_legal_check
  check (
    (terminos_aceptados_en is null and terminos_version is null)
    or (
      terminos_aceptados_en is not null
      and char_length(terminos_version) between 8 and 32
    )
  );

comment on column public.transacciones_pago.terminos_aceptados_en is
  'Fecha en que el usuario acepto los terminos antes de enviar el pago.';

comment on column public.transacciones_pago.terminos_version is
  'Version de los terminos aceptados por el usuario.';

alter table public.suscripciones_culqi
  add column if not exists terminos_version text;

comment on column public.suscripciones_culqi.terminos_version is
  'Version de los terminos aceptados al crear la suscripcion recurrente.';
