export function addBusinessDays(startDate, businessDays) {
  if (!(startDate instanceof Date) || Number.isNaN(startDate.getTime())) throw new TypeError('Fecha inicial inválida');
  if (!Number.isInteger(businessDays) || businessDays < 0) throw new TypeError('Los días hábiles deben ser un entero positivo');

  const deadline = new Date(startDate);
  let added = 0;
  // ponytail: omitir solo fines de semana fija un plazo conservador; agregar feriados peruanos cuando exista una fuente oficial automatizada.
  while (added < businessDays) {
    deadline.setUTCDate(deadline.getUTCDate() + 1);
    const day = deadline.getUTCDay();
    if (day !== 0 && day !== 6) added += 1;
  }
  return deadline;
}
