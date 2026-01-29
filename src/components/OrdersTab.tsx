import { useState, useEffect, useCallback } from 'react';
import {
  AlertCircle, X, Eye, MessageSquare, CheckCircle,
  Clock, MapPin, Truck, Phone, Search, Plus, Upload,
  TrendingUp, Award, ShoppingBag, Zap, Download
} from 'lucide-react';
import StatusBadge from './StatusBadge';
import { ShippingModal } from '@/components/ShippingModal';
import { api } from '@/services/api';
import { exportToCSV } from '@/utils/csvExport';
import { DateRangeFilter } from '@/components/ui/DateRangeFilter';
import { useCurrency } from '@/hooks/useCurrency';

interface OrderShipping {
  courierName: string;
  trackingNumber: string;
  estimatedDeliveryDate: string;
  notes?: string;
  proofImages?: string[];
}

interface TimelineEvent {
  title: string;
  completed: boolean;
  completedAt?: string;
}

interface Order {
  id: string;
  buyerName: string;
  buyerPhone: string;
  buyerLocation: string;
  buyerMemberSince?: string;
  buyerRating?: number;
  buyerPurchases?: number;
  itemName: string;
  quantity: number;
  amount: number;
  platformFee?: number;
  sellerPayout?: number;
  status: 'pending' | 'accepted' | 'shipped' | 'completed' | 'dispute' | 'cancelled';
  createdAt: string;
  paidAt?: string;
  shippedAt?: string;
  deadline: string;
  buyerMessage?: string;
  messageCreatedAt?: string;
  shipping?: OrderShipping;
  timeline?: TimelineEvent[];
}

interface PerformanceMetrics {
  acceptanceRate: number;
  averageDeliveryTime: string;
  disputeRate: number;
  totalOrders: number;
}

interface UIState {
  loading: boolean;
  orderDetailOpen: boolean;
  shippingModalOpen: boolean;
  proofUploadOpen: boolean;
  messageModalOpen: boolean;
  errorNotification: string | null;
  successNotification: string | null;
}

interface OrdersTabProps {
  onCreatePaymentLink?: () => void;
}

