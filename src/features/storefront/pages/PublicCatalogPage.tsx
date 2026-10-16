import { CatalogImageGate } from "../components/CatalogImageGate";
import { CollectionLoader } from "../components/CollectionLoader";
import { ShareCatalogLink } from "../components/ShareCatalogLink";
import { Search, X } from "lucide-react";
import { useSearchParams } from "react-router";
import { Pagination } from "@/components/ui/Pagination";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useStorefront } from "../hooks/useStorefront";
import { PublicProductCard } from "../components/PublicProductCard";
import { StorefrontFeedback } from "../components/StorefrontFeedback";

const fieldClass =
  "min-h-12 w-full rounded-arma border border-arma-text/20 bg-arma-surface px-3 text-base sm:text-sm placeholder:text-arma-neutral";
export function PublicCatalogPage() {
  const [params, setParams] = useSearchParams();
  const search = params.get("buscar")?.slice(0, 120) ?? "";
  const size = params.get("talla") ?? "";
  const color = params.get("color") ?? "";
  const requestedPage = Number(params.get("pagina"));
  const page =
    Number.isSafeInteger(requestedPage) && requestedPage > 0
      ? Math.min(requestedPage, 100000)
      : 1;
  const debounced = useDebouncedValue(search, 300);
  const query = useStorefront({ page, search: debounced, size, color });
  function change(key: string, value: string, replace = false) {
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (value) next.set(key, value);
        else next.delete(key);
        if (key !== "pagina") next.delete("pagina");
        return next;
      },
      { replace },
    );
  }
  return (
    <div className="mx-auto max-w-[1536px] px-5 pt-10 sm:px-8 sm:pt-14 lg:px-12">
      <title>Catálogo completo · ARMA</title>
      <meta
        name="description"
        content="Consulta el catálogo completo de playeras ARMA. Busca por diseño y explora tallas, colores, fotografías y precios."
      />
      <header className="grid items-end gap-4 border-b border-arma-text/20 pb-7 sm:grid-cols-[1fr_auto]">
        <div>
          <h1 className="font-arma-display text-6xl font-semibold uppercase leading-none tracking-[-0.02em] sm:text-7xl">
            Elige la tuya.
          </h1>
          <p className="mt-3 text-sm leading-6 text-arma-neutral">
            Todos los modelos, sin perder de vista los detalles.
          </p>
        </div>
        <p className="text-sm text-arma-neutral" aria-live="polite">
          {query.data
            ? `${query.data.total} ${query.data.total === 1 ? "modelo" : "modelos"}`
            : "Catálogo completo"}
        </p>
      </header>
      <div className="mt-4">
        <ShareCatalogLink title="Catálogo completo · ARMA" />
      </div>
      <form
        role="search"
        aria-label="Buscar en el catálogo"
        onSubmit={(event) => event.preventDefault()}
        className="grid items-end gap-4 py-7 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_auto]"
      >
        <label className="block">
          <span className="mb-2 block text-xs font-semibold">
            Busca tu diseño
          </span>
          <span className="relative block">
            <Search
              size={19}
              aria-hidden="true"
              className="pointer-events-none absolute top-3.5 left-3 text-arma-neutral"
            />
            <input
              type="search"
              value={search}
              maxLength={120}
              onChange={(event) => change("buscar", event.target.value, true)}
              placeholder="Nombre o descripción del modelo"
              className={`${fieldClass} pl-10`}
            />
          </span>
        </label>
        <label className="block">
          <span className="mb-2 block text-xs font-semibold">Talla</span>
          <select
            aria-label="Talla"
            value={size}
            onChange={(event) => change("talla", event.target.value)}
            className={fieldClass}
          >
            <option value="">Todas las tallas</option>
            {[
              ...new Set([
                ...(query.data?.sizes ?? []),
                ...(size ? [size] : []),
              ]),
            ].map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-2 block text-xs font-semibold">Color</span>
          <select
            aria-label="Color"
            value={color}
            onChange={(event) => change("color", event.target.value)}
            className={fieldClass}
          >
            <option value="">Todos los colores</option>
            {[
              ...new Set([
                ...(query.data?.colors ?? []),
                ...(color ? [color] : []),
              ]),
            ].map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
        {search || size || color ? (
          <button
            type="button"
            onClick={() => setParams({})}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-arma px-3 text-sm underline underline-offset-4"
          >
            <X size={17} aria-hidden="true" />
            Limpiar filtros
          </button>
        ) : null}
      </form>
      <div aria-busy={query.isFetching || search !== debounced}>
        {query.isPending ? (
          <CollectionLoader />
        ) : query.isError ? (
          <StorefrontFeedback error onRetry={() => void query.refetch()} />
        ) : !query.data.total ? (
          <StorefrontFeedback />
        ) : (
          <>
            <CatalogImageGate products={query.data.items}>
              {(products) => (
                <div className="grid gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {products.map((product, index) => (
                    <PublicProductCard
                      key={product.id}
                      product={product}
                      eager={index < 4}
                    />
                  ))}
                </div>
              )}
            </CatalogImageGate>
            {query.data.total > 12 ? (
              <Pagination
                page={query.data.page}
                totalPages={Math.ceil(query.data.total / 12)}
                disabled={query.isFetching}
                onPageChange={(value) => {
                  change("pagina", String(value));
                  document
                    .getElementById("contenido-publico")
                    ?.scrollIntoView();
                }}
              />
            ) : null}
          </>
        )}
      </div>
      <p className="mt-10 border-t border-arma-text/20 pt-5 text-xs leading-6 text-arma-neutral">
        Precios en la moneda indicada. Las tallas y colores corresponden al
        modelo; confirma disponibilidad con la persona que te compartió el
        catálogo. Aquí puedes explorar productos, sin realizar compras ni pagos.
      </p>
    </div>
  );
}
