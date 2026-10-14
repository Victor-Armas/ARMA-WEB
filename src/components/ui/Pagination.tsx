import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  ariaLabel?: string;
  page: number;
  totalPages: number;
  disabled?: boolean;
  onPageChange: (page: number) => void;
}

const buttonClass = 'flex min-h-11 min-w-11 items-center justify-center gap-1 rounded-arma border border-arma-border bg-arma-surface px-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arma-active disabled:cursor-default disabled:opacity-50';

export function Pagination({ page, totalPages, disabled = false, ariaLabel = 'Páginas de productos', onPageChange }: PaginationProps) {
  const first = Math.max(1, Math.min(page - 1, totalPages - 2));
  const numbers = Array.from({ length: Math.min(3, totalPages) }, (_, index) => first + index);
  return (
    <nav aria-label={ariaLabel} className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-arma-border pt-5">
      <p className="text-sm text-arma-muted">Página {page} de {totalPages}</p>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" aria-label="Página anterior" disabled={disabled || page <= 1} onClick={() => onPageChange(page - 1)} className={buttonClass}><ChevronLeft size={18} aria-hidden="true" /><span className="hidden sm:inline">Anterior</span></button>
        {numbers.map(number => <button key={number} type="button" aria-label={`Página ${number}`} aria-current={page === number ? 'page' : undefined} disabled={disabled || page === number} onClick={() => onPageChange(number)} className={`${buttonClass} ${page === number ? 'border-arma-active font-semibold text-arma-active disabled:opacity-100' : ''}`}>{number}</button>)}
        <button type="button" aria-label="Página siguiente" disabled={disabled || page >= totalPages} onClick={() => onPageChange(page + 1)} className={buttonClass}><span className="hidden sm:inline">Siguiente</span><ChevronRight size={18} aria-hidden="true" /></button>
      </div>
    </nav>
  );
}
