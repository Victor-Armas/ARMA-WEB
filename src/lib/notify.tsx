import { toast } from 'sonner';

import { NotificationCard } from '@/components/ui/NotificationCard';
import type {
    NotificationId,
    NotificationKind,
    NotificationOptions,
} from '@/types/notification.types';

function showNotification(
    kind: NotificationKind,
    title: string,
    options: NotificationOptions = {},
): NotificationId {
    return toast.custom(
        (id) => (
            <NotificationCard
                kind={kind}
                title={title}
                description={options.description}
                onClose={() => toast.dismiss(id)}
            />
        ),
        {
            id: options.id,
            duration:
                kind === 'loading'
                    ? Infinity
                    : options.duration ?? (kind === 'error' ? 7_000 : 4_500),
            dismissible: kind !== 'loading',
        },
    );
}

export const notify = {
    success: (title: string, options?: NotificationOptions) =>
        showNotification('success', title, options),

    error: (title: string, options?: NotificationOptions) =>
        showNotification('error', title, options),

    info: (title: string, options?: NotificationOptions) =>
        showNotification('info', title, options),

    loading: (title: string, options?: NotificationOptions) =>
        showNotification('loading', title, options),

    dismiss: (id: NotificationId) => toast.dismiss(id),
};