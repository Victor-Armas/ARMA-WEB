import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { notify } from '@/lib/notify';
import { orderFormSchema, type OrderFormInput, type OrderFormValues, type OrderKind } from '../schemas/commerce.schema';
import { useCommerceMutations } from './useCommerce';
import { commerceError, isRejectedOperation } from '../services/commerce.service';
import { todayInMonterrey } from '../utils/commerce-format';

export function useOrderForm(kind: OrderKind, variantId: string, catalogPrice: number, available: number, onSuccess: () => void) {
  const [requestId] = useState(() => crypto.randomUUID());
  const [locked, setLocked] = useState(false);
  const {create} = useCommerceMutations();
  const form = useForm<OrderFormInput, undefined, OrderFormValues>({
    resolver: zodResolver(orderFormSchema), mode: 'onBlur',
    defaultValues: {quantity: '1', unit_price: String(catalogPrice), customer_name: '', customer_phone: '', notes: '', deposit: '0', payment_method: 'cash', due_date: '', delivery_date: ''},
  });
  const values = useWatch({control: form.control});
  const total = (Number(values.quantity) || 0) * (Number(values.unit_price) || 0);
  async function submit(values: OrderFormValues) {
    if (values.quantity > available) {form.setError('quantity', {message: `Hay ${available} piezas disponibles.`}); return;}
    if (kind === 'reservation' && !values.customer_name) {form.setError('customer_name', {message: 'Escribe el nombre del cliente.'}); return;}
    if (values.due_date && values.due_date < todayInMonterrey()) {form.setError('due_date', {message: 'Elige hoy o una fecha posterior.'}); return;}
    if (values.delivery_date && values.delivery_date < todayInMonterrey()) {form.setError('delivery_date', {message: 'Elige hoy o una fecha posterior.'}); return;}
    setLocked(true);
    const notification = notify.loading(kind === 'sale' ? 'Registrando venta…' : 'Registrando apartado…');
    try {
      await create.mutateAsync({...values, request_id: requestId, kind, variant_id: variantId});
      notify.success(kind === 'sale' ? 'Venta registrada' : 'Apartado registrado', {id: notification}); onSuccess();
    } catch (error: unknown) {
      if (isRejectedOperation(error)) setLocked(false);
      const message = commerceError(error); form.setError('root.server', {message}); notify.error(message, {id: notification});
    }
  }
  return {form, values, total, locked, submit: form.handleSubmit(submit), pending: form.formState.isSubmitting};
}
