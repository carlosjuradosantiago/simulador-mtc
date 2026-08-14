import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react';
import Button from '../ui/Button.jsx';
import { cn } from '../../utils/cn.js';

export function SortableTh({ field, label, activeField, direction, onSort, className, align = 'left' }) {
  const active = activeField === field;
  const Icon = active ? (direction === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown;

  return (
    <th className={cn('px-3 py-3', align === 'right' && 'text-right', className)} aria-sort={active ? (direction === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <button
        type="button"
        onClick={() => onSort(field)}
        className={cn(
          'inline-flex min-h-8 items-center gap-1 rounded px-1 font-bold hover:bg-blue-50 hover:text-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand',
          align === 'right' && 'ml-auto',
          active && 'text-brand',
        )}
      >
        {label}
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </th>
  );
}

export function PaginationControls({ pagination, onPageChange, onSizeChange, disabled = false, sizeOptions = [10, 20, 50] }) {
  const page = pagination?.page || 1;
  const totalPages = pagination?.totalPages || 1;
  const total = pagination?.total || 0;
  const size = pagination?.size || sizeOptions[0];

  return (
    <nav className="flex flex-col gap-3 border-t border-line px-4 py-3 sm:flex-row sm:items-center sm:justify-between" aria-label="Paginacion de tabla">
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-600">
        <span>{total} registros</span>
        {onSizeChange ? (
          <label className="inline-flex items-center gap-2">
            <span className="sr-only">Registros por pagina</span>
            <select
              value={size}
              onChange={(event) => onSizeChange(Number(event.target.value))}
              disabled={disabled}
              className="min-h-9 rounded-md border border-line bg-white px-2 font-bold text-ink"
            >
              {sizeOptions.map((option) => <option key={option} value={option}>{option} por pagina</option>)}
            </select>
          </label>
        ) : null}
      </div>
      <div className="flex items-center justify-between gap-3 sm:justify-end">
        <Button variant="secondary" size="sm" onClick={() => onPageChange(page - 1)} disabled={disabled || page <= 1} aria-label="Pagina anterior">
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        </Button>
        <span className="min-w-28 text-center text-sm font-bold text-slate-600">Pagina {page} de {totalPages}</span>
        <Button variant="secondary" size="sm" onClick={() => onPageChange(page + 1)} disabled={disabled || page >= totalPages} aria-label="Pagina siguiente">
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </nav>
  );
}
