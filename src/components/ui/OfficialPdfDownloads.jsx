import { Download, FileText } from 'lucide-react';
import { officialMtcPdfs } from '../../data/officialMtcPdfs.js';
import Card from './Card.jsx';

export default function OfficialPdfDownloads({ className = '' }) {
  return (
    <Card className={`p-4 ${className}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-black">PDFs oficiales MTC</h2>
          <p className="mt-1 text-sm text-slate-600">Descarga el balotario original por categoría para estudiar sin conexión.</p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-brand">
          <FileText className="h-4 w-4" />
          {officialMtcPdfs.length} archivos
        </span>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {officialMtcPdfs.map((pdf) => (
          <a
            key={pdf.code}
            href={pdf.href}
            download={pdf.filename}
            className="flex min-h-14 items-center justify-between gap-3 rounded-lg border border-line bg-white px-3 py-2 text-left transition hover:border-blue-300 hover:bg-blue-50"
            title={`Descargar PDF oficial ${pdf.code}`}
          >
            <span className="min-w-0">
              <span className="block font-black text-ink">{pdf.code}</span>
              <span className="block truncate text-xs font-semibold text-slate-500">{pdf.filename} · {pdf.size}</span>
            </span>
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand text-white">
              <Download className="h-4 w-4" />
            </span>
          </a>
        ))}
      </div>
    </Card>
  );
}
