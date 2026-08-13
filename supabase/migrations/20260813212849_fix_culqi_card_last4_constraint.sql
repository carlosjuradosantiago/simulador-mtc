alter table public.suscripciones_culqi
  drop constraint if exists suscripciones_culqi_culqi_card_last4_check;

alter table public.suscripciones_culqi
  add constraint suscripciones_culqi_culqi_card_last4_check
  check (culqi_card_last4 is null or culqi_card_last4 ~ '^[0-9]{4}$');
