import { useState, useEffect, useCallback } from 'react';
import { getBuyerOrders, getBuyerWallet, getBuyerDisputes } from '@/services/supabaseApi';
import { useOrderTracking, OrderUpdate } from './useOrderTracking';

export interface BuyerOrder {
  id: string;
  itemName: string;
  amount: number;
  status: string;
  seller: { name: string; phone: string };
  createdAt: string;
  updatedAt: string;
  lastUpdateLive?: boolean;
}

export interface BuyerDispute {
  id: string;
  transactionId: string;
  status: string;
  reason: string;
  transaction: {
    itemName: string;
    amount: number;
    seller: { name: string };
  };
  createdAt: string;
}

export interface BuyerWallet {
  availableBalance: number;
  pendingBalance: number;
  totalSpent: number;
  totalTransactions: number;
}

export function useBuyerData() {
  const [orders, setOrders] = useState<BuyerOrder[]>([]);
  const [disputes, setDisputes] = useState<BuyerDispute[]>([]);
  const [wallet, setWallet] = useState<BuyerWallet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Handle real-time order updates
  const handleOrderUpdate = useCallback((update: OrderUpdate) => {
    setOrders(prevOrders => 
      prevOrders.map(order => 
        order.id === update.orderId
          ? { 
              ...order, 
              status: update.status, 
              updatedAt: update.timestamp,
              lastUpdateLive: true 
            }
          : order
      )
    );

    // Clear the live update flag after animation
    setTimeout(() => {
      setOrders(prevOrders =>
        prevOrders.map(order =>
          order.id === update.orderId
            ? { ...order, lastUpdateLive: false }
            : order
        )
      );
    }, 3000);
  }, []);

  const { isConnected, trackOrders, recentUpdates } = useOrderTracking({
    onOrderUpdate: handleOrderUpdate,
  });

  useEffect(() => {
    fetchAllData();
  }, []);

  // Track all orders when they're loaded
  useEffect(() => {
    if (orders.length > 0 && isConnected) {
      trackOrders(orders.map(o => o.id));
    }
  }, [orders.length, isConnected, trackOrders]);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all buyer data in parallel using Supabase API
      const [ordersRes, disputesRes, walletRes] = await Promise.all([
        getBuyerOrders({ page: 1, limit: 20 }),
        getBuyerDisputes(),
        getBuyerWallet(),
      ]);

      if (ordersRes.success && ordersRes.data) {
        const data = ordersRes.data as BuyerOrder[] | { orders?: BuyerOrder[]; data?: BuyerOrder[] };
        let ordersData: BuyerOrder[] = [];
        if (Array.isArray(data)) {
          ordersData = data;
        } else if (data.orders) {
          ordersData = data.orders;
        } else if (data.data) {
          ordersData = data.data;
        }
        setOrders(ordersData);
      }
      if (disputesRes.success && disputesRes.data) {
        const data = disputesRes.data as BuyerDispute[] | { disputes?: BuyerDispute[]; data?: BuyerDispute[] };
        let disputesData: BuyerDispute[] = [];
        if (Array.isArray(data)) {
          disputesData = data;
        } else if (data.disputes) {
          disputesData = data.disputes;
        } else if (data.data) {
          disputesData = data.data;
        }
        setDisputes(disputesData);
      }
      if (walletRes.success && walletRes.data) {
        setWallet(walletRes.data as BuyerWallet);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch buyer data');
    } finally {
      setLoading(false);
    }
  };

  return { 
    orders, 
    disputes, 
    wallet, 
    loading, 
    error, 
    refetch: fetchAllData,
    isConnected,
    recentUpdates,
  };
}
