import { ImageOff } from 'lucide-react';
import { useState } from 'react';

import type { StockProduct } from '../schemas/stock.schema';

interface StockProductCardProps {
    product: StockProduct;
}

function formatPrice(amount: number, currency: string) {
    return new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency,
    }).format(amount);
}

export function StockProductCard({
    product,
}: StockProductCardProps) {
    const [failedImage, setFailedImage] = useState<string | null>(null);

    const showImage =
        product.coverUrl !== null &&
        failedImage !== product.coverUrl;

    return (
        <article className="overflow-hidden rounded-arma border border-arma-border bg-arma-surface">
            <div className="aspect-[4/5] bg-arma-background">
                {showImage ? (
                    <img
                        src={product.coverUrl ?? undefined}
                        alt={product.coverAlt}
                        loading="lazy"
                        decoding="async"
                        onError={() => setFailedImage(product.coverUrl)}
                        className="h-full w-full object-contain"
                    />
                ) : (
                    <div className="flex h-full flex-col items-center justify-center gap-3 text-arma-muted">
                        <ImageOff size={30} strokeWidth={1.5} aria-hidden="true" />
                        <span className="text-sm">Imagen no disponible</span>
                    </div>
                )}
            </div>

            <div className="p-4 sm:p-5">
                <h2 className="text-lg font-semibold tracking-tight">
                    {product.name}
                </h2>

                {product.isDemo ? (
                    <p className="mt-1 text-xs text-arma-gold">
                        Datos de ejemplo
                    </p>
                ) : null}

                <ul className="mt-4 divide-y divide-arma-border">
                    {product.variants.map((variant) => {
                        const available = variant.inventory_balances.reduce(
                            (total, balance) =>
                                total + balance.available_quantity,
                            0,
                        );

                        return (
                            <li
                                key={variant.id}
                                className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0"
                            >
                                <div className="min-w-0">
                                    <p className="text-sm">
                                        {variant.color} · {variant.size}
                                    </p>

                                    <p className="mt-1 text-sm font-medium">
                                        {formatPrice(
                                            variant.sale_price,
                                            variant.currency,
                                        )}
                                    </p>
                                </div>

                                <p
                                    className={`shrink-0 text-sm font-medium tabular-nums ${available > 0
                                            ? 'text-arma-green'
                                            : 'text-arma-red'
                                        }`}
                                >
                                    {available} disponibles
                                </p>
                            </li>
                        );
                    })}
                </ul>

                {product.variants.length === 0 ? (
                    <p className="mt-4 text-sm text-arma-muted">
                        Sin variantes activas.
                    </p>
                ) : null}
            </div>
        </article>
    );
}