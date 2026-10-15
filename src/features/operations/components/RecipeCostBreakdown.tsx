import { formatMoney } from "@/features/commerce/utils/commerce-format";
export function RecipeCostBreakdown({
  materials,
  labor,
  electricity,
  tape,
  other,
  margin,
}: {
  materials: number | null;
  labor: number;
  electricity: number;
  tape: number;
  other: number;
  margin: number | null;
}) {
  const total =
    materials === null ? null : materials + labor + electricity + tape + other;
  const suggested =
    total !== null && margin !== null && margin >= 0 && margin < 100
      ? Math.ceil((total / (1 - margin / 100)) * 100) / 100
      : null;
  return (
    <section
      aria-label="Desglose del costo por playera"
      className="rounded-arma border border-arma-green/20 bg-arma-green-soft p-4"
    >
      <h3 className="text-sm font-semibold text-arma-green">
        Costo de producción por playera
      </h3>
      <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-3 text-sm tabular-nums">
        {[
          { label: "Playera y DTF", value: materials },
          { label: "Mano de obra", value: labor },
          { label: "Luz", value: electricity },
          { label: "Cinta y consumibles", value: tape },
          { label: "Otros gastos", value: other },
        ].map((v) => (
          <div key={v.label}>
            <dt className="text-xs text-arma-green">{v.label}</dt>
            <dd className="mt-1 font-medium">
              {v.value === null ? "Faltan costos" : formatMoney(v.value)}
            </dd>
          </div>
        ))}
      </dl>
      <div className="mt-4 flex flex-wrap justify-between gap-4 border-t border-arma-green/20 pt-4">
        <div>
          <p className="text-xs text-arma-green">Costo total de referencia</p>
          <p className="mt-1 text-xl font-semibold tabular-nums">
            {total === null ? "Pendiente" : formatMoney(total)}
          </p>
        </div>
        <div>
          <p className="text-xs text-arma-green">
            Precio sugerido {margin === null ? "" : `· margen ${margin}%`}
          </p>
          <p className="mt-1 text-xl font-semibold text-arma-green tabular-nums">
            {suggested === null ? "Pendiente" : formatMoney(suggested)}
          </p>
        </div>
      </div>
      <p className="mt-3 text-xs leading-5 text-arma-green">
        La sugerencia cubre estos costos y el margen sobre venta. No incluye
        impuestos ni gastos que no hayas agregado.
      </p>
    </section>
  );
}
