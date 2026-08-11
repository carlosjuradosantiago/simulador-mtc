import { X } from 'lucide-react';
import { useEffect, useId, useRef } from 'react';
import Button from './Button.jsx';

export default function Modal({
  open,
  title,
  children,
  onClose,
  actionLabel,
  showAction = true,
  className = '',
  childrenClassName = '',
}) {
  const titleId = useId();
  const closeButtonRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    const previousOverflow = document.body.style.overflow;
    const previouslyFocused = document.activeElement;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.();
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    closeButtonRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus();
    };
  }, [onClose, open]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose?.();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`max-h-[calc(100vh-2rem)] w-full max-w-md overflow-y-auto rounded-lg border border-line bg-white p-5 shadow-2xl sm:p-6 ${className}`}
      >
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 id={titleId} className="font-display text-xl font-black text-ink sm:text-2xl">{title}</h2>
          <button
            ref={closeButtonRef}
            type="button"
            className="grid min-h-11 min-w-11 place-items-center rounded-lg text-slate-500 hover:bg-slate-100"
            onClick={onClose}
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className={`text-sm leading-6 text-slate-600 ${childrenClassName}`}>{children}</div>
        {showAction ? (
          <Button className="mt-6 w-full" onClick={onClose}>
            {actionLabel ?? 'Entendido'}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
