export const plans = [
  {
    id: 'mensual',
    name: 'Mensual',
    subtitle: 'Acceso completo para prepararte',
    price: 1200,
    period: '/mes',
    savings: null,
    recommended: true,
    discount: 0,
  },
];

export const planBenefits = [
  'Acceso a todas las categorias',
  'Simulacros ilimitados',
  'Estadisticas de rendimiento',
  'Banco de preguntas completo',
  'Soporte por chat',
];

export function formatCurrency(amount) {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
    maximumFractionDigits: 0,
  }).format(amount / 100);
}
