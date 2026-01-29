import { useState, useEffect, useCallback } from 'react';
import { 
  getSellerOrders, 
  getSellerStats, 
  getPaymentMethods,
  acceptOrder as apiAcceptOrder,
  rejectOrder as apiRejectOrder,
  addShippingInfo as apiAddShippingInfo,
  addPaymentMethod as apiAddPaymentMethod,
} from '@/services/supabaseApi';

export interface SellerOrder {
  id: string;
  itemName: string;
  amount: number;
  status: string;
  buyer: { id: string; name: string; phone: string; memberSince?: string };
  createdAt: string;
  updatedAt: string;
  acceptedAt?: string;
  shippedAt?: string;
  courierName?: string;
  trackingNumber?: string;
}

export interface SellerStats {
  totalOrders: number;
  completedOrders: number;
  pendingOrders: number;
  disputedOrders: number;
  completionRate: number;
  disputeRate: number;
  wallet: {
    availableBalance: number;
    pendingBalance: number;
    totalEarned: number;
  };
  profile?: {
    businessName?: string;
    rating?: number;
    totalReviews?: number;
  };
}

export interface PaymentMethod {
  id: string;
  type: string;
  provider: string;
  accountNumber: string;
  accountName: string;
  isDefault: boolean;
}

export function useSellerData() {
  const [orders, setOrders] = useState<SellerOrder[]>([]);
  const [stats, setStats] = useState<SellerStats | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = useCallback(async (status?: string, page = 1) => {
    try {
      const res = await getSellerOrders({ status, page, limit: 20 });
      if (res.success && res.data) {
        const data = res.data as SellerOrder[] | { data?: SellerOrder[] };
        const ordersData = Array.isArray(data) ? data : data.data || [];
        setOrders(ordersData);
      }
    } catch (err) {
      console.error('Failed to fetch seller orders:', err);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const res = await getSellerStats();
      if (res.success && res.data) {
        setStats(res.data as SellerStats);
      }
    } catch (err) {
      console.error('Failed to fetch seller stats:', err);
    }
  }, []);

  const fetchPaymentMethods = useCallback(async () => {
    try {
      const res = await getPaymentMethods();
      if (res.success && res.data) {
        // Transform snake_case to camelCase
        const methods = (Array.isArray(res.data) ? res.data : []).map((m: any) => ({
          id: m.id,
          type: m.type,
          provider: m.provider,
          accountNumber: m.account_number,
          accountName: m.account_name,
          isDefault: m.is_default,
        }));
        setPaymentMethods(methods);
      }
    } catch (err) {
      console.error('Failed to fetch payment methods:', err);
    }
  }, []);

  const fetchAllData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      await Promise.all([fetchOrders(), fetchStats(), fetchPaymentMethods()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch seller data');
    } finally {
      setLoading(false);
    }
  }, [fetchOrders, fetchStats, fetchPaymentMethods]);

  // Initial fetch
  useEffect(() => {
    fetchAllData();
  }, []);

  // Action handlers
  const acceptOrder = useCallback(async (orderId: string) => {
    const res = await apiAcceptOrder(orderId);
    if (res.success) {
      await fetchOrders();
    }
    return res;
  }, [fetchOrders]);

  const rejectOrder = useCallback(async (orderId: string, reason?: string) => {
    const res = await apiRejectOrder(orderId, reason);
    if (res.success) {
      await fetchOrders();
    }
    return res;
  }, [fetchOrders]);

  const addShippingInfo = useCallback(async (orderId: string, data: {
    courierName: string;
    trackingNumber: string;
    estimatedDeliveryDate?: string;
    notes?: string;
  }) => {
    const res = await apiAddShippingInfo(orderId, data);
    if (res.success) {
      await fetchOrders();
    }
    return res;
  }, [fetchOrders]);

  const addPaymentMethod = useCallback(async (data: {
    type: string;
    provider: string;
    accountNumber: string;
    accountName: string;
    isDefault?: boolean;
  }) => {
    const res = await apiAddPaymentMethod(data);
    if (res.success) {
      await fetchPaymentMethods();
    }
    return res;
  }, [fetchPaymentMethods]);

  return {
    orders,
    stats,
    paymentMethods,
    loading,
    error,
    refetch: fetchAllData,
    fetchOrders,
    fetchStats,
    fetchPaymentMethods,
    acceptOrder,
    rejectOrder,
    addShippingInfo,
    addPaymentMethod,
  };
}
