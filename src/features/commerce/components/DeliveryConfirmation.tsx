import { useState } from 'react';
import { notify } from '@/lib/notify';
import { useCommerceMutations } from '../hooks/useCommerce';
import { commerceError } from '../services/commerce.service';
import { primaryButton, secondaryButton } from '../utils/commerce-format';

export function DeliveryConfirmation({ id }: { id: string }) {
  const [confirming, setConfirming] = useState(false);
  const { deliver } = useCommerceMutations();
  async function confirm() {
    const notification = notify.loading('Confirmando entrega…');
    try { await deliver.mutateAsync(id); notify.success('Entrega confirmada', { id: notification }); setConfirming(false); }
    catch (error: unknown) { notify.error(commerceError(error), { id: notification }); }
  }
  if (!confirming) return <button type="button" onClick={() => setConfirming(true)} className={`${primaryButton} mt-4 mx-3`}>Marcar como entregado</button>;
  return <div className="mt-4 border-t border-arma-border pt-4"><p className="text-sm">Confirma que el cliente recibió todas las piezas de este apartado.</p><div className="mt-3 flex flex-wrap gap-3"><button type="button" disabled={deliver.isPending} onClick={() => void confirm()} className={primaryButton}>{deliver.isPending ? 'Guardando…' : 'Confirmar entrega'}</button><button type="button" disabled={deliver.isPending} onClick={() => setConfirming(false)} className={secondaryButton}>Volver</button></div></div>;
}
