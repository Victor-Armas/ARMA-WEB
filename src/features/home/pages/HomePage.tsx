import {
    Banknote,
    Bookmark,
    CreditCard,
    Shirt,
    ShoppingBag,
    TrendingUp,
} from 'lucide-react';

import { SummaryCard } from '@/components/ui/SummaryCard';
import { useCurrentProfile } from '@/features/profile/hooks/useCurrentProfile';

export function HomePage() {
    const { fullName } = useCurrentProfile();
    const greeting = fullName ? `Hola, ${fullName}` : 'Hola';

    return (
        <div>
            <div className="mx-auto w-full px-5 py-3 sm:px-8">

                <section
                    aria-labelledby="home-title"
                >

                    <h1
                        id="home-title"
                        className="font-arma-heading font-normal tracking-[-0.035em] mt-2 text-4xl sm:text-3xl"
                    >

                        {greeting}
                    </h1>


                    <div className="mt-7 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                        <SummaryCard
                            label="Disponibles"
                            value={null}
                            icon={Shirt}
                            tone="green"
                        />

                        <SummaryCard
                            label="Apartadas"
                            value={null}
                            icon={Bookmark}
                            tone="gold"
                        />

                        <SummaryCard
                            label="Vendidas"
                            value={null}
                            icon={ShoppingBag}
                            tone="neutral"
                        />

                        <SummaryCard
                            label="Pendientes de pago"
                            value={null}
                            icon={CreditCard}
                            tone="red"
                        />
                    </div>
                </section>

                <section
                    aria-labelledby="financial-title"
                    className="mt-9 sm:mt-11"
                >
                    <h2
                        id="financial-title"
                        className="text-lg font-semibold tracking-tight"
                    >
                        Resumen del mes
                    </h2>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2 sm:gap-4">
                        <SummaryCard
                            label="Ventas del mes"
                            value={null}
                            icon={Banknote}
                            tone="gold"
                        />

                        <SummaryCard
                            label="Ganancia del mes"
                            value={null}
                            icon={TrendingUp}
                            tone="green"
                        />
                    </div>
                </section>

                <section
                    aria-labelledby="activity-title"
                    className="mt-9 sm:mt-11"
                >
                    <h2
                        id="activity-title"
                        className="text-lg font-semibold tracking-tight"
                    >
                        Movimientos recientes
                    </h2>

                    <div className="mt-4 border-t border-arma-border py-6">
                        <p className="text-sm text-arma-muted">
                            Aquí aparecerán las ventas y los apartados cuando
                            conectemos esta pantalla.
                        </p>
                    </div>
                </section>
            </div>
        </div>
    );
}