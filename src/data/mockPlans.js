export const plans = [
  {
    id: 'mensual',
    name: 'Mensual',
    subtitle: 'Ideal para empezar',
    price: 29900,
    period: '/mes',
    savings: null,
    recommended: false,
  },
  {
    id: 'trimestral',
    name: 'Trimestral',
    subtitle: 'Ahorra 12%',
    price: 74900,
    period: '/3 meses',
    savings: 'Equivale a S/24.967 /mes',
    recommended: true,
    discount: 9000,
  },
  {
    id: 'anual',
    name: 'Anual',
    subtitle: 'Ahorra 25%',
    price: 239900,
    period: '/año',
    savings: 'Equivale a S/19.992 /mes',
    recommended: false,
  },
];

export const planBenefits = [
  'Acceso a todas las categorías',
  'Simulacros ilimitados',
  'Estadísticas de rendimiento',
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
