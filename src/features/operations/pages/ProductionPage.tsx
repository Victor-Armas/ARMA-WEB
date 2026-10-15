import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import { BookOpen, Plus, Hammer } from "lucide-react";
import { useAppAccess } from "@/features/access/hooks/useAppAccess";
import { Pagination } from "@/components/ui/Pagination";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import {
  fieldClass,
  primaryButton,
  secondaryButton,
} from "@/features/commerce/utils/commerce-format";
import { useProductionBoard, useRecipesPage } from "../hooks/useOperations";
import type {
  ProductionOrder,
  ProductionStatus,
} from "../schemas/operations.schema";
import { NewAssemblyModal } from "../components/NewAssemblyModal";
import { ProductionCloseModal } from "../components/ProductionCloseModal";
import { ProductionOrderCard } from "../components/ProductionOrderCard";
export function ProductionPage() {
  const access = useAppAccess();
  const [params, setParams] = useSearchParams();
  const initialId = params.get("variant") ?? undefined;
  const [start, setStart] = useState(Boolean(initialId));
  const [status, setStatus] = useState<ProductionStatus>("draft");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const board = useProductionBoard(
    status,
    page,
    useDebouncedValue(search.trim()),
  );
  const recipes = useRecipesPage("ready", 1, "");
  const [close, setClose] = useState<{
    order: ProductionOrder;
    cancel: boolean;
  } | null>(null);
  const tabs = [
    { value: "draft", label: "En proceso" },
    { value: "completed", label: "Terminados" },
    { value: "cancelled", label: "Cancelados" },
  ] as const;
  return (
    <section className="px-5 py-6 sm:px-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-arma-heading text-4xl tracking-[-0.035em]">
            Armado de productos
          </h1>
          <p className="mt-2 max-w-prose text-sm leading-6 text-arma-muted">
            Tu tablero de producción: insumos reservados, cantidades por
            terminar y órdenes listas. Inicia armados a partir de recetas
            configuradas.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            to="/recipes"
            className={`${secondaryButton} inline-flex items-center gap-2`}
          >
            <BookOpen size={18} strokeWidth={1.6} />
            Recetas
          </Link>
          {access.can("production.create") ? (
            <button
              type="button"
              className={`${primaryButton} inline-flex items-center gap-2`}
              onClick={() => setStart(true)}
            >
              <Plus size={18} />
              Nuevo armado
            </button>
          ) : null}
        </div>
      </header>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-arma border border-arma-info/20 bg-arma-info-soft p-4 text-sm text-arma-info">
        <p className="inline-flex items-center gap-2">
          <Hammer size={19} strokeWidth={1.6} />
          <strong>{recipes.data?.ready ?? 0}</strong> recetas disponibles para
          armar
        </p>
        <Link
          to="/recipes?state=missing"
          className="inline-flex min-h-11 items-center underline underline-offset-4"
        >
          {recipes.data?.missing ?? 0} variantes pendientes de receta
        </Link>
      </div>
      <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
        <div
          role="tablist"
          aria-label="Estado de órdenes de armado"
          className="flex max-w-full flex-wrap gap-2"
        >
          {tabs.map((tab) => (
            <button
              type="button"
              role="tab"
              aria-selected={status === tab.value}
              key={tab.value}
              onClick={() => {
                setStatus(tab.value);
                setPage(1);
              }}
              className={`${secondaryButton} inline-flex items-center gap-2 ${status === tab.value ? "border-arma-info bg-arma-info-soft font-semibold text-arma-info" : ""}`}
            >
              {tab.label}
              <span className="rounded-arma bg-arma-neutral-soft px-1.5 py-0.5 text-xs text-arma-neutral tabular-nums">
                {board.data?.counts[tab.value] ?? 0}
              </span>
            </button>
          ))}
        </div>
        <div className="w-full sm:max-w-sm">
          <label
            htmlFor="board-search"
            className="mb-2 block text-xs font-medium"
          >
            Buscar producto, SKU o folio de armado
          </label>
          <input
            id="board-search"
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
      </div>
      {board.isPending ? (
        <p role="status" className="mt-6 text-sm">
          Cargando tablero…
        </p>
      ) : board.isError || !board.data ? (
        <div role="alert" className="mt-6">
          <p>No pudimos cargar las órdenes.</p>
          <button
            type="button"
            className={secondaryButton}
            onClick={() => void board.refetch()}
          >
            Reintentar
          </button>
        </div>
      ) : (
        <>
          <div
            role="tabpanel"
            aria-label={tabs.find((t) => t.value === status)?.label}
            className="mt-6 grid items-start gap-5 lg:grid-cols-2 2xl:grid-cols-3"
          >
            {board.data.items.map((order) => (
              <ProductionOrderCard
                key={order.id}
                order={order}
                onClose={(cancel) => setClose({ order, cancel })}
              />
            ))}
          </div>
          {!board.data.items.length ? (
            <div className="mt-5 rounded-arma border border-arma-border bg-arma-surface p-8">
              <h2 className="font-arma-heading text-2xl">
                {status === "draft"
                  ? "No hay armados en proceso"
                  : status === "completed"
                    ? "Todavía no hay armados terminados"
                    : "No hay armados cancelados"}
              </h2>
              <p className="mt-3 max-w-prose text-sm leading-6 text-arma-muted">
                {status === "draft"
                  ? "Elige una receta y comienza un nuevo armado. Aquí verás las fotos de la prenda y los insumos reservados."
                  : "Las órdenes de este estado aparecerán aquí sin mezclarse con la producción activa."}
              </p>
            </div>
          ) : null}
          <Pagination
            page={board.data.page}
            totalPages={Math.max(1, Math.ceil(board.data.total / 12))}
            disabled={board.isFetching}
            onPageChange={setPage}
            ariaLabel="Páginas de armado"
          />
        </>
      )}
      {start && access.can("production.create") ? (
        <NewAssemblyModal
          initialId={initialId}
          onClose={() => {
            setStart(false);
            if (initialId) {
              params.delete("variant");
              setParams(params, { replace: true });
            }
          }}
        />
      ) : null}
      {close ? (
        <ProductionCloseModal {...close} onClose={() => setClose(null)} />
      ) : null}
    </section>
  );
}
