import { useProductScope } from "../hooks/useProductScope";
import { ArrowLeft } from "lucide-react";
import { useEffect } from "react";
import { Link, useLocation, useParams } from "react-router";
import { useProductDetail } from "../hooks/useProductDetail";
import { ProductDetailContent } from "../components/ProductDetailContent";

export function ProductDetailPage() {
  const { scope } = useProductScope();
  const { productId } = useParams();
  const { search } = useLocation();
  const {
    data: product,
    isValidId,
    isPending,
    isError,
    isFetching,
    refetch,
  } = useProductDetail(productId, scope);
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [productId]);
  return (
    <div className="px-5 py-5 sm:px-8 sm:py-6">
      <Link
        to={`/products${search}`}
        className="mb-6 inline-flex min-h-11 items-center gap-2 rounded-arma text-sm text-arma-icon focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arma-active"
      >
        <ArrowLeft size={19} aria-hidden="true" />
        Volver a Productos
      </Link>
      {!isValidId ? (
        <h1 className="font-arma-heading text-3xl">Producto no encontrado</h1>
      ) : isError && !product ? (
        <div
          role="alert"
          className="rounded-arma border border-arma-red/25 bg-arma-red-soft p-5 text-arma-red"
        >
          <h1 className="text-lg font-semibold">
            No pudimos cargar el producto
          </h1>
          <p className="mt-2 text-sm">
            Comprueba tu conexión y el permiso de consulta.
          </p>
          <button
            type="button"
            disabled={isFetching}
            onClick={() => void refetch()}
            className="mt-4 min-h-11 rounded-arma border border-current px-4 text-sm font-medium disabled:opacity-60"
          >
            {isFetching ? "Reintentando…" : "Reintentar"}
          </button>
        </div>
      ) : isPending ? (
        <div
          role="status"
          aria-label="Cargando producto"
          className="grid gap-8 lg:grid-cols-2"
        >
          <div
            aria-hidden="true"
            className="h-[55dvh] rounded-arma bg-arma-primary-soft"
          />
          <div aria-hidden="true" className="space-y-5">
            <div className="h-10 w-3/4 bg-arma-primary-soft" />
            <div className="h-16 bg-arma-primary-soft" />
            <div className="h-28 bg-arma-primary-soft" />
          </div>
        </div>
      ) : product ? (
        <>
          {isError ? (
            <p role="alert" className="mb-4 text-sm text-arma-red">
              No pudimos actualizar los datos. Se muestra la última información
              disponible.
            </p>
          ) : null}
          <ProductDetailContent
            key={`${product.id}-${scope}`}
            product={product}
            scope={scope}
          />
        </>
      ) : (
        <div>
          <h1 className="font-arma-heading text-3xl">Producto no encontrado</h1>
          <p className="mt-3 text-sm text-arma-muted">
            El producto no está disponible en el catálogo.
          </p>
        </div>
      )}
    </div>
  );
}
