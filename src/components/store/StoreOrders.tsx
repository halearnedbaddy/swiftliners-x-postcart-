import { useState, useEffect } from 'react';
import { ShoppingCart, Search, Clock, Check, X, Truck, Loader2, ChevronDown } from 'lucide-react';
import { api } from '@/services/api';
import { useToast } from '@/hooks/use-toast';

interface Order {
  id: string;
  buyerName: string;
  buyerPhone?: string;
  buyerEmail?: string;
  itemName: string;
  amount: number;
  status: string;
  createdAt: string;
  shippingInfo?: {
    courierName?: string;
    trackingNumber?: string;
    estimatedDelivery?: string;
  };
}

type StatusFilter = 'all' | 'pending' | 'accepted' | 'shipped' | 'completed' | 'disputed';

const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  'PENDING_PAYMENT': { label: 'Awaiting Payment', color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
  'PAID': { label: 'Paid - Action Required', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  'ACCEPTED': { label: 'Accepted', color: 'text-indigo-700', bgColor: 'bg-indigo-100' },
  'SHIPPED': { label: 'Shipped', color: 'text-purple-700', bgColor: 'bg-purple-100' },
  'DELIVERED': { label: 'Delivered', color: 'text-teal-700', bgColor: 'bg-teal-100' },
  'COMPLETED': { label: 'Completed', color: 'text-green-700', bgColor: 'bg-green-100' },
  'CANCELLED': { label: 'Cancelled', color: 'text-red-700', bgColor: 'bg-red-100' },
  'DISPUTED': { label: 'Disputed', color: 'text-orange-700', bgColor: 'bg-orange-100' },
};

export function StoreOrders() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [shippingModal, setShippingModal] = useState<Order | null>(null);
  const [shippingForm, setShippingForm] = useState({
    courierName: '',
    trackingNumber: '',
    estimatedDeliveryDate: '',
  });

  const loadOrders = async () => {
    setLoading(true);
    try {
      const res = await api.getSellerOrders({ limit: 100 });
      if (res.success && res.data) {
        const ordersData = Array.isArray(res.data) ? res.data : (res.data as any).orders || [];
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
    } catch (error) {
      console.error('Failed to load orders:', error);
      toast({ title: 'Failed to load orders', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const handleAccept = async (orderId: string) => {
    setActionLoading(orderId);
    const res = await api.acceptOrder(orderId);
    if (res.success) {
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'ACCEPTED' } : o));
      toast({ title: 'Order accepted!' });
    } else {
      toast({ title: 'Failed to accept order', description: res.error, variant: 'destructive' });
    }
    setActionLoading(null);
  };

  const handleReject = async (orderId: string) => {
    setActionLoading(orderId);
    const res = await api.rejectOrder(orderId, 'Seller rejected order');
    if (res.success) {
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'CANCELLED' } : o));
      toast({ title: 'Order rejected' });
    } else {
      toast({ title: 'Failed to reject order', description: res.error, variant: 'destructive' });
    }
    setActionLoading(null);
  };

  const handleAddShipping = async () => {
    if (!shippingModal) return;
    if (!shippingForm.courierName || !shippingForm.trackingNumber) {
      toast({ title: 'Please fill in all required fields', variant: 'destructive' });
      return;
    }

    setActionLoading(shippingModal.id);
    const res = await api.addShippingInfo(shippingModal.id, shippingForm);
    if (res.success) {
      setOrders(prev => prev.map(o => o.id === shippingModal.id ? { 
        ...o, 
        status: 'SHIPPED',
        shippingInfo: {
          courierName: shippingForm.courierName,
          trackingNumber: shippingForm.trackingNumber,
          estimatedDelivery: shippingForm.estimatedDeliveryDate,
        }
      } : o));
      toast({ title: 'Shipping info added!' });
      setShippingModal(null);
      setShippingForm({ courierName: '', trackingNumber: '', estimatedDeliveryDate: '' });
    } else {
      toast({ title: 'Failed to add shipping info', description: res.error, variant: 'destructive' });
    }
    setActionLoading(null);
  };

  const getFilteredOrders = () => {
    let filtered = orders;
    
    if (statusFilter !== 'all') {
      const statusMap: Record<StatusFilter, string[]> = {
        all: [],
        pending: ['PENDING_PAYMENT', 'PAID'],
        accepted: ['ACCEPTED'],
        shipped: ['SHIPPED', 'DELIVERED'],
        completed: ['COMPLETED'],
        disputed: ['DISPUTED', 'CANCELLED'],
      };
      filtered = filtered.filter(o => statusMap[statusFilter].includes(o.status));
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(o =>
        o.buyerName.toLowerCase().includes(query) ||
        o.itemName.toLowerCase().includes(query) ||
        o.id.toLowerCase().includes(query)
      );
    }
    
    return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  };

  const formatCurrency = (amount: number) => `KES ${amount.toLocaleString()}`;
  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('en-KE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const filteredOrders = getFilteredOrders();
  const statusCounts = {
    all: orders.length,
    pending: orders.filter(o => ['PENDING_PAYMENT', 'PAID'].includes(o.status)).length,
    accepted: orders.filter(o => o.status === 'ACCEPTED').length,
    shipped: orders.filter(o => ['SHIPPED', 'DELIVERED'].includes(o.status)).length,
    completed: orders.filter(o => o.status === 'COMPLETED').length,
    disputed: orders.filter(o => ['DISPUTED', 'CANCELLED'].includes(o.status)).length,
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="bg-muted h-8 w-24 rounded-null animate-pulse" />
          <div className="flex gap-2">
            {[1,2,3,4].map(i => <div key={i} className="bg-muted h-8 w-20 rounded-null animate-pulse" />)}
          </div>
        </div>
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="bg-muted h-24 rounded-null-xl animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-2xl font-bold text-foreground">Orders</h2>
        <div className="flex flex-wrap gap-2">
          {(['all', 'pending', 'accepted', 'shipped', 'completed', 'disputed'] as StatusFilter[]).map((status) => (
            <button 
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-null-lg text-sm font-medium transition capitalize ${
                statusFilter === status
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {status} ({statusCounts[status]})
            </button>
          ))}
        </div>
      </div>

      {/* Search */}
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by buyer, item, or order ID..."
            className="w-full pl-10 pr-4 py-2 rounded-null-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <div className="bg-card border border-border rounded-null-xl p-12 text-center">
          <ShoppingCart className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
          <h3 className="text-xl font-bold text-foreground mb-2">No orders found</h3>
          <p className="text-muted-foreground mb-4 max-w-md mx-auto">
            {orders.length === 0 
              ? "When customers place orders, they will appear here. Share your store to start getting orders!"
              : "No orders match your current filters."}
          </p>
          {orders.length === 0 && (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Clock size={16} />
              <span>Waiting for your first order</span>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredOrders.map((order) => {
            const statusConfig = STATUS_CONFIG[order.status] || { label: order.status, color: 'text-gray-700', bgColor: 'bg-gray-100' };
            const isExpanded = expandedOrder === order.id;
            const needsAction = ['PAID'].includes(order.status);
            const canShip = order.status === 'ACCEPTED';

            return (
              <div 
                key={order.id}
                className={`bg-card border rounded-null-xl transition-all ${
                  needsAction ? 'border-amber-300 shadow-amber-100' : 'border-border'
                }`}
              >
                {/* Order Header */}
                <div 
                  className="p-4 cursor-pointer flex items-center gap-4"
                  onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-sm text-muted-foreground">#{order.id.slice(0, 8)}</span>
                      <span className={`px-2 py-0.5 rounded-null-full text-xs font-medium ${statusConfig.bgColor} ${statusConfig.color}`}>
                        {statusConfig.label}
                      </span>
                      {needsAction && (
                        <span className="px-2 py-0.5 rounded-null-full text-xs font-medium bg-amber-100 text-amber-800 animate-pulse">
                          Action Required
                        </span>
                      )}
                    </div>
                    <p className="font-semibold text-foreground truncate">{order.itemName}</p>
                    <p className="text-sm text-muted-foreground">{order.buyerName}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-foreground">{formatCurrency(order.amount)}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(order.createdAt)}</p>
                  </div>
                  <ChevronDown className={`text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`} size={20} />
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="border-t border-border p-4 space-y-4">
                    {/* Buyer Info */}
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">Buyer Details</p>
                        <p className="font-semibold text-foreground">{order.buyerName}</p>
                        {order.buyerPhone && <p className="text-sm text-foreground">{order.buyerPhone}</p>}
                        {order.buyerEmail && <p className="text-sm text-foreground">{order.buyerEmail}</p>}
                      </div>
                      {order.shippingInfo && (
                        <div>
                          <p className="text-sm font-medium text-muted-foreground mb-1">Shipping Info</p>
                          <p className="font-semibold text-foreground">{order.shippingInfo.courierName}</p>
                          <p className="text-sm text-foreground">Tracking: {order.shippingInfo.trackingNumber}</p>
                          {order.shippingInfo.estimatedDelivery && (
                            <p className="text-sm text-muted-foreground">Est. delivery: {order.shippingInfo.estimatedDelivery}</p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2">
                      {needsAction && (
                        <>
                          <button
                            onClick={() => handleAccept(order.id)}
                            disabled={actionLoading === order.id}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-null-lg hover:bg-green-700 transition font-medium disabled:opacity-50"
                          >
                            {actionLoading === order.id ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                            Accept Order
                          </button>
                          <button
                            onClick={() => handleReject(order.id)}
                            disabled={actionLoading === order.id}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-null-lg hover:bg-red-700 transition font-medium disabled:opacity-50"
                          >
                            <X size={16} />
                            Reject
                          </button>
                        </>
                      )}
                      {canShip && (
                        <button
                          onClick={() => setShippingModal(order)}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-null-lg hover:bg-purple-700 transition font-medium"
                        >
                          <Truck size={16} />
                          Add Shipping Info
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Shipping Modal */}
      {shippingModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-null-xl p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-foreground">Add Shipping Info</h3>
              <button 
                onClick={() => setShippingModal(null)}
                className="p-1 hover:bg-muted rounded-null-lg transition"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Courier/Shipping Company *</label>
                <input
                  type="text"
                  value={shippingForm.courierName}
                  onChange={(e) => setShippingForm(prev => ({ ...prev, courierName: e.target.value }))}
                  placeholder="e.g., G4S, DHL, Wells Fargo"
                  className="w-full px-4 py-2 rounded-null-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Tracking Number *</label>
                <input
                  type="text"
                  value={shippingForm.trackingNumber}
                  onChange={(e) => setShippingForm(prev => ({ ...prev, trackingNumber: e.target.value }))}
                  placeholder="Enter tracking number"
                  className="w-full px-4 py-2 rounded-null-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Estimated Delivery Date</label>
                <input
                  type="date"
                  value={shippingForm.estimatedDeliveryDate}
                  onChange={(e) => setShippingForm(prev => ({ ...prev, estimatedDeliveryDate: e.target.value }))}
                  className="w-full px-4 py-2 rounded-null-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShippingModal(null)}
                className="flex-1 px-4 py-2 border border-input rounded-null-lg hover:bg-muted transition font-medium text-foreground"
              >
                Cancel
              </button>
              <button
                onClick={handleAddShipping}
                disabled={actionLoading === shippingModal.id}
                className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-null-lg hover:bg-primary/90 transition font-medium flex items-center justify-center gap-2"
              >
                {actionLoading === shippingModal.id ? <Loader2 size={18} className="animate-spin" /> : <Truck size={18} />}
                Mark as Shipped
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
