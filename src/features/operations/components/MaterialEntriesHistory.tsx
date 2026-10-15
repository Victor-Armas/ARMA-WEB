import { useState } from "react";
import { Pagination } from "@/components/ui/Pagination";
import {
  secondaryButton,
  formatMoney,
  formatDateTime,
} from "@/features/commerce/utils/commerce-format";
import { useWorkshopHistory } from "../hooks/useOperations";
import { receiptPageSchema } from "../schemas/operations.schema";
export function MaterialEntriesHistory() {
  const [page, setPage] = useState(1);
  const query = useWorkshopHistory("receipts", page);
  const parsed = receiptPageSchema.safeParse(query.data);
  return (
    <section aria-label="Historial de entradas">
      {query.isPending ? (
        <p role="status" className="mt-5 text-sm">
          Cargando entradas…
        </p>
      ) : query.isError || !parsed.success ? (
        <div role="alert" className="mt-5">
          <p>No pudimos cargar las entradas.</p>
          <button
            onClick={() => void query.refetch()}
            className={secondaryButton}
          >
            Reintentar
          </button>
        </div>
      ) : (
        <>
          <div className="mt-4 divide-y divide-arma-border border-y border-arma-border">
            {!parsed.data.items.length ? (
              <p className="py-7 text-sm text-arma-muted">
                Las nuevas entradas aparecerán aquí con su costo y referencia.
              </p>
            ) : (
              parsed.data.items.map((r) => (
                <article key={r.id} className="py-5">
                  <p className="break-words text-sm font-semibold">{r.label}</p>
                  <p className="mt-1 text-xs text-arma-muted">
                    {formatDateTime(r.created_at)}
                  </p>
                  <div className="mt-3 flex flex-wrap justify-between gap-3 text-sm tabular-nums">
                    <p>
                      {r.quantity} piezas × {formatMoney(r.unit_cost)}
                    </p>
                    <p className="font-semibold">
                      {formatMoney(r.quantity * r.unit_cost)}
                    </p>
                  </div>
                  {r.supplier || r.reference ? (
                    <p className="mt-2 break-words text-xs text-arma-muted">
                      {r.supplier}
                      {r.reference ? ` · ${r.reference}` : ""}
                    </p>
                  ) : null}
                </article>
              ))
            )}
          </div>
          <Pagination
            page={page}
            totalPages={Math.max(1, Math.ceil(parsed.data.total / 20))}
            disabled={query.isFetching}
            onPageChange={setPage}
            ariaLabel="Páginas de entradas"
          />
        </>
      )}
    </section>
  );
}
