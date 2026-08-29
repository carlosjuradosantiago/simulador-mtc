export const officialMtcPdfs = [
  { code: 'A-I', slug: 'a1', categoryIds: [25], vehicle: 'Auto particular', filename: 'balotario_A-I.pdf', bytes: 943041 },
  { code: 'A-IIA', slug: 'a2a', categoryIds: [16], vehicle: 'Taxi y vehículo especial', filename: 'balotario_A-IIA.pdf', bytes: 999170 },
  { code: 'A-IIB', slug: 'a2b', categoryIds: [17], vehicle: 'Microbús y camión mediano', filename: 'balotario_A-IIB.pdf', bytes: 1106158 },
  { code: 'A-IIIA', slug: 'a3a', categoryIds: [18], vehicle: 'Ómnibus', filename: 'balotario_A-IIIA.pdf', bytes: 1096436 },
  { code: 'A-IIIB', slug: 'a3b', categoryIds: [19], vehicle: 'Camión y volquete', filename: 'balotario_A-IIIB.pdf', bytes: 1104305 },
  { code: 'A-IIIC', slug: 'a3c', categoryIds: [20], vehicle: 'Ómnibus y camión pesado', filename: 'balotario_A-IIIC.pdf', bytes: 1583797 },
  { code: 'B-IIA', slug: 'b2a', categoryIds: [22], vehicle: 'Bicimoto', filename: 'balotario_B-IIA.pdf', bytes: 212522 },
  { code: 'B-IIB', slug: 'b2b', categoryIds: [23], vehicle: 'Motocicleta', filename: 'balotario_B-IIB.pdf', bytes: 202684 },
  { code: 'B-IIC', slug: 'b2c', categoryIds: [24], vehicle: 'Mototaxi', filename: 'balotario_B-IIC.pdf', bytes: 211815 },
].map((pdf) => ({
  ...pdf,
  href: `/mtc-official/${pdf.filename}`,
  guideHref: `/balotario-mtc-${pdf.slug}`,
  size: formatPdfSize(pdf.bytes),
}));

export const officialMtcRules = [
  {
    code: 'R.D. 5980-2017-MTC/15',
    description: 'Aprueba el balotario de preguntas para la evaluación de conocimientos.',
    filename: 'norma_RD-5980-2017.pdf',
    bytes: 1652250,
  },
  {
    code: 'R.D. 3748-2016-MTC/15',
    description: 'Establece los temas de la evaluación de conocimientos para licencias de conducir.',
    filename: 'norma_RD-3748-2016.pdf',
    bytes: 752305,
  },
].map((pdf) => ({
  ...pdf,
  href: `/mtc-official/${pdf.filename}`,
  size: formatPdfSize(pdf.bytes),
}));

const categoryCodeAliases = {
  A1: 'A-I',
  AI: 'A-I',
  A2A: 'A-IIA',
  AIIA: 'A-IIA',
  A2B: 'A-IIB',
  AIIB: 'A-IIB',
  A3A: 'A-IIIA',
  AIIIA: 'A-IIIA',
  A3B: 'A-IIIB',
  AIIIB: 'A-IIIB',
  A3C: 'A-IIIC',
  AIIIC: 'A-IIIC',
  B2A: 'B-IIA',
  BIIA: 'B-IIA',
  B2B: 'B-IIB',
  BIIB: 'B-IIB',
  B2C: 'B-IIC',
  BIIC: 'B-IIC',
};

const pdfByCode = new Map(officialMtcPdfs.map((pdf) => [pdf.code, pdf]));
const pdfByCategoryId = new Map(officialMtcPdfs.flatMap((pdf) => pdf.categoryIds.map((id) => [String(id), pdf])));

function formatPdfSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function normalizeCategoryCode(value) {
  if (value === undefined || value === null) return '';
  const raw = String(value).replace(/^Licencia\s+/i, '').trim().toUpperCase();
  const compact = raw.replace(/[^A-Z0-9]/g, '');
  return categoryCodeAliases[compact] ?? raw;
}

export function getOfficialPdfForCategory(category) {
  if (!category) return null;

  const byId = pdfByCategoryId.get(String(category.id));
  if (byId) return byId;

  const possibleCodes = [
    category.code,
    category.title,
    category.name,
    category.nombre,
    category.category,
  ].map(normalizeCategoryCode);

  return possibleCodes.map((code) => pdfByCode.get(code)).find(Boolean) ?? null;
}
