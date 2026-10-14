import { Toaster } from 'sonner';

import { useIsDesktop } from '@/hooks/useIsDesktop';

export function AppToaster() {
    const isDesktop = useIsDesktop();

    const offsets = {
        top: 'max(1rem, env(safe-area-inset-top))',
        left: '1rem',
        right: '1rem',
    };

    return (
        <Toaster
            position={isDesktop ? 'top-right' : 'top-center'}
            offset={offsets}
            mobileOffset={offsets}
            visibleToasts={3}
            gap={12}
            expand
            containerAriaLabel="Notificaciones de ARMA"
            toastOptions={{ unstyled: true }}
        />
    );
}