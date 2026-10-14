export const formatMoney = (value: number) => new Intl.NumberFormat('es-MX', {style: 'currency', currency: 'MXN'}).format(value);
export const formatDate = (value: string) => new Intl.DateTimeFormat('es-MX', {dateStyle: 'medium', timeZone: 'America/Monterrey'}).format(new Date(value));
export const todayInMonterrey = () => new Intl.DateTimeFormat('en-CA', {timeZone: 'America/Monterrey', year: 'numeric', month: '2-digit', day: '2-digit'}).format(new Date());
export const paymentLabels = {cash: 'Efectivo', transfer: 'Transferencia', card: 'Tarjeta'};
export const fieldClass = 'min-h-11 w-full rounded-arma border border-arma-border bg-arma-surface px-3 py-2 text-base outline-none focus-visible:ring-2 focus-visible:ring-arma-active disabled:opacity-60';
export const primaryButton = 'min-h-12 rounded-arma bg-arma-active px-5 text-sm font-semibold text-white hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arma-active disabled:opacity-50 disabled:cursor-default';
export const secondaryButton = 'min-h-11 rounded-arma border border-arma-border bg-arma-surface px-4 text-sm font-medium hover:bg-arma-primary-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-arma-active disabled:opacity-50';

export const formatCalendarDate = (date: string) => new Intl.DateTimeFormat('es-MX', {weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'America/Monterrey'}).format(new Date(`${date}T12:00:00-06:00`));
export const formatDateTime = (value: string) => new Intl.DateTimeFormat('es-MX', {dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Monterrey'}).format(new Date(value));
