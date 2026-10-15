import { Link } from "react-router";
import { MaterialEntriesContent } from "../components/MaterialEntriesContent";
export function MaterialEntriesPage() {
  return (
    <section className="px-5 py-6 sm:px-8">
      <h1 className="font-arma-heading text-4xl tracking-[-0.035em]">
        Entradas de materia prima
      </h1>
      <Link
        to="/materials"
        className="mt-3 inline-block text-sm text-arma-active underline underline-offset-4"
      >
        Volver a materia prima
      </Link>
      <div className="mt-7 max-w-3xl">
        <MaterialEntriesContent />
      </div>
    </section>
  );
}
