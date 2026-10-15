import { MaterialEntriesModal } from "@/features/operations/components/MaterialEntriesModal";
import { useState } from "react";
import { useAppAccess } from "@/features/access/hooks/useAppAccess";
import { useAuthStore } from "@/features/auth/stores/auth.store";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { Pagination } from "@/components/ui/Pagination";
import {
  fieldClass,
  primaryButton,
  secondaryButton,
} from "@/features/commerce/utils/commerce-format";
import { CatalogRecord } from "../components/CatalogRecord";
import { CatalogFormModal } from "../components/CatalogFormModal";
import { CatalogVisibilityModal } from "../components/CatalogVisibilityModal";
import { useCatalog } from "../hooks/useCatalog";
import type { CatalogItem, CatalogKind } from "../schemas/catalog.schema";
export function CatalogManagementPage({ kind }: { kind: CatalogKind }) {
  const [page, setPage] = useState(1);
  const [entriesOpen, setEntriesOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [state, setState] = useState("active");
  const [form, setForm] = useState<CatalogItem | "new" | null>(null);
  const [visibility, setVisibility] = useState<CatalogItem | null>(null);
  const debounced = useDebouncedValue(search.trim());
  const access = useAppAccess();
  const ownId = useAuthStore((value) => value.session?.user.id);
  const catalog = useCatalog(kind, page, debounced, state, type);
  const product = kind === "product";
  const prefix = product ? "products" : "materials";
  const updating =
    catalog.isFetching ||
    catalog.isPlaceholderData ||
    debounced !== search.trim();
  return (
    <section className="px-5 py-6 sm:px-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-arma-heading text-4xl tracking-[-0.035em]">
            {product ? "Gestión de productos" : "Materia prima"}
          </h1>
          <p className="mt-2 max-w-prose text-sm leading-6 text-arma-muted">
            {product
              ? "Administra diseños, variantes, precios y fotografías. Oculta los productos que ya no quieres ofrecer."
              : "Playeras sin imprimir y transferencias DTF. Consulta sus variantes y administra los insumos de tu taller."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {!product ? (
            <button
              type="button"
              onClick={() => setEntriesOpen(true)}
              className={secondaryButton}
            >
              {access.can("materials.receive")
                ? "Registrar entrada"
                : "Historial de entradas"}
            </button>
          ) : null}
          {access.can(`${prefix}.create`) ? (
            <button
              type="button"
              onClick={() => setForm("new")}
              className={primaryButton}
            >
              {product ? "Crear producto" : "Crear insumo"}
            </button>
          ) : null}
        </div>
      </header>
      <div className="mt-6 flex flex-wrap items-end gap-4">
        <div className="w-full sm:max-w-xl sm:flex-1">
          <label
            htmlFor="catalog-search"
            className="mb-2 block text-sm font-medium"
          >
            Buscar por nombre, código o SKU
          </label>
          <input
            id="catalog-search"
            type="search"
            maxLength={120}
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            className={fieldClass}
          />
        </div>
        {!product ? (
          <div>
            <label
              htmlFor="catalog-type-filter"
              className="mb-2 block text-sm font-medium"
            >
              Tipo de insumo
            </label>
            <select
              id="catalog-type-filter"
              value={type}
              onChange={(event) => {
                setType(event.target.value);
                setPage(1);
              }}
              className={fieldClass}
            >
              <option value="">Todos</option>
              <option value="blank_shirt">Playeras sin imprimir</option>
              <option value="dtf_transfer">DTF</option>
            </select>
          </div>
        ) : null}
        <div>
          <label
            htmlFor="catalog-state"
            className="mb-2 block text-sm font-medium"
          >
            Mostrar
          </label>
          <select
            id="catalog-state"
            value={state}
            onChange={(event) => {
              setState(event.target.value);
              setPage(1);
            }}
            className={fieldClass}
          >
            <option value="active">Activos</option>
            <option value="hidden">Ocultos</option>
            <option value="all">Todos</option>
          </select>
        </div>
      </div>
      <div className="mt-6 flex flex-wrap justify-between gap-3 text-sm text-arma-muted">
        <p>
          {catalog.data?.total ?? 0} {product ? "productos" : "insumos"}
        </p>
        <p role="status">{updating ? "Actualizando…" : ""}</p>
      </div>
      {catalog.isPending ? (
        <p role="status" className="mt-6 text-sm text-arma-muted">
          Cargando registros…
        </p>
      ) : catalog.isError ? (
        <div role="alert" className="mt-6">
          <p>No pudimos cargar los registros.</p>
          <button
            type="button"
            onClick={() => void catalog.refetch()}
            className={`${secondaryButton} mt-3`}
          >
            Reintentar
          </button>
        </div>
      ) : !catalog.data?.items.length ? (
        <p className="mt-8 text-sm text-arma-muted">
          No hay registros con estos filtros.
        </p>
      ) : (
        <div
          aria-busy={updating}
          className={
            product
              ? "mt-4 space-y-5"
              : "mt-4 grid grid-cols-1 items-start gap-5 sm:grid-cols-2 xl:grid-cols-3"
          }
        >
          {catalog.data.items.map((item) => (
            <CatalogRecord
              key={item.id}
              item={item}
              gallery={item.gallery}
              canEdit={access.can(`${prefix}.edit`)}
              canHide={access.can(`${prefix}.hide`)}
              canPhoto={
                access.can(`${prefix}.edit`) ||
                (access.can(`${prefix}.create`) && item.created_by === ownId)
              }
              onEdit={() => setForm(item)}
              onVisibility={() => setVisibility(item)}
            />
          ))}
        </div>
      )}
      {!catalog.isPending && !catalog.isError ? (
        <Pagination
          page={catalog.data?.page ?? page}
          totalPages={Math.max(1, Math.ceil((catalog.data?.total ?? 0) / 12))}
          disabled={updating}
          ariaLabel={`Páginas de ${product ? "gestión de productos" : "materia prima"}`}
          onPageChange={(next) => {
            setPage(next);
            window.scrollTo({ top: 0, behavior: "auto" });
          }}
        />
      ) : null}
      {!product && entriesOpen ? (
        <MaterialEntriesModal onClose={() => setEntriesOpen(false)} />
      ) : null}
      {form ? (
        <CatalogFormModal
          kind={kind}
          item={form === "new" ? undefined : form}
          onClose={() => setForm(null)}
        />
      ) : null}
      {visibility ? (
        <CatalogVisibilityModal
          kind={kind}
          item={visibility}
          onClose={() => setVisibility(null)}
        />
      ) : null}
    </section>
  );
}
