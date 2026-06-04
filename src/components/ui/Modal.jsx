import { X } from 'lucide-react';
import Button from './Button.jsx';

export default function Modal({ open, title, children, onClose, actionLabel }) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-line bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-xl font-bold text-ink">{title}</h2>
          <button className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" onClick={onClose} aria-label="Cerrar modal">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="text-sm leading-6 text-slate-600">{children}</div>
        <Button className="mt-6 w-full" onClick={onClose}>
          {actionLabel ?? 'Entendido'}
        </Button>
      </div>
    </div>
  );
}
