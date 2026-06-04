import { Download } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getOfficialPdfForCategory } from '../../data/officialMtcPdfs.js';
import Button from './Button.jsx';
import Card from './Card.jsx';
import LicenseIcon from './LicenseIcon.jsx';
import ProgressBar from './ProgressBar.jsx';

export default function CategoryCard({ category, compact = false }) {
  const officialPdf = getOfficialPdfForCategory(category);

  return (
    <Card className="flex h-full min-h-[224px] flex-col p-3 transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-xl sm:p-4">
      <div className="flex items-start justify-between gap-3">
        <LicenseIcon category={category.title ?? category.id} accent={category.accent} />
        <div className="flex flex-col items-end gap-2">
          <span className="text-sm font-bold text-slate-500">{category.progress}%</span>
          {officialPdf ? (
            <a
              href={officialPdf.href}
              download={officialPdf.filename}
              className="grid h-8 w-8 place-items-center rounded-lg border border-line bg-white text-brand transition hover:border-blue-300 hover:bg-blue-50"
              title={`Descargar PDF oficial ${officialPdf.code}`}
              aria-label={`Descargar PDF oficial ${officialPdf.code}`}
            >
              <Download className="h-4 w-4" />
            </a>
          ) : null}
        </div>
      </div>
      <h3 className="mt-3 text-2xl font-black text-ink">{category.title}</h3>
      <p className="clamp-3 mt-1 min-h-[60px] text-sm leading-5 text-slate-600">{category.vehicle}</p>
      <ProgressBar value={category.progress} color={category.accent} className="mt-3" />
      {!compact ? (
        <Button as={Link} to={`/simulacro/${category.id}`} variant="secondary" size="sm" className="mt-auto w-full">
          Practicar
        </Button>
      ) : null}
    </Card>
  );
}
