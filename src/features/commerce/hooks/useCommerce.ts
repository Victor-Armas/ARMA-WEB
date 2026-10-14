import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useAuthStore } from '@/features/auth/stores/auth.store';
import { getCommercePermissions, getCommerceOrders, createCommerceOrder, resolveReservation, setReservationDeliveryDate, markReservationDelivered } from '../services/commerce.service';
import type { OrderKind, SalesPeriod } from '../schemas/commerce.schema';

export function useCommercePermissions() {
  const userId = useAuthStore(state => state.session?.user.id);
  return useQuery({queryKey: ['commerce-permissions', userId], enabled: Boolean(userId), queryFn: ({signal}) => getCommercePermissions(signal), staleTime: 60000});
}
export function useCommerceOrders(kind: OrderKind, page: number, search: string, status: string, enabled: boolean, delivery = '', period: SalesPeriod = 'all') {
  const userId = useAuthStore(state => state.session?.user.id);
  return useQuery({
    queryKey: ['commerce-orders', userId, kind, page, search, status, delivery, period], enabled: Boolean(userId) && enabled,
    queryFn: ({signal}) => {
      if(!userId) throw new Error('Inicia sesión para consultar los registros.');
      return getCommerceOrders(kind, page, search, status, delivery, period, userId, signal);
    },
    refetchInterval: query => {const at=query.state.data?.imageRefreshAt;return at ? Math.max(1000,at-Date.now()) : false;}, staleTime: 15000,
    placeholderData: (previous, query) => query?.queryKey[1] === userId && query?.queryKey[2] === kind ? keepPreviousData(previous) : undefined,
  });
}
export function useCommerceMutations() {
  const client = useQueryClient();
  async function refresh() {
    await Promise.all(['commerce-orders', 'products', 'product-detail'].map(key => client.invalidateQueries({queryKey: [key]})));
  }
  const create = useMutation({mutationKey: ['commerce-write'], mutationFn: createCommerceOrder, onSuccess: refresh, onError: refresh, retry: false});
  const resolve = useMutation({mutationKey: ['commerce-write'], mutationFn: resolveReservation, onSuccess: refresh, onError: refresh, retry: false});
  const schedule = useMutation({mutationKey: ['commerce-write'], mutationFn: setReservationDeliveryDate, onSuccess: refresh, onError: refresh, retry: false});
  const deliver = useMutation({mutationKey: ['commerce-write'], mutationFn: markReservationDelivered, onSuccess: refresh, onError: refresh, retry: false});
  return {create, resolve, schedule, deliver};
}
