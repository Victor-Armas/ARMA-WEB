import { Search } from 'lucide-react';
import { useState } from 'react';

import { ProductCard } from '../components/ProductCard';
import { useProducts } from '../hooks/useProducts';

export function ProductsPage() {
    const [search, setSearch] = useState('');

    const {
        data: products = [],
        isPending,
        isError,
        error,
        isFetching,
        refetch,
    } = useProducts();

    const term = search.trim().toLocaleLowerCase('es');

    const filteredProducts = products.filter((product) => {
        const fields = [
            product.name,
            product.code,
            ...product.variants.flatMap((variant) => [
                variant.sku,
                variant.color,
                variant.size,
            ]),
        ];

        return fields.some((field) =>
            field.toLocaleLowerCase('es').includes(term),
        );
    });

    return (
        <section
            aria-labelledby="products-title"
            className="px-5 py-6 sm:px-8"
        >
            <header>
                <h1
                    id="products-title"
                    className="font-arma-heading text-4xl tracking-[-0.035em]"
                >
                    Productos
                </h1>

                <p className="mt-2 text-sm text-arma-muted">
                    Productos terminados
                </p>
            </header>

            <div className="mt-6">
                <label htmlFor="products-search" className="sr-only">
                    Buscar por diseño, SKU, talla o color
                </label>

                <div className="flex max-w-xl items-center gap-3 rounded-arma border border-arma-border bg-arma-surface px-4 focus-within:ring-2 focus-within:ring-arma-primary">
                    <Search
                        size={20}
                        strokeWidth={1.7}
                        aria-hidden="true"
                        className="shrink-0 text-arma-icon"
                    />

                    <input
                        id="products-search"
                        type="search"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Buscar diseño, talla o color…"
                        className="min-h-12 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-arma-muted"
                    />
                </div>
            </div>

            {isError ? (
                <div
                    role="alert"
                    className="mt-6 rounded-arma border border-arma-red/25 bg-arma-red-soft p-4 text-arma-red"
                >
                    <p className="text-sm font-medium">
                        {error instanceof Error
                            ? error.message
                            : 'No pudimos actualizar el catálogo.'}
                    </p>

                    <button
                        type="button"
                        disabled={isFetching}
                        onClick={() => void refetch()}
                        className="mt-3 min-h-11 rounded-arma border border-current px-4 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-60"
                    >
                        {isFetching ? 'Reintentando…' : 'Reintentar'}
                    </button>
                </div>
            ) : null}

            {isPending ? (
                <div
                    role="status"
                    aria-label="Cargando productos"
                    className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4"
                >
                    {[1, 2, 3, 4, 5].map((item) => (
                        <div
                            key={item}
                            aria-hidden="true"
                            className="overflow-hidden rounded-arma border border-arma-border bg-arma-surface"
                        >
                            <div className="aspect-[4/5] bg-arma-primary-soft" />
                            <div className="space-y-3 p-5">
                                <div className="h-5 w-2/3 bg-arma-background" />
                                <div className="h-4 w-1/2 bg-arma-background" />
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <>
                    <p className="mt-6 text-sm text-arma-muted">
                        {filteredProducts.length} diseños
                    </p>

                    <div className="mt-3 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                        {filteredProducts.map((product) => (
                            <ProductCard
                                key={product.id}
                                product={product}
                            />
                        ))}
                    </div>

                    {!isError && filteredProducts.length === 0 ? (
                        <p className="mt-8 text-sm text-arma-muted">
                            {search.trim()
                                ? 'No encontramos productos con esa búsqueda.'
                                : 'Todavía no hay productos disponibles en el catálogo.'}
                        </p>
                    ) : null}
                </>
            )}
        </section>
    );
}