import { useState, useEffect, useCallback } from 'react';
import { api } from '@/services/api';
import { useToast } from '@/hooks/use-toast';

// Types
export interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  images: string[];
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  sourceUrl?: string;
  sourcePlatform?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Order {
  id: string;
  buyerName: string;
  buyerPhone?: string;
  buyerEmail?: string;
  itemName: string;
  amount: number;
  status: 'PENDING_PAYMENT' | 'PAID' | 'ACCEPTED' | 'SHIPPED' | 'DELIVERED' | 'COMPLETED' | 'CANCELLED' | 'DISPUTED';
  createdAt: string;
  shippingInfo?: {
    courierName?: string;
    trackingNumber?: string;
    estimatedDelivery?: string;
  };
}

export interface StoreStats {
  totalRevenue: number;
  totalOrders: number;
  totalProducts: number;
  totalViews: number;
  pendingOrders: number;
  completedOrders: number;
  revenueChange: number;
  ordersChange: number;
  viewsChange: number;
}

export interface SocialAccount {
  id: string;
  platform: 'INSTAGRAM' | 'FACEBOOK' | 'LINKEDIN';
  pageUrl: string;
  pageId?: string;
  pageName?: string;
  lastSyncAt?: string;
  status: 'PENDING' | 'CONNECTED' | 'ERROR';
}

// Custom hook for store data management
export function useStoreData(storeId?: string) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<StoreStats>({
    totalRevenue: 0,
    totalOrders: 0,
    totalProducts: 0,
    totalViews: 0,
    pendingOrders: 0,
    completedOrders: 0,
    revenueChange: 0,
    ordersChange: 0,
    viewsChange: 0,
  });
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [socialAccounts, setSocialAccounts] = useState<SocialAccount[]>([]);

  // Load initial data
  const loadStoreData = useCallback(async () => {
    if (!storeId) return;
    setLoading(true);
    
    try {
      const [statsRes, ordersRes, productsRes, socialRes] = await Promise.all([
        api.getSellerStats(),
        api.getSellerOrders({ limit: 100 }),
        api.listPublishedProducts(),
        api.listSocialAccounts(),
      ]);

      if (statsRes.success && statsRes.data) {
        const data = statsRes.data as any;
        setStats({
          totalRevenue: data.totalRevenue || data.totalEarnings || 0,
          totalOrders: data.totalOrders || data.completedCount || 0,
          totalProducts: data.productCount || 0,
          totalViews: data.storeViews || 0,
          pendingOrders: data.pendingCount || 0,
          completedOrders: data.completedCount || 0,
          revenueChange: data.revenueChange || 0,
          ordersChange: data.ordersChange || 0,
          viewsChange: data.viewsChange || 0,
        });
      }

      if (ordersRes.success && ordersRes.data) {
        const ordersData = Array.isArray(ordersRes.data) ? ordersRes.data : (ordersRes.data as any).orders || [];
        setOrders(ordersData.map((o: any) => ({
          id: o.id,
          buyerName: o.buyerName || o.buyer?.name || 'Unknown Buyer',
          buyerPhone: o.buyerPhone || o.buyer?.phone,
          buyerEmail: o.buyerEmail || o.buyer?.email,
          itemName: o.itemName || o.item || 'Unknown Item',
          amount: o.amount || 0,
          status: o.status || 'PENDING_PAYMENT',
          createdAt: o.createdAt,
          shippingInfo: o.shippingInfo,
        })));
      }

      if (productsRes.success && productsRes.data) {
        const productsData = Array.isArray(productsRes.data) ? productsRes.data : [];
        setProducts(productsData);
      }

      if (socialRes.success && socialRes.data) {
        const socialData = Array.isArray(socialRes.data) ? socialRes.data : [];
        setSocialAccounts(socialData);
      }
    } catch (error) {
      console.error('Failed to load store data:', error);
      toast({
        title: 'Error loading store data',
        description: 'Please try refreshing the page',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [storeId, toast]);

  useEffect(() => {
    loadStoreData();
  }, [loadStoreData]);

  // Product operations
  const createProduct = async (_data: { name: string; description?: string; price: number; images?: string[] }) => {
    // Note: API doesn't have direct create product endpoint, products come from social sync
    // This is a placeholder for manual product creation
    toast({
      title: 'Products from Social',
      description: 'Products are automatically synced from your connected social accounts',
    });
    return false;
  };

  const updateProduct = async (id: string, data: Partial<Product>) => {
    const res = await api.updateProductDetails(id, data);
    if (res.success) {
      setProducts(prev => prev.map(p => p.id === id ? { ...p, ...data } : p));
      toast({ title: 'Product updated successfully' });
      return true;
    } else {
      toast({ title: 'Failed to update product', description: res.error, variant: 'destructive' });
      return false;
    }
  };

  const publishProduct = async (id: string) => {
    const res = await api.publishProduct(id);
    if (res.success) {
      setProducts(prev => prev.map(p => p.id === id ? { ...p, status: 'PUBLISHED' } : p));
      toast({ title: 'Product published!' });
      await loadStoreData();
      return true;
    } else {
      toast({ title: 'Failed to publish product', description: res.error, variant: 'destructive' });
      return false;
    }
  };

  const archiveProduct = async (id: string) => {
    const res = await api.archiveProduct(id);
    if (res.success) {
      setProducts(prev => prev.map(p => p.id === id ? { ...p, status: 'ARCHIVED' } : p));
      toast({ title: 'Product archived' });
      return true;
    } else {
      toast({ title: 'Failed to archive product', description: res.error, variant: 'destructive' });
      return false;
    }
  };

  // Order operations
  const acceptOrder = async (orderId: string) => {
    const res = await api.acceptOrder(orderId);
    if (res.success) {
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'ACCEPTED' } : o));
      toast({ title: 'Order accepted!' });
      return true;
    } else {
      toast({ title: 'Failed to accept order', description: res.error, variant: 'destructive' });
      return false;
    }
  };

  const rejectOrder = async (orderId: string, reason?: string) => {
    const res = await api.rejectOrder(orderId, reason);
    if (res.success) {
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'CANCELLED' } : o));
      toast({ title: 'Order rejected' });
      return true;
    } else {
      toast({ title: 'Failed to reject order', description: res.error, variant: 'destructive' });
      return false;
    }
  };

  const addShippingInfo = async (orderId: string, data: { courierName: string; trackingNumber: string; estimatedDeliveryDate?: string }) => {
    const res = await api.addShippingInfo(orderId, data);
    if (res.success) {
      setOrders(prev => prev.map(o => o.id === orderId ? { 
        ...o, 
        status: 'SHIPPED',
        shippingInfo: {
          courierName: data.courierName,
          trackingNumber: data.trackingNumber,
          estimatedDelivery: data.estimatedDeliveryDate,
        }
      } : o));
      toast({ title: 'Shipping info added!' });
      return true;
    } else {
      toast({ title: 'Failed to add shipping info', description: res.error, variant: 'destructive' });
      return false;
    }
  };

  // Social operations
  const connectSocial = async (platform: 'INSTAGRAM' | 'FACEBOOK' | 'LINKEDIN', pageUrl: string) => {
    const res = await api.connectSocialPage({ platform, pageUrl });
    if (res.success) {
      await loadStoreData();
      toast({ title: 'Social account connected!' });
      return true;
    } else {
      toast({ title: 'Failed to connect account', description: res.error, variant: 'destructive' });
      return false;
    }
  };

  const rescanSocial = async (id: string) => {
    const res = await api.rescanSocialPage(id);
    if (res.success) {
      toast({ title: 'Rescan triggered', description: 'Products will be updated shortly' });
      return true;
    } else {
      toast({ title: 'Failed to rescan', description: res.error, variant: 'destructive' });
      return false;
    }
  };

  return {
    loading,
    stats,
    products,
    orders,
    socialAccounts,
    refresh: loadStoreData,
    // Product operations
    createProduct,
    updateProduct,
    publishProduct,
    archiveProduct,
    // Order operations
    acceptOrder,
    rejectOrder,
    addShippingInfo,
    // Social operations
    connectSocial,
    rescanSocial,
  };
}
