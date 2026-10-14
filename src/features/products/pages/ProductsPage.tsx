import { Search } from 'lucide-react';
import { useEffect } from 'react';
import { useSearchParams } from 'react-router';
import { Pagination } from '@/components/ui/Pagination';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { ProductCard } from '../components/ProductCard';
import { useProducts } from '../hooks/useProducts';

export function ProductsPage() {
  const [params, setParams] = useSearchParams();
  const search = (params.get('q') ?? '').slice(0, 120);
  const numericPage = Number(params.get('page') ?? 1);
  const page = Number.isInteger(numericPage) && numericPage >= 1 && numericPage <= 1_000_000 ? numericPage : 1;
  const debouncedSearch = useDebouncedValue(search.trim().toLocaleLowerCase('es'));
  const waitingForSearch = search.trim().toLocaleLowerCase('es') !== debouncedSearch;
  const { data, isPending, isError, error, isFetching, isPlaceholderData, refetch } = useProducts(page, debouncedSearch);
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / 12));
  const displayedPage = data?.page ?? page;
  const products = data?.items ?? [];
  const updating = waitingForSearch || isFetching || isPlaceholderData;
  const first = total === 0 ? 0 : (displayedPage - 1) * 12 + 1;
  const last = total === 0 ? 0 : first + products.length - 1;

  useEffect(() => {
    if (data && !isPlaceholderData && !waitingForSearch && data.page !== page) {
      setParams(current => {
        const next = new URLSearchParams(current);
        if (data.page === 1) next.delete('page');
        else next.set('page', String(data.page));
        return next;
      }, { replace: true });
    }
  }, [data, isPlaceholderData, waitingForSearch, page, setParams]);

  function changeSearch(value: string) {
    setParams(current => {
      const next = new URLSearchParams(current);
      if (value) next.set('q', value);
      else next.delete('q');
      next.delete('page');
      return next;
    }, { replace: true });
  }

  function changePage(nextPage: number) {
    setParams(current => {
      const next = new URLSearchParams(current);
      if (nextPage === 1) next.delete('page');
      else next.set('page', String(nextPage));
      return next;
    });
    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  return (
    <section aria-labelledby="products-title" className="px-5 py-6 sm:px-8">
      <header><h1 id="products-title" className="font-arma-heading text-4xl tracking-[-0.035em]">Productos</h1><p className="mt-2 text-sm text-arma-muted">Productos terminados</p></header>
      <div className="mt-6">
        <label htmlFor="products-search" className="sr-only">Buscar por diseño, SKU, talla o color</label>
        <div className="flex max-w-xl items-center gap-3 rounded-arma border border-arma-border bg-arma-surface px-4 focus-within:ring-2 focus-within:ring-arma-primary">
          <Search size={20} strokeWidth={1.7} aria-hidden="true" className="shrink-0 text-arma-icon" />
          <input id="products-search" type="search" maxLength={120} value={search} onChange={event => changeSearch(event.target.value)} placeholder="Buscar diseño, talla o color…" className="min-h-12 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-arma-muted" />
        </div>
      </div>
      {isError ? <div role="alert" className="mt-6 rounded-arma border border-arma-red/25 bg-arma-red-soft p-4 text-arma-red"><p className="text-sm font-medium">{error instanceof Error ? error.message : 'No pudimos actualizar el catálogo.'}</p><button type="button" disabled={isFetching} onClick={() => void refetch()} className="mt-3 min-h-11 rounded-arma border border-current px-4 text-sm font-medium disabled:opacity-60">{isFetching ? 'Reintentando…' : 'Reintentar'}</button></div> : null}
      {isPending ? (
        <div role="status" aria-label="Cargando productos" className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 12 }, (_, index) => <div key={index} aria-hidden="true" className="overflow-hidden rounded-arma border border-arma-border bg-arma-surface"><div className="aspect-[4/5] bg-arma-primary-soft" /><div className="space-y-3 p-5"><div className="h-5 w-2/3 bg-arma-background" /><div className="h-4 w-1/2 bg-arma-background" /></div></div>)}
        </div>
      ) : (
        <>
          <div className="mt-6 flex min-h-5 flex-wrap items-center justify-between gap-2 text-sm text-arma-muted"><p>{total === 0 ? '0 diseños' : `Mostrando ${first}–${last} de ${total} ${total === 1 ? 'diseño' : 'diseños'}`}</p><p role="status" aria-live="polite">{updating ? 'Actualizando listado…' : ''}</p></div>
          <div aria-busy={updating} className="mt-3 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {products.map((product, index) => <ProductCard key={product.id} product={product} priority={index === 0} />)}
          </div>
          {!isError && products.length === 0 && !updating ? <p className="mt-8 text-sm text-arma-muted">{search.trim() ? 'No encontramos productos con esa búsqueda.' : 'Todavía no hay productos disponibles en el catálogo.'}</p> : null}
          {!isError ? <Pagination page={displayedPage} totalPages={totalPages} disabled={updating} onPageChange={changePage} /> : null}
        </>
      )}
    </section>
  );
}
