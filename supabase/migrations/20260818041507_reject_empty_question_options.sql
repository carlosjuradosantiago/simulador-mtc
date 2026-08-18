delete from public.opcion_pregunta
where btrim(coalesce(texto, '')) = ''
  and btrim(coalesce(datos_multimedia, '')) = '';

alter table public.opcion_pregunta
  add constraint opcion_pregunta_contenido_visible_check
  check (
    btrim(coalesce(texto, '')) <> ''
    or btrim(coalesce(datos_multimedia, '')) <> ''
  );
