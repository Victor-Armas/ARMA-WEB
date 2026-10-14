import {
    CircleCheck,
    CircleAlert,
    Info,
    LoaderCircle,
    X,
    type LucideIcon,
} from 'lucide-react';

import type { NotificationKind } from '@/types/notification.types';

interface NotificationCardProps {
    kind: NotificationKind;
    title: string;
    description?: string;
    onClose: () => void;
}

const variants: Record<
    NotificationKind,
    { icon: LucideIcon; classes: string }
> = {
    success: {
        icon: CircleCheck,
        classes:
            'border-arma-green/25 bg-arma-green-soft text-arma-green',
    },
    error: {
        icon: CircleAlert,
        classes:
            'border-arma-red/25 bg-arma-red-soft text-arma-red',
    },
    info: {
        icon: Info,
        classes:
            'border-arma-info/25 bg-arma-info-soft text-arma-info',
    },
    loading: {
        icon: LoaderCircle,
        classes:
            'border-arma-gold/25 bg-arma-gold-soft text-arma-gold',
    },
};

export function NotificationCard({
    kind,
    title,
    description,
    onClose,
}: NotificationCardProps) {
    const { icon: Icon, classes } = variants[kind];

    return (
        <div
            className={`flex w-full items-start gap-3 rounded-arma border p-4 shadow-arma-card ${classes}`}
        >
            <Icon
                size={22}
                strokeWidth={1.7}
                aria-hidden="true"
                className={`mt-0.5 shrink-0 ${kind === 'loading'
                        ? 'animate-spin motion-reduce:animate-none'
                        : ''
                    }`}
            />

            <div className="min-w-0 flex-1">
                <p className="break-words text-sm font-semibold leading-5">
                    {title}
                </p>

                {description ? (
                    <p className="mt-1 break-words text-sm leading-5">
                        {description}
                    </p>
                ) : null}
            </div>

            {kind !== 'loading' ? (
                <button
                    type="button"
                    onClick={onClose}
                    aria-label="Cerrar notificación"
                    className="-mt-2 -mr-2 flex size-11 shrink-0 items-center justify-center rounded-arma outline-offset-2 focus-visible:outline-2 focus-visible:outline-current desktop:size-8"
                >
                    <X size={18} strokeWidth={1.7} aria-hidden="true" />
                </button>
            ) : null}
        </div>
    );
}