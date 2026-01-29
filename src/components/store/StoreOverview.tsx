import { useEffect, useState } from 'react';
import { TrendingUpIcon, ShoppingCartIcon, CreditCardIcon, PackageIcon, ArrowUpRightIcon, ArrowDownRightIcon, ClockIcon, RefreshCwIcon, PlusIcon, ShareIcon, LinkIcon, EyeIcon, SettingsIcon, CopyIcon, CheckCircleIcon } from '@/components/icons';
import { api } from '@/services/api';
import { useToast } from '@/hooks/use-toast';

interface StoreOverviewProps {
  storeName: string;
  storeSlug?: string;
  storeId?: string;
  onNavigate?: (tab: string) => void;
}

interface Stats {
  totalRevenue: number;
  totalOrders: number;
  totalProducts: number;
  storeViews: number;
  pendingCount: number;
  completedCount: number;
  revenueChange: number;
  ordersChange: number;
}

interface RecentOrder {
  id: string;
  buyerName: string;
  itemName: string;
  amount: number;
  status: string;
  createdAt: string;
}

export function StoreOverview({ storeName, storeSlug, storeId, onNavigate }: StoreOverviewProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [stats, setStats] = useState<Stats>({
    totalRevenue: 0,
    totalOrders: 0,
    totalProducts: 0,
    storeViews: 0,
    pendingCount: 0,
    completedCount: 0,
    revenueChange: 0,
    ordersChange: 0,
  });
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);

  const storeUrl = storeSlug ? `${window.location.origin}/store/${storeSlug}` : '';

  const loadData = async () => {
    try {
      const [statsRes, ordersRes, productsRes] = await Promise.all([
        api.getSellerStats(),
        api.getSellerOrders({ limit: 5 }),
        api.listPublishedProducts(),
      ]);

      if (statsRes.success && statsRes.data) {
        const data = statsRes.data as any;
        setStats({
          totalRevenue: data.totalRevenue || data.totalEarnings || 0,
          totalOrders: data.totalOrders || data.completedCount || 0,
          totalProducts: data.productCount || 0,
          storeViews: data.storeViews || 0,
          pendingCount: data.pendingCount || 0,
          completedCount: data.completedCount || 0,
          revenueChange: data.revenueChange || 0,
          ordersChange: data.ordersChange || 0,
        });
      }

      if (productsRes.success && productsRes.data) {
        const products = Array.isArray(productsRes.data) ? productsRes.data : [];
        setStats(prev => ({ ...prev, totalProducts: products.length }));
      }

      if (ordersRes.success && ordersRes.data) {
        const orders = Array.isArray(ordersRes.data) ? ordersRes.data : (ordersRes.data as any).orders || [];
        setRecentOrders(orders.slice(0, 5).map((o: any) => ({
          id: o.id,
          buyerName: o.buyerName || o.buyer?.name || 'Unknown',
          itemName: o.itemName || o.item || 'Unknown Item',
          amount: o.amount || 0,
          status: o.status,
          createdAt: o.createdAt,
        })));
      }
    } catch (error) {
      console.error('Failed to load overview data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [storeId]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
    toast({ title: 'Data refreshed' });
  };

  const handleCopyLink = async () => {
    if (!storeUrl) return;
    try {
      await navigator.clipboard.writeText(storeUrl);
      setCopiedLink(true);
      toast({ title: 'Link copied!', description: 'Share it with your customers' });
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      toast({ title: 'Failed to copy', variant: 'destructive' });
    }
  };

  const formatCurrency = (amount: number) => {
    return `KES ${amount.toLocaleString()}`;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'PENDING_PAYMENT': 'bg-yellow-100 text-yellow-800',
      'PAID': 'bg-blue-100 text-blue-800',
      'ACCEPTED': 'bg-indigo-100 text-indigo-800',
      'SHIPPED': 'bg-purple-100 text-purple-800',
      'DELIVERED': 'bg-teal-100 text-teal-800',
      'COMPLETED': 'bg-green-100 text-green-800',
      'CANCELLED': 'bg-red-100 text-red-800',
      'DISPUTED': 'bg-orange-100 text-orange-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const statCards = [
    { 
      label: 'Total Revenue', 
      value: formatCurrency(stats.totalRevenue), 
      change: stats.revenueChange,
      icon: CreditCardIcon,
      color: 'from-emerald-500 to-green-600'
    },
    { 
      label: 'Orders', 
      value: stats.totalOrders.toString(), 
      change: stats.ordersChange,
      icon: ShoppingCartIcon,
      color: 'from-blue-500 to-cyan-600'
    },
    { 
      label: 'Products', 
      value: stats.totalProducts.toString(), 
      subtext: `${stats.totalProducts} active`,
      icon: PackageIcon,
      color: 'from-purple-500 to-pink-600'
    },
    { 
      label: 'Store Views', 
      value: stats.storeViews.toString(), 
      change: 0,
      icon: TrendingUpIcon,
      color: 'from-orange-500 to-red-600'
    },
  ];

  const quickActions = [
    {
      label: 'Add Product',
      description: 'List a new item for sale',
      icon: PlusIcon,
      tab: 'products',
      gradient: 'from-emerald-500 to-green-600',
    },
    {
      label: 'Share Store',
      description: 'Copy your store link',
      icon: ShareIcon,
      action: handleCopyLink,
      gradient: 'from-blue-500 to-cyan-600',
    },
    {
      label: 'View Storefront',
      description: 'See what customers see',
      icon: EyeIcon,
      tab: 'my-store',
      gradient: 'from-purple-500 to-pink-600',
    },
    {
      label: 'Store Settings',
      description: 'Customize your store',
      icon: SettingsIcon,
      tab: 'settings',
      gradient: 'from-orange-500 to-amber-600',
    },
  ];

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="bg-muted rounded-null h-32" />
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="bg-muted rounded-null h-28" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-primary to-primary/80 rounded-null p-8 text-primary-foreground relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDYwIEwgNjAgMCIgc3Ryb2tlPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMSkiIHN0cm9rZS13aWR0aD0iMSIgZmlsbD0ibm9uZSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-20" />
        <div className="relative flex flex-col md:flex-row md:justify-between md:items-start gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">Welcome to {storeName}!</h1>
            <p className="opacity-90 mb-3">
              Here's an overview of your store's performance
            </p>
            {storeUrl && (
              <div className="flex items-center gap-2 bg-white/20 rounded-null px-3 py-2 w-fit">
                <LinkIcon size={16} />
                <span className="text-sm truncate max-w-[200px]">{storeUrl}</span>
                <button 
                  onClick={handleCopyLink}
                  className="p-1 hover:bg-white/20 rounded-null transition"
                >
                  {copiedLink ? <CheckCircleIcon size={16} /> : <CopyIcon size={16} />}
                </button>
              </div>
            )}
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 bg-white/20 hover:bg-white/30 rounded-null transition self-start"
          >
            <RefreshCwIcon size={20} className={refreshing ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, idx) => {
          const Icon = stat.icon;
          const hasChange = stat.change !== undefined && stat.change !== null;
          const isPositive = stat.change && stat.change > 0;
          const isNegative = stat.change && stat.change < 0;
          
          return (
            <div 
              key={idx} 
              className="bg-card border border-border rounded-null p-5 hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`w-10 h-10 rounded-null bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-lg`}>
                  <Icon size={20} className="text-white" />
                </div>
                {hasChange && stat.change !== 0 && (
                  <div className={`flex items-center gap-1 text-xs font-medium ${
                    isPositive ? 'text-emerald-600' : isNegative ? 'text-red-600' : 'text-muted-foreground'
                  }`}>
                    {isPositive ? <ArrowUpRightIcon size={14} /> : <ArrowDownRightIcon size={14} />}
                    {Math.abs(stat.change)}%
                  </div>
                )}
              </div>
              <p className="text-2xl font-bold text-foreground">{stat.value}</p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              {stat.subtext && (
                <p className="text-xs text-muted-foreground mt-1">{stat.subtext}</p>
              )}
            </div>
          );
        })}
      </div>

      {/* Quick Actions + Recent Orders */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Quick Actions */}
        <div className="bg-card border border-border rounded-null p-6">
          <h3 className="text-lg font-bold text-foreground mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map((action, idx) => {
              const Icon = action.icon;
              return (
                <button 
                  key={idx}
                  onClick={() => action.action ? action.action() : onNavigate?.(action.tab!)}
                  className="text-left p-4 bg-muted/50 hover:bg-muted rounded-null transition group relative overflow-hidden"
                >
                  <div className={`w-10 h-10 rounded-null bg-gradient-to-br ${action.gradient} flex items-center justify-center shadow-md mb-3 group-hover:scale-110 transition-transform`}>
                    <Icon size={20} className="text-white" />
                  </div>
                  <p className="font-semibold text-foreground text-sm">{action.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{action.description}</p>
                  <ArrowUpRightIcon size={14} className="absolute top-4 right-4 text-muted-foreground group-hover:text-foreground transition" />
                </button>
              );
            })}
          </div>
        </div>

        {/* Recent Orders */}
        <div className="bg-card border border-border rounded-null p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-foreground">Recent Orders</h3>
            {recentOrders.length > 0 && (
              <button 
                onClick={() => onNavigate?.('orders')}
                className="text-sm text-primary hover:underline"
              >
                View All
              </button>
            )}
          </div>
          
          {recentOrders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <ClockIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No orders yet</p>
              <p className="text-sm">Orders will appear here when customers buy</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentOrders.map((order) => (
                <div key={order.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-null">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{order.itemName}</p>
                    <p className="text-sm text-muted-foreground">{order.buyerName}</p>
                  </div>
                  <div className="text-right ml-4">
                    <p className="font-semibold text-foreground">{formatCurrency(order.amount)}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-null-full ${getStatusColor(order.status)}`}>
                      {order.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Pending Actions Alert */}
      {stats.pendingCount > 0 && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-null p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-null-full bg-amber-100 dark:bg-amber-900 flex items-center justify-center">
              <ClockIcon className="text-amber-600" size={20} />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-amber-900 dark:text-amber-100">
                {stats.pendingCount} order{stats.pendingCount > 1 ? 's' : ''} awaiting action
              </p>
              <p className="text-sm text-amber-700 dark:text-amber-300">
                Review and accept orders to keep your customers happy
              </p>
            </div>
            <button 
              onClick={() => onNavigate?.('orders')}
              className="px-4 py-2 bg-amber-600 text-white rounded-null hover:bg-amber-700 transition font-medium"
            >
              View Orders
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
