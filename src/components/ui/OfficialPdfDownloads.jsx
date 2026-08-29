import { Download, FileCheck2, FileText } from 'lucide-react';
import { officialMtcPdfs, officialMtcRules } from '../../data/officialMtcPdfs.js';
import Button from './Button.jsx';

export default function OfficialPdfDownloads({ preferredCategoryId = null }) {
  const preferredPdf = officialMtcPdfs.find((pdf) => pdf.categoryIds.includes(Number(preferredCategoryId))) ?? null;

  return (
    <div>
      {preferredPdf ? (
        <section className="border-y border-blue-200 bg-blue-50 px-4 py-5 sm:px-6" aria-labelledby="preferred-pdf-title">
          <div className="mx-auto flex max-w-5xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-brand text-white">
                <FileCheck2 className="h-6 w-6" />
              </span>
              <div>
                <p className="text-sm font-bold text-brand">Tu licencia</p>
                <h2 id="preferred-pdf-title" className="text-xl font-black text-ink">Balotario {preferredPdf.code}</h2>
                <p className="mt-1 text-sm text-slate-600">{preferredPdf.vehicle} · PDF · {preferredPdf.size}</p>
              </div>
            </div>
            <Button as="a" href={preferredPdf.href} download={preferredPdf.filename} className="w-full sm:w-auto">
              <Download className="h-5 w-5" />
              Descargar mi balotario
            </Button>
          </div>
        </section>
      ) : null}

      <section className="mx-auto mt-8 max-w-5xl px-4 sm:px-6" aria-labelledby="all-pdfs-title">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-line pb-4">
          <div>
            <h2 id="all-pdfs-title" className="text-2xl font-black text-ink">Balotarios por licencia</h2>
            <p className="mt-1 text-slate-600">Elige el PDF que corresponde al examen que vas a rendir.</p>
          </div>
          <span className="inline-flex items-center gap-2 text-sm font-bold text-brand">
            <FileText className="h-4 w-4" />
            {officialMtcPdfs.length} balotarios
          </span>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3">
          {officialMtcPdfs.map((pdf) => (
            <article key={pdf.code} className="border-b border-line px-3 py-4">
              <a
                href={pdf.href}
                download={pdf.filename}
                className="flex min-h-16 items-center justify-between gap-3 text-left transition hover:text-brand focus-visible:outline focus-visible:outline-4 focus-visible:outline-brand"
                title={`Descargar PDF oficial ${pdf.code}`}
              >
                <span className="min-w-0">
                  <span className="block text-lg font-black text-ink">{pdf.code}</span>
                  <span className="mt-0.5 block text-sm font-semibold text-slate-600">{pdf.vehicle}</span>
                  <span className="mt-1 block text-xs font-semibold text-slate-500">PDF · {pdf.size}</span>
                </span>
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-blue-50 text-brand">
                  <Download className="h-4 w-4" />
                </span>
              </a>
              <a href={pdf.guideHref} className="mt-2 inline-flex min-h-11 items-center text-sm font-bold text-brand underline underline-offset-4">
                Ver guía, preguntas y respuestas de {pdf.code}
              </a>
            </article>
          ))}
        </div>

        <div className="mt-10 border-b border-line pb-4">
          <h2 className="text-2xl font-black text-ink">Normas de respaldo</h2>
          <p className="mt-1 text-slate-600">Resoluciones oficiales relacionadas con el balotario y la evaluación.</p>
        </div>
        <div className="divide-y divide-line">
          {officialMtcRules.map((pdf) => (
            <a
              key={pdf.code}
              href={pdf.href}
              download={pdf.filename}
              className="flex min-h-24 items-center justify-between gap-4 px-3 py-4 hover:bg-blue-50 focus-visible:outline focus-visible:outline-4 focus-visible:outline-brand"
            >
              <span>
                <span className="block font-black text-ink">{pdf.code}</span>
                <span className="mt-1 block text-sm leading-6 text-slate-600">{pdf.description}</span>
                <span className="mt-1 block text-xs font-bold text-slate-500">PDF · {pdf.size}</span>
              </span>
              <Download className="h-5 w-5 shrink-0 text-brand" />
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}
