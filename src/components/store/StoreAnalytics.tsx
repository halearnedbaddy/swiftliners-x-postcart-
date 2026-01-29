import { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Eye, ShoppingCart, DollarSign, RefreshCw } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { api } from '@/services/api';
import { useToast } from '@/hooks/use-toast';

interface AnalyticsData {
  totalViews: number;
  totalOrders: number;
  totalRevenue: number;
  conversionRate: number;
  avgOrderValue: number;
  viewsChange: number;
  ordersChange: number;
  revenueChange: number;
}

interface ChartDataPoint {
  date: string;
  revenue: number;
  orders: number;
  views: number;
}

type TimePeriod = '7days' | '30days' | '90days' | 'all';

export function StoreAnalytics() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState<TimePeriod>('30days');
  const [data, setData] = useState<AnalyticsData>({
    totalViews: 0,
    totalOrders: 0,
    totalRevenue: 0,
    conversionRate: 0,
    avgOrderValue: 0,
    viewsChange: 0,
    ordersChange: 0,
    revenueChange: 0,
  });
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);

  const loadAnalytics = async () => {
    try {
      const [statsRes, ordersRes] = await Promise.all([
        api.getSellerStats(),
        api.getSellerOrders({ limit: 100 }),
      ]);

      if (statsRes.success && statsRes.data) {
        const stats = statsRes.data as any;
        const totalOrders = stats.totalOrders || stats.completedCount || 0;
        const totalRevenue = stats.totalRevenue || stats.totalEarnings || 0;
        const totalViews = stats.storeViews || 0;
        
        setData({
          totalViews,
          totalOrders,
          totalRevenue,
          conversionRate: totalViews > 0 ? ((totalOrders / totalViews) * 100) : 0,
          avgOrderValue: totalOrders > 0 ? (totalRevenue / totalOrders) : 0,
          viewsChange: stats.viewsChange || 0,
          ordersChange: stats.ordersChange || 0,
          revenueChange: stats.revenueChange || 0,
        });
      }

      // Generate chart data from orders
      if (ordersRes.success && ordersRes.data) {
        const orders = Array.isArray(ordersRes.data) ? ordersRes.data : (ordersRes.data as any).orders || [];
        const chartPoints = generateChartData(orders, period);
        setChartData(chartPoints);
      }
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateChartData = (orders: any[], timePeriod: TimePeriod): ChartDataPoint[] => {
    const now = new Date();
    const daysMap: Record<TimePeriod, number> = {
      '7days': 7,
      '30days': 30,
      '90days': 90,
      'all': 365,
    };
    const days = daysMap[timePeriod];
    
    // Create date buckets
    const buckets: Record<string, { revenue: number; orders: number; views: number }> = {};
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      buckets[dateStr] = { revenue: 0, orders: 0, views: Math.floor(Math.random() * 20) }; // Mock views
    }
    
    // Aggregate orders into buckets
    orders.forEach((order: any) => {
      if (order.createdAt && order.status === 'COMPLETED') {
        const dateStr = new Date(order.createdAt).toISOString().split('T')[0];
        if (buckets[dateStr]) {
          buckets[dateStr].revenue += order.amount || 0;
          buckets[dateStr].orders += 1;
        }
      }
    });
    
    return Object.entries(buckets)
      .map(([date, values]) => ({
        date: new Date(date).toLocaleDateString('en-KE', { month: 'short', day: 'numeric' }),
        ...values,
      }))
      .slice(-Math.min(days, 30)); // Limit chart points for readability
  };

  useEffect(() => {
    loadAnalytics();
  }, [period]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAnalytics();
    setRefreshing(false);
    toast({ title: 'Analytics refreshed' });
  };

  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) return `KES ${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 1000) return `KES ${(amount / 1000).toFixed(1)}K`;
    return `KES ${amount.toLocaleString()}`;
  };

  const metrics = [
    { 
      label: 'Total Views', 
      value: data.totalViews.toLocaleString(), 
      change: data.viewsChange,
      icon: Eye, 
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    { 
      label: 'Total Orders', 
      value: data.totalOrders.toString(), 
      change: data.ordersChange,
      icon: ShoppingCart, 
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    { 
      label: 'Conversion Rate', 
      value: `${data.conversionRate.toFixed(1)}%`, 
      icon: TrendingUp, 
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
    { 
      label: 'Avg Order Value', 
      value: formatCurrency(data.avgOrderValue), 
      icon: DollarSign, 
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
    },
  ];

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="flex justify-between items-center">
          <div className="bg-muted h-8 w-32 rounded-null" />
          <div className="flex gap-2">
            {[1,2,3,4].map(i => <div key={i} className="bg-muted h-8 w-20 rounded-null" />)}
          </div>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="bg-muted h-28 rounded-null" />)}
        </div>
        <div className="bg-muted h-80 rounded-null" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-2xl font-bold text-foreground">Analytics</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 border border-input rounded-null hover:bg-muted transition"
          >
            <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
          </button>
          {(['7days', '30days', '90days', 'all'] as TimePeriod[]).map((p) => (
            <button 
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-2 rounded-null text-sm font-medium transition ${
                period === p
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {p === '7days' ? '7 days' : p === '30days' ? '30 days' : p === '90days' ? '90 days' : 'All time'}
            </button>
          ))}
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric, idx) => {
          const Icon = metric.icon;
          const hasChange = metric.change !== undefined;
          const isPositive = metric.change && metric.change > 0;
          
          return (
            <div key={idx} className="bg-card border border-border rounded-null p-5 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 rounded-null ${metric.bgColor} flex items-center justify-center`}>
                  <Icon className={metric.color} size={20} />
                </div>
                {hasChange && metric.change !== 0 && (
                  <span className={`text-xs font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                    {isPositive ? '+' : ''}{metric.change}%
                  </span>
                )}
              </div>
              <p className="text-2xl font-bold text-foreground">{metric.value}</p>
              <p className="text-sm text-muted-foreground">{metric.label}</p>
            </div>
          );
        })}
      </div>

      {/* Revenue Chart */}
      <div className="bg-card border border-border rounded-null p-6">
        <h3 className="text-lg font-bold text-foreground mb-4">Revenue Overview</h3>
        {chartData.length > 0 && chartData.some(d => d.revenue > 0) ? (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  tickLine={false}
                  axisLine={{ stroke: 'hsl(var(--border))' }}
                />
                <YAxis 
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  tickLine={false}
                  axisLine={{ stroke: 'hsl(var(--border))' }}
                  tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  labelStyle={{ color: 'hsl(var(--foreground))' }}
                  formatter={(value) => [`KES ${Number(value).toLocaleString()}`, 'Revenue']}
                />
                <Area 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="hsl(var(--primary))" 
                  fillOpacity={1} 
                  fill="url(#colorRevenue)" 
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-64 flex items-center justify-center bg-muted rounded-null">
            <div className="text-center text-muted-foreground">
              <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No sales data yet</p>
              <p className="text-sm">Charts will appear when you make sales</p>
            </div>
          </div>
        )}
      </div>

      {/* Orders Chart */}
      <div className="bg-card border border-border rounded-null p-6">
        <h3 className="text-lg font-bold text-foreground mb-4">Orders Over Time</h3>
        {chartData.length > 0 && chartData.some(d => d.orders > 0) ? (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  tickLine={false}
                  axisLine={{ stroke: 'hsl(var(--border))' }}
                />
                <YAxis 
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  tickLine={false}
                  axisLine={{ stroke: 'hsl(var(--border))' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  labelStyle={{ color: 'hsl(var(--foreground))' }}
                />
                <Bar dataKey="orders" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-48 flex items-center justify-center bg-muted rounded-null">
            <div className="text-center text-muted-foreground">
              <ShoppingCart className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No order data to display</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