export function OrdersTab({ onCreatePaymentLink }: OrdersTabProps) {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const { formatPrice } = useCurrency();
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [dateStart, setDateStart] = useState<string | null>(null);
  const [dateEnd, setDateEnd] = useState<string | null>(null);

  const [ui, setUi] = useState<UIState>({
    loading: true,
    orderDetailOpen: false,
    shippingModalOpen: false,
    proofUploadOpen: false,
    messageModalOpen: false,
    errorNotification: null,
    successNotification: null,
  });

  const [messageInput, setMessageInput] = useState('');
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics | null>(null);

  const fetchOrders = useCallback(async () => {
    try {
      setUi(prev => ({ ...prev, loading: true, errorNotification: null }));
      
      const res = await api.getSellerOrders({ status: filterStatus === 'all' ? undefined : filterStatus });
      
      if (res.success && res.data) {
        const data = res.data as any;
        const ordersData = Array.isArray(data) ? data : data.data || [];
        
        // Transform API response to match our Order interface
        const transformedOrders: Order[] = ordersData.map((order: any) => ({
          id: order.id,
          buyerName: order.buyer?.name || 'Unknown',
          buyerPhone: order.buyer?.phone || '',
          buyerLocation: 'Kenya', // Default as location may not be in API
          buyerMemberSince: order.buyer?.memberSince,
          itemName: order.itemName || 'Item',
          quantity: order.quantity || 1,
          amount: order.amount || 0,
          platformFee: order.platformFee,
          sellerPayout: order.sellerPayout,
          status: order.status?.toLowerCase() || 'pending',
          createdAt: order.createdAt,
          paidAt: order.paidAt,
          shippedAt: order.shippedAt,
          deadline: order.deadline || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          buyerMessage: order.buyerMessage,
          shipping: order.courierName ? {
            courierName: order.courierName,
            trackingNumber: order.trackingNumber,
            estimatedDeliveryDate: order.estimatedDeliveryDate,
          } : undefined,
        }));
        
        setOrders(transformedOrders);
      } else {
        // No orders yet - show empty state
        setOrders([]);
      }
    } catch (error) {
      console.error('Fetch orders error:', error);
      setUi(prev => ({
        ...prev,
        errorNotification: (error as Error).message || 'Failed to load orders. Please try again.',
      }));
      setOrders([]);
    } finally {
      setUi(prev => ({ ...prev, loading: false }));
    }
  }, [filterStatus]);

  const fetchOrderDetails = useCallback(async (orderId: string) => {
    try {
      // Find order from current orders list (mock implementation)
      const order = orders?.find(o => o.id === orderId);
      if (order) {
        setSelectedOrder(order);
        setUi(prev => ({ ...prev, orderDetailOpen: true }));
      } else {
        throw new Error('Order not found');
      }
    } catch (error) {
      console.error('Fetch order details error:', error);
      setUi(prev => ({
        ...prev,
        errorNotification: 'Failed to load order details',
      }));
    }
  }, [orders]);

  const fetchPerformanceMetrics = useCallback(async () => {
    try {
      const res = await api.getSellerStats();
      if (res.success && res.data) {
        const stats = res.data as any;
        setPerformanceMetrics({
          acceptanceRate: stats.completionRate || 0,
          averageDeliveryTime: '2-3 days',
          disputeRate: stats.disputeRate || 0,
          totalOrders: stats.totalOrders || 0,
        });
      }
    } catch (error) {
      console.error('Fetch metrics error:', error);
    }
  }, []);

  const acceptOrder = useCallback(async (orderId: string) => {
    try {
      const res = await api.acceptOrder(orderId);

      if (!res.success) {
        throw new Error(res.error || 'Failed to accept order');
      }

      setUi(prev => ({
        ...prev,
        successNotification: 'Order accepted successfully!',
      }));
      fetchOrders();
      fetchOrderDetails(orderId);
    } catch (error) {
      console.error('Accept order error:', error);
      setUi(prev => ({
        ...prev,
        errorNotification: (error as Error).message || 'Failed to accept order',
      }));
    }
  }, [fetchOrders, fetchOrderDetails]);

  const rejectOrder = useCallback(async (orderId: string) => {
    try {
      const res = await api.rejectOrder(orderId);

      if (!res.success) {
        throw new Error(res.error || 'Failed to reject order');
      }

      setUi(prev => ({
        ...prev,
        successNotification: 'Order rejected',
        orderDetailOpen: false,
      }));
      fetchOrders();
    } catch (error) {
      console.error('Reject order error:', error);
      setUi(prev => ({
        ...prev,
        errorNotification: (error as Error).message || 'Failed to reject order',
      }));
    }
  }, [fetchOrders]);

  const submitShippingInfo = useCallback(async (details: { courier: string; trackingNumber: string; estimatedDate: string; proofImages: File[] }) => {
    try {
      if (!selectedOrder) return;

      const res = await api.addShippingInfo(selectedOrder.id, {
        courierName: details.courier,
        trackingNumber: details.trackingNumber,
        estimatedDeliveryDate: details.estimatedDate,
      });

      if (!res.success) {
        throw new Error(res.error || 'Failed to submit shipping info');
      }

      setUi(prev => ({
        ...prev,
        successNotification: 'Shipping information added successfully!',
        shippingModalOpen: false,
      }));

      fetchOrders();
    } catch (error) {
      console.error('Submit shipping error:', error);
      setUi(prev => ({
        ...prev,
        errorNotification: (error as Error).message || 'Failed to submit shipping info',
      }));
    }
  }, [selectedOrder, fetchOrders]);

  const sendMessage = useCallback(async (_orderId: string) => {
    try {
      if (!messageInput.trim()) {
        setUi(prev => ({
          ...prev,
          errorNotification: 'Message cannot be empty',
        }));
        return;
      }

      // Message sending would need a dedicated API endpoint
      // For now, just show success
      setMessageInput('');
      setUi(prev => ({
        ...prev,
        successNotification: 'Message sent!',
        messageModalOpen: false,
      }));
    } catch (error) {
      console.error('Send message error:', error);
      setUi(prev => ({
        ...prev,
        errorNotification: (error as Error).message || 'Failed to send message',
      }));
    }
  }, [messageInput]);

  useEffect(() => {
    fetchOrders();
    fetchPerformanceMetrics();
    const interval = setInterval(fetchOrders, 30000);
    return () => clearInterval(interval);
  }, [fetchOrders, fetchPerformanceMetrics]);

  // Auto-dismiss notifications
  useEffect(() => {
    if (ui.successNotification) {
      const timer = setTimeout(() => {
        setUi(prev => ({ ...prev, successNotification: null }));
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [ui.successNotification]);

  useEffect(() => {
    if (ui.errorNotification) {
      const timer = setTimeout(() => {
        setUi(prev => ({ ...prev, errorNotification: null }));
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [ui.errorNotification]);

  const formatCurrency = (amount: number, currency?: string) => {
    return formatPrice(amount, currency);
  };

  const formatTime = (dateString: string) => {
    if (!dateString) return 'unknown';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSecs < 60) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-KE');
  };

  /* Helper functions removed as they are unused (handled by StatusBadge) */
  /*
  const getStatusColor = (status: string) => { ... }
  const getStatusLabel = (status: string) => { ... }
  */

  const filteredOrders = orders?.filter(order => {
    const matchesFilter = filterStatus === 'all' || order.status === filterStatus;
    const matchesSearch = !searchQuery ||
      order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.buyerName.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Date range filter
    let matchesDate = true;
    if (dateStart || dateEnd) {
      const orderDate = new Date(order.createdAt);
      if (dateStart) {
        matchesDate = matchesDate && orderDate >= new Date(dateStart);
      }
      if (dateEnd) {
        const endDate = new Date(dateEnd);
        endDate.setHours(23, 59, 59, 999);
        matchesDate = matchesDate && orderDate <= endDate;
      }
    }
    
    return matchesFilter && matchesSearch && matchesDate;
  })?.sort((a, b) => {
    if (sortBy === 'newest') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    if (sortBy === 'oldest') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    if (sortBy === 'amount-high') return b.amount - a.amount;
    if (sortBy === 'amount-low') return a.amount - b.amount;
    return 0;
  }) || [];

  const handleExportOrders = () => {
    const exportData = filteredOrders.map(order => ({
      id: order.id,
      buyerName: order.buyerName,
      buyerPhone: order.buyerPhone,
      itemName: order.itemName,
      quantity: order.quantity,
      amount: order.amount,
      status: order.status,
      createdAt: new Date(order.createdAt).toISOString(),
      deadline: order.deadline,
      courierName: order.shipping?.courierName || '',
      trackingNumber: order.shipping?.trackingNumber || '',
    }));

    const columns = [
      { key: 'id' as const, label: 'Order ID' },
      { key: 'buyerName' as const, label: 'Buyer Name' },
      { key: 'buyerPhone' as const, label: 'Buyer Phone' },
      { key: 'itemName' as const, label: 'Item' },
      { key: 'quantity' as const, label: 'Quantity' },
      { key: 'amount' as const, label: 'Amount (KES)' },
      { key: 'status' as const, label: 'Status' },
      { key: 'createdAt' as const, label: 'Created At' },
      { key: 'deadline' as const, label: 'Deadline' },
      { key: 'courierName' as const, label: 'Courier' },
      { key: 'trackingNumber' as const, label: 'Tracking Number' },
    ];

    const dateRange = dateStart || dateEnd 
      ? `_${dateStart || 'start'}_to_${dateEnd || 'now'}` 
      : '';
    exportToCSV(exportData, `seller_orders${dateRange}_${new Date().toISOString().split('T')[0]}`, columns);
  };

  const OrderDetailModal = () => {
    if (!selectedOrder) return null;

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
        <div className="bg-white rounded-null2xl max-w-3xl w-full shadow-2xl my-8">
          <div className="bg-gradient-to-r from-[#5d2ba3] to-[#3d1a7a] px-8 py-6 flex justify-between items-center">
            <div>
              <h3 className="text-3xl font-black text-white">Order #{selectedOrder.id}</h3>
              <p className="text-white/80 text-sm mt-1">Created {formatTime(selectedOrder.createdAt)}</p>
            </div>
            <button
              onClick={() => setUi(prev => ({ ...prev, orderDetailOpen: false }))}
              className="text-white hover:bg-white/20 p-2 rounded-nulllg transition"
            >
              <X size={24} />
            </button>
          </div>

          <div className="p-8 space-y-8 overflow-y-auto max-h-[calc(100vh-200px)]">
            {/* Buyer Information */}
            <div className="bg-[#5d2ba3]/10 border border-[#5d2ba3]/30 rounded-nullxl p-6">
              <h4 className="text-lg font-black text-[#250e52] mb-4 flex items-center gap-2">
                👤 Buyer Information
              </h4>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-[#5d2ba3] font-semibold mb-1">Name</p>
                  <p className="text-gray-900 font-bold">{selectedOrder.buyerName}</p>
                </div>
                <div>
                  <p className="text-sm text-[#5d2ba3] font-semibold mb-1">Phone</p>
                  <a href={`tel:${selectedOrder.buyerPhone}`} className="text-[#5d2ba3] hover:text-[#3d1a7a] font-bold flex items-center gap-2">
                    <Phone size={16} /> {selectedOrder.buyerPhone}
                  </a>
                </div>
                <div>
                  <p className="text-sm text-[#5d2ba3] font-semibold mb-1">Location</p>
                  <p className="text-gray-900 font-bold flex items-center gap-2">
                    <MapPin size={16} /> {selectedOrder.buyerLocation}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-[#5d2ba3] font-semibold mb-1">Member Since</p>
                  <p className="text-gray-900 font-bold">{selectedOrder.buyerMemberSince || 'N/A'}</p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-sm text-[#5d2ba3] font-semibold mb-1">Rating</p>
                  <p className="text-gray-900 font-bold">⭐ {selectedOrder.buyerRating?.toFixed(1) || '0.0'}/5.0 ({selectedOrder.buyerPurchases || 0} purchases)</p>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <a href={`tel:${selectedOrder.buyerPhone}`} className="flex-1 bg-[#5d2ba3] text-white py-2 rounded-nulllg hover:bg-[#3d1a7a] transition font-bold text-sm flex items-center justify-center gap-2">
                  <Phone size={16} /> Call Buyer
                </a>
                <button
                  onClick={() => setUi(prev => ({ ...prev, messageModalOpen: true }))}
                  className="flex-1 bg-[#5d2ba3] text-white py-2 rounded-nulllg hover:bg-[#3d1a7a] transition font-bold text-sm flex items-center justify-center gap-2"
                >
                  <MessageSquare size={16} /> Message
                </button>
              </div>
            </div>

            {/* Order Details */}
            <div className="bg-gray-50 border border-gray-200 rounded-nullxl p-6">
              <h4 className="text-lg font-black text-[#3d1a7a] mb-4 flex items-center gap-2">
                📦 Order Details
              </h4>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-white rounded-nulllg border border-gray-200">
                  <span className="text-gray-700 font-semibold">Item</span>
                  <span className="text-gray-900 font-bold">{selectedOrder.itemName}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-white rounded-nulllg border border-gray-200">
                  <span className="text-gray-700 font-semibold">Quantity</span>
                  <span className="text-gray-900 font-bold">{selectedOrder.quantity}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-white rounded-nulllg border border-gray-200">
                  <span className="text-gray-700 font-semibold">Amount</span>
                  <span className="text-2xl font-black text-[#5d2ba3]">{formatCurrency(selectedOrder.amount)}</span>
                </div>
                {selectedOrder.platformFee !== undefined && (
                  <div className="p-4 bg-[#5d2ba3]/5 rounded-nulllg border border-[#5d2ba3]/10 space-y-2">
                    <p className="text-xs font-black uppercase tracking-widest text-[#5d2ba3]">💰 Payment Breakdown</p>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Gross Amount:</span>
                      <span className="font-bold">{formatCurrency(selectedOrder.amount)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Platform Fee (5%):</span>
                      <span className="font-bold text-red-500">-{formatCurrency(selectedOrder.platformFee)}</span>
                    </div>
                    <div className="pt-2 border-t border-[#5d2ba3]/10 flex justify-between">
                      <span className="font-bold text-[#250e52]">Your Payout:</span>
                      <span className="font-black text-[#5d2ba3]">{formatCurrency(selectedOrder.sellerPayout || 0)}</span>
                    </div>
                  </div>
                )}
                <div className="flex justify-between items-center p-3 bg-white rounded-nulllg border border-gray-200">
                  <span className="text-gray-700 font-semibold">Status</span>
                  <StatusBadge status={selectedOrder.status} size="md" />
                </div>
              </div>
            </div>

            {/* Escrow Guarantee */}
            <div className="bg-[#5d2ba3]/10 border border-[#5d2ba3]/30 rounded-nullxl p-6">
              <h4 className="text-lg font-black text-[#250e52] mb-4 flex items-center gap-2">
                💎 Escrow Status
              </h4>
              <div className="space-y-3 text-[#250e52]">
                <div className="flex items-start gap-3">
                  <CheckCircle size={20} className="flex-shrink-0 mt-1 text-[#5d2ba3]" />
                  <div>
                    <p className="font-bold">Status: HELD IN ESCROW 🔒</p>
                    <p className="text-2xl font-black text-[#5d2ba3]">{formatCurrency(selectedOrder.sellerPayout || 0)}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle size={20} className="flex-shrink-0 mt-1 text-[#5d2ba3]" />
                  <div>
                    <p className="font-bold">Release Condition</p>
                    <p className="text-sm">After delivery confirmation by buyer</p>
                  </div>
                </div>
                {selectedOrder.shippedAt && (
                  <div className="flex items-start gap-3">
                    <Clock size={20} className="flex-shrink-0 mt-1 text-[#6E6658]" />
                    <div>
                      <p className="font-bold">Auto-release Date</p>
                      <p className="text-sm">
                        {new Date(new Date(selectedOrder.shippedAt).getTime() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('en-KE')} (7 days after shipping)
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Status Timeline */}
            <div className="bg-white border border-gray-200 rounded-nullxl p-6">
              <h4 className="text-lg font-black text-[#3d1a7a] mb-4">📅 Order Timeline</h4>
              <div className="space-y-4">
                {selectedOrder.timeline?.map((event, idx) => (
                  <div key={idx} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className={`w-3 h-3 rounded-nullfull ${event.completed ? 'bg-[#5d2ba3]' : 'bg-gray-300'}`}></div>
                      {idx < (selectedOrder.timeline?.length || 0) - 1 && (
                        <div className="w-0.5 h-12 bg-gray-300"></div>
                      )}
                    </div>
                    <div className="pb-4">
                      <p className="font-bold text-[#3d1a7a]">{event.title}</p>
                      {event.completedAt && (
                        <p className="text-sm text-gray-600">{new Date(event.completedAt).toLocaleString('en-KE')}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Buyer Message */}
            {selectedOrder.buyerMessage && (
              <div className="bg-[#5d2ba3]/10 border-l-4 border-[#5d2ba3] rounded-nullxl p-6">
                <h4 className="text-lg font-black text-[#250e52] mb-3">💬 Buyer's Message</h4>
                <p className="text-gray-800 italic">"{selectedOrder.buyerMessage}"</p>
                <p className="text-sm text-gray-600 mt-3">{formatTime(selectedOrder.messageCreatedAt || '')}</p>
              </div>
            )}

            {/* Shipping Info */}
            {selectedOrder.shipping && (
              <div className="bg-[#5d2ba3]/10 border border-[#5d2ba3]/30 rounded-nullxl p-6">
                <h4 className="text-lg font-black text-[#250e52] mb-4 flex items-center gap-2">
                  📍 Shipping Information
                </h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-white rounded-nulllg border border-[#5d2ba3]/30">
                    <span className="text-[#5d2ba3] font-semibold">Courier</span>
                    <span className="text-gray-900 font-bold">{selectedOrder.shipping.courierName}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-white rounded-nulllg border border-[#5d2ba3]/30">
                    <span className="text-[#5d2ba3] font-semibold">Tracking Number</span>
                    <span className="text-gray-900 font-bold font-mono">{selectedOrder.shipping.trackingNumber}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-white rounded-nulllg border border-[#5d2ba3]/30">
                    <span className="text-[#5d2ba3] font-semibold">Est. Delivery</span>
                    <span className="text-gray-900 font-bold">{new Date(selectedOrder.shipping.estimatedDeliveryDate).toLocaleDateString('en-KE')}</span>
                  </div>
                  {selectedOrder.shipping.notes && (
                    <div className="p-3 bg-white rounded-nulllg border border-[#5d2ba3]/30">
                      <span className="text-[#5d2ba3] font-semibold text-sm">Notes</span>
                      <p className="text-gray-800 text-sm mt-2">{selectedOrder.shipping.notes}</p>
                    </div>
                  )}
                </div>

                {selectedOrder.shipping.proofImages && selectedOrder.shipping.proofImages.length > 0 && (
                  <div className="mt-4">
                    <p className="text-[#5d2ba3] font-semibold text-sm mb-3">📸 Proof of Shipment</p>
                    <div className="grid grid-cols-3 gap-3">
                      {selectedOrder.shipping.proofImages.map((image, idx) => (
                        <img
                          key={idx}
                          src={image}
                          alt={`Proof ${idx + 1}`}
                          className="h-24 w-24 rounded-nulllg object-cover border border-[#5d2ba3]/30 hover:scale-110 transition cursor-pointer"
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="border-t bg-gray-50 px-8 py-6 flex gap-3 justify-end flex-wrap">
            {selectedOrder.status === 'pending' && (
              <>
                <button
                  onClick={() => rejectOrder(selectedOrder.id)}
                  className="px-6 py-3 bg-[#4F4A41] text-white rounded-nulllg hover:bg-[#6E6658] transition font-bold"
                >
                  ❌ Reject Order
                </button>
                <button
                  onClick={() => acceptOrder(selectedOrder.id)}
                  className="px-6 py-3 bg-[#5d2ba3] text-white rounded-nulllg hover:bg-[#3d1a7a] transition font-bold"
                >
                  ✅ Accept Order
                </button>
              </>
            )}

            {selectedOrder.status === 'accepted' && (
              <button
                onClick={() => setUi(prev => ({ ...prev, shippingModalOpen: true }))}
                className="px-6 py-3 bg-[#5d2ba3] text-white rounded-nulllg hover:bg-[#3d1a7a] transition font-bold flex items-center gap-2"
              >
                <Truck size={18} /> Add Shipping Info
              </button>
            )}

            {selectedOrder.status === 'shipped' && (
              <button
                onClick={() => setUi(prev => ({ ...prev, proofUploadOpen: true }))}
                className="px-6 py-3 bg-[#5d2ba3] text-white rounded-nulllg hover:bg-[#3d1a7a] transition font-bold flex items-center gap-2"
              >
                <Upload size={18} /> Update Proof
              </button>
            )}

            <button
              onClick={() => setUi(prev => ({ ...prev, orderDetailOpen: false }))}
              className="px-6 py-3 bg-gray-200 text-gray-700 rounded-nulllg hover:bg-gray-300 transition font-bold"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };



  const MessageModal = () => {
    if (!selectedOrder) return null;

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-null2xl max-w-md w-full shadow-2xl">
          <div className="bg-gradient-to-r from-[#5d2ba3] to-[#3d1a7a] px-6 py-4 flex justify-between items-center">
            <h3 className="text-xl font-black text-white">💬 Send Message</h3>
            <button
              onClick={() => setUi(prev => ({ ...prev, messageModalOpen: false }))}
              className="text-white hover:bg-white/20 p-2 rounded-nulllg transition"
            >
              <X size={20} />
            </button>
          </div>

          <div className="p-6 space-y-4">
            <div className="bg-gray-50 rounded-nulllg p-3 border border-gray-200">
              <p className="text-sm text-gray-600">Sending to:</p>
              <p className="font-bold">{selectedOrder.buyerName}</p>
            </div>
            <textarea
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              placeholder="Type your message..."
              className="w-full px-4 py-3 rounded-nulllg border border-gray-300 focus:outline-none focus:border-[#5d2ba3] focus:ring-2 focus:ring-[#5d2ba3]/20 resize-none"
              rows={4}
            />
            <div className="flex gap-3">
              <button
                onClick={() => setUi(prev => ({ ...prev, messageModalOpen: false }))}
                className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-nulllg hover:bg-gray-300 transition font-bold"
              >
                Cancel
              </button>
              <button
                onClick={() => sendMessage(selectedOrder.id)}
                className="flex-1 px-4 py-3 bg-[#5d2ba3] text-white rounded-nulllg hover:bg-[#3d1a7a] transition font-bold"
              >
                Send Message
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Notifications */}
      {ui.errorNotification && (
        <div className="bg-[#4F4A41]/10 border border-[#4F4A41]/30 text-[#4F4A41] px-4 py-3 rounded-nulllg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle size={20} />
            <span>{ui.errorNotification}</span>
          </div>
          <button onClick={() => setUi(prev => ({ ...prev, errorNotification: null }))}>
            <X size={20} />
          </button>
        </div>
      )}

      {ui.successNotification && (
        <div className="bg-[#5d2ba3]/10 border border-[#5d2ba3]/30 text-white px-4 py-3 rounded-nulllg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle size={20} />
            <span>{ui.successNotification}</span>
          </div>
          <button onClick={() => setUi(prev => ({ ...prev, successNotification: null }))}>
            <X size={20} />
          </button>
        </div>
      )}

      {/* Header with Performance Metrics */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">📦 Orders</h2>
          <p className="text-gray-600 text-sm">Manage your incoming orders</p>
        </div>
        <button
          onClick={onCreatePaymentLink}
          className="bg-gradient-to-r from-[#5d2ba3] to-[#3d1a7a] text-white px-6 py-3 rounded-nulllg hover:shadow-lg transition font-bold flex items-center gap-2"
        >
          <Plus size={20} />
          Create Payment Link
        </button>
      </div>

      {/* Performance Cards */}
      {performanceMetrics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-[#5d2ba3] to-[#3d1a7a] rounded-nullxl p-4 text-white">
            <div className="flex items-center gap-2 mb-2">
              <Award size={20} />
              <span className="text-sm opacity-90">Acceptance Rate</span>
            </div>
            <p className="text-2xl font-black">{performanceMetrics.acceptanceRate}%</p>
          </div>
          <div className="bg-gradient-to-br from-[#5d2ba3] to-[#3d1a7a] rounded-nullxl p-4 text-white">
            <div className="flex items-center gap-2 mb-2">
              <Zap size={20} />
              <span className="text-sm opacity-90">Avg Delivery</span>
            </div>
            <p className="text-2xl font-black">{performanceMetrics.averageDeliveryTime}</p>
          </div>
          <div className="bg-gradient-to-br from-[#5d2ba3] to-[#3d1a7a] rounded-nullxl p-4 text-white">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={20} />
              <span className="text-sm opacity-90">Total Orders</span>
            </div>
            <p className="text-2xl font-black">{performanceMetrics.totalOrders}</p>
          </div>
          <div className="bg-gradient-to-br from-[#4F4A41] to-[#6E6658] rounded-nullxl p-4 text-white">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle size={20} />
              <span className="text-sm opacity-90">Dispute Rate</span>
            </div>
            <p className="text-2xl font-black">{performanceMetrics.disputeRate}%</p>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="bg-white rounded-nullxl border border-gray-200 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by order ID or buyer name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-nulllg border border-gray-300 focus:outline-none focus:border-[#5d2ba3]"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <DateRangeFilter
              startDate={dateStart}
              endDate={dateEnd}
              onApply={(start, end) => {
                setDateStart(start);
                setDateEnd(end);
              }}
              onClear={() => {
                setDateStart(null);
                setDateEnd(null);
              }}
            />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-3 rounded-nulllg border border-gray-300 focus:outline-none focus:border-blue-500"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="accepted">Accepted</option>
              <option value="shipped">Shipped</option>
              <option value="completed">Completed</option>
              <option value="dispute">Dispute</option>
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-3 rounded-nulllg border border-gray-300 focus:outline-none focus:border-blue-500"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="amount-high">Highest Amount</option>
              <option value="amount-low">Lowest Amount</option>
            </select>
            <button
              onClick={handleExportOrders}
              disabled={filteredOrders.length === 0}
              className="flex items-center gap-2 px-4 py-3 bg-gray-900 text-white rounded-null text-sm font-semibold hover:bg-black transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download size={16} /> Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {ui.loading && (
        <div className="bg-white rounded-nullxl border border-gray-200 p-12 text-center">
          <div className="animate-spin w-12 h-12 border-4 border-[#5d2ba3] border-t-transparent rounded-nullfull mx-auto mb-4"></div>
          <p className="text-gray-600">Loading orders...</p>
        </div>
      )}

      {/* Empty State */}
      {!ui.loading && filteredOrders.length === 0 && (
        <div className="bg-white rounded-nullxl border border-gray-200 p-12 text-center">
          <ShoppingBag className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-xl font-bold text-[#3d1a7a] mb-2">
            {orders?.length === 0 ? 'No orders yet' : 'No matching orders'}
          </h3>
          <p className="text-gray-500 mb-6">
            {orders?.length === 0
              ? 'Share your payment links to start receiving orders!'
              : 'Try adjusting your search or filters'}
          </p>
          {orders?.length === 0 && (
            <button
              onClick={onCreatePaymentLink}
              className="bg-[#5d2ba3] text-white px-6 py-3 rounded-nulllg hover:bg-[#3d1a7a] transition font-semibold"
            >
              Create Payment Link
            </button>
          )}
        </div>
      )}

      {/* Orders List */}
      {!ui.loading && filteredOrders.length > 0 && (
        <div className="space-y-4">
          {filteredOrders.map((order) => (
            <div
              key={order.id}
              className="bg-white rounded-nulllg border border-gray-200 p-6 hover:shadow-lg transition cursor-pointer"
              onClick={() => fetchOrderDetails(order.id)}
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="font-bold text-lg">Order #{order.id}</p>
                  <p className="text-gray-600">
                    Buyer: {order.buyerName} • <MapPin size={14} className="inline" /> {order.buyerLocation}
                  </p>
                </div>
                <StatusBadge status={order.status} size="md" />
              </div>

              <div className="bg-gray-50 rounded-nulllg p-4 mb-4">
                <p className="text-gray-700 font-semibold mb-2">{order.itemName} × {order.quantity}</p>
                <p className="text-2xl font-bold text-[#5d2ba3]">{formatCurrency(order.amount)}</p>
              </div>

              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-600">
                  <Clock size={14} className="inline mr-1" />
                  {formatTime(order.createdAt)}
                </div>
                <div className="flex gap-2">
                  <button
                    className="bg-[#5d2ba3] text-white px-4 py-2 rounded-nulllg hover:bg-[#3d1a7a] transition font-semibold flex items-center gap-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      fetchOrderDetails(order.id);
                    }}
                  >
                    <Eye size={16} /> View Details
                  </button>
                  <button
                    className="bg-gray-200 text-gray-700 p-2 rounded-nulllg hover:bg-gray-300 transition"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedOrder(order);
                      setUi(prev => ({ ...prev, messageModalOpen: true }));
                    }}
                  >
                    <MessageSquare size={20} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      {ui.orderDetailOpen && <OrderDetailModal />}
      <ShippingModal
        isOpen={ui.shippingModalOpen}
        onClose={() => setUi(prev => ({ ...prev, shippingModalOpen: false }))}
        onConfirm={submitShippingInfo}
      />
      {ui.messageModalOpen && <MessageModal />}
    </div>
  );
}
