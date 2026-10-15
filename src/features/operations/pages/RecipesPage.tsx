import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import { BookOpen, ArrowUpRight, ClipboardList } from "lucide-react";
import { ProductImage } from "@/features/products/components/ProductImage";
import { useAppAccess } from "@/features/access/hooks/useAppAccess";
import { Pagination } from "@/components/ui/Pagination";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import {
  fieldClass,
  secondaryButton,
} from "@/features/commerce/utils/commerce-format";
import { useRecipesPage } from "../hooks/useOperations";
import type { VariantOption } from "../schemas/operations.schema";
import { RecipeModal } from "../components/RecipeModal";
export function RecipesPage() {
  const access = useAppAccess();
  const [params] = useSearchParams();
  const [state, setState] = useState(
    params.get("state") === "missing" ? "missing" : "all",
  );
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const query = useRecipesPage(state, page, useDebouncedValue(search.trim()));
  const [editing, setEditing] = useState<VariantOption | null>(null);
  return (
    <section className="px-5 py-6 sm:px-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-arma-heading text-4xl tracking-[-0.035em]">
            Recetas de productos
          </h1>
          <p className="mt-2 max-w-prose text-sm leading-6 text-arma-muted">
            Define los insumos y costos de cada talla y color. Una receta
            guardada queda disponible para iniciar un armado.
          </p>
        </div>
        <Link
          to="/production"
          className={`${secondaryButton} inline-flex items-center gap-2`}
        >
          <ClipboardList size={18} strokeWidth={1.6} />
          Ver tablero de armado
        </Link>
      </header>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-arma border border-arma-green/20 bg-arma-green-soft p-4 text-sm text-arma-green">
        <p className="inline-flex items-center gap-2">
          <BookOpen size={19} strokeWidth={1.6} />
          <strong>{query.data?.ready ?? 0}</strong> recetas configuradas
        </p>
        <p>
          <strong>{query.data?.missing ?? 0}</strong> variantes pendientes de
          receta
        </p>
      </div>
      <div className="mt-5 flex flex-wrap items-end gap-4">
        <div className="min-w-0 flex-1 basis-64">
          <label
            htmlFor="recipe-search"
            className="mb-2 block text-sm font-medium"
          >
            Buscar producto, talla, color o SKU
          </label>
          <input
            id="recipe-search"
            type="search"
            maxLength={120}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className={fieldClass}
          />
        </div>
        <div>
          <label
            htmlFor="recipe-state"
            className="mb-2 block text-sm font-medium"
          >
            Estado de la receta
          </label>
          <select
            id="recipe-state"
            value={state}
            onChange={(e) => {
              setState(e.target.value);
              setPage(1);
            }}
            className={fieldClass}
          >
            <option value="all">Todas</option>
            <option value="ready">Configuradas</option>
            <option value="missing">Pendientes de configurar</option>
          </select>
        </div>
      </div>
      {query.isPending ? (
        <p role="status" className="mt-6 text-sm">
          Cargando recetas…
        </p>
      ) : query.isError || !query.data ? (
        <div role="alert" className="mt-6">
          <p>No pudimos cargar las recetas.</p>
          <button
            className={secondaryButton}
            onClick={() => void query.refetch()}
          >
            Reintentar
          </button>
        </div>
      ) : (
        <>
          <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {query.data.items.map((item) => (
              <article
                key={item.id}
                className="flex min-w-0 flex-col overflow-hidden rounded-arma border border-arma-border bg-arma-surface"
              >
                <div className="h-44 border-b border-arma-border">
                  <ProductImage
                    src={item.photo_url ?? null}
                    background={item.photo?.background}
                    alt={item.label}
                    className="h-full w-full object-contain p-2"
                  />
                </div>
                <div className="flex flex-1 flex-col p-4">
                  <span
                    className={`self-start rounded-arma px-2 py-1 text-xs font-semibold ${item.configured ? "bg-arma-green-soft text-arma-green" : "bg-arma-warning-soft text-arma-warning"}`}
                  >
                    {item.configured
                      ? "Receta configurada"
                      : "Falta configurar"}
                  </span>
                  <h2 className="mt-3 break-words text-base font-semibold">
                    {item.label}
                  </h2>
                  <p className="mt-2 text-sm text-arma-muted">
                    {item.configured
                      ? `${item.inputs} insumos definidos`
                      : "Agrega la playera, los DTF y sus costos."}
                  </p>
                  <div className="mt-auto flex flex-wrap gap-2 pt-5">
                    {access.can("production.recipes") &&
                    access.can("materials.read") ? (
                      <button
                        type="button"
                        onClick={() => setEditing(item)}
                        className={secondaryButton}
                      >
                        {item.configured
                          ? "Editar receta"
                          : "Configurar receta"}
                      </button>
                    ) : null}
                    {item.configured ? (
                      <Link
                        to={`/production?variant=${item.id}`}
                        className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-arma-green underline underline-offset-4"
                      >
                        Armar
                        <ArrowUpRight size={16} strokeWidth={1.6} />
                      </Link>
                    ) : null}
                  </div>
                </div>
              </article>
            ))}
          </div>
          {!query.data.items.length ? (
            <p className="mt-6 rounded-arma border border-arma-border bg-arma-surface p-6 text-sm text-arma-muted">
              No hay variantes con estos filtros. Las variantes nuevas se crean
              en Gestión de productos.
            </p>
          ) : null}
          <Pagination
            page={query.data.page}
            totalPages={Math.max(1, Math.ceil(query.data.total / 12))}
            disabled={query.isFetching}
            onPageChange={setPage}
            ariaLabel="Páginas de recetas"
          />
        </>
      )}
      {editing ? (
        <RecipeModal variant={editing} onClose={() => setEditing(null)} />
      ) : null}
    </section>
  );
}
