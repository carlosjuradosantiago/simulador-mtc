update public.planes_membresia
set
  precio = 12,
  duracion_meses = 1,
  esta_activo = true,
  descripcion = coalesce(descripcion, 'Acceso completo por 1 mes'),
  actualizado_en = now()
where duracion_meses = 1
   or lower(nombre) like '%mensual%';

update public.planes_membresia
set
  esta_activo = false,
  actualizado_en = now()
where duracion_meses <> 1
  and lower(nombre) not like '%mensual%';
