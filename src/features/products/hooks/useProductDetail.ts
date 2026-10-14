import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { useAuthStore } from '@/features/auth/stores/auth.store';
import { getProductDetail } from '../services/product.service';

export function useProductDetail(productId: string | undefined) {
  const userId = useAuthStore(state => state.session?.user.id);
  const isValidId = z.uuid().safeParse(productId).success;
  const query = useQuery({
    queryKey: ['product-detail', userId, productId],
    enabled: Boolean(userId) && isValidId,
    queryFn: ({ signal }) => {
      if (!productId || !isValidId) throw new Error('Producto inválido.');
      return getProductDetail(productId, signal);
    },
    staleTime: 60_000,
    refetchInterval: 50 * 60_000,
    refetchOnWindowFocus: 'always',
  });
  return { ...query, isValidId };
}
