export const officialMtcPdfs = [
  { code: 'A-I', categoryIds: [25], filename: 'balotario_A-I.pdf', bytes: 943041 },
  { code: 'A-IIA', categoryIds: [16], filename: 'balotario_A-IIA.pdf', bytes: 999170 },
  { code: 'A-IIB', categoryIds: [17], filename: 'balotario_A-IIB.pdf', bytes: 1106158 },
  { code: 'A-IIIA', categoryIds: [18], filename: 'balotario_A-IIIA.pdf', bytes: 1096436 },
  { code: 'A-IIIB', categoryIds: [19], filename: 'balotario_A-IIIB.pdf', bytes: 1104305 },
  { code: 'A-IIIC', categoryIds: [20], filename: 'balotario_A-IIIC.pdf', bytes: 1583797 },
  { code: 'B-IIA', categoryIds: [22], filename: 'balotario_B-IIA.pdf', bytes: 212522 },
  { code: 'B-IIB', categoryIds: [23], filename: 'balotario_B-IIB.pdf', bytes: 202684 },
  { code: 'B-IIC', categoryIds: [24], filename: 'balotario_B-IIC.pdf', bytes: 211815 },
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
