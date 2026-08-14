import { FileDown } from 'lucide-react';
import OfficialPdfDownloads from '../components/ui/OfficialPdfDownloads.jsx';
import { useAuth } from '../hooks/useAuth.js';
import { resolveCategoryId } from '../services/api.js';

export default function OfficialMaterialsPage() {
  const { user } = useAuth();
  const preferredCategoryId = user?.categoryConfirmed && user?.category
    ? resolveCategoryId(user.category)
    : null;

  return (
    <div className="pb-12 sm:pb-16">
      <header className="mx-auto max-w-5xl px-4 py-8 text-center sm:px-6 sm:py-12">
        <div className="flex flex-col items-center gap-3">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-emerald-50 text-success">
            <FileDown className="h-6 w-6" />
          </span>
          <div>
            <h1 className="font-display text-3xl font-black text-ink sm:text-4xl">PDF oficiales del MTC</h1>
            <p className="mx-auto mt-2 max-w-2xl text-lg leading-7 text-slate-600">
              Descarga el balotario original de tu licencia y úsalo para estudiar cuando lo necesites.
            </p>
          </div>
        </div>
      </header>

      <OfficialPdfDownloads preferredCategoryId={preferredCategoryId} />
    </div>
  );
}
