import { SearchIcon, EyeIcon, LoaderIcon, XCircleIcon, RadioIcon, CheckCircleIcon, AlertTriangleIcon, XIcon } from '@/components/icons';
import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import StatusBadge from '../StatusBadge';
import { api } from '@/services/api';
import { useToast } from '@/hooks/use-toast';
import { useCurrency } from '@/hooks/useCurrency';

interface BuyerOrdersProps {
  orders: any[];
  loading: boolean;
  error: string | null;
  isConnected?: boolean;
  onRefresh?: () => void;
}

export function BuyerOrders({ orders, loading, error, isConnected = false, onRefresh }: BuyerOrdersProps) {
  const { toast } = useToast();
  const { formatPrice } = useCurrency();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);
  const [confirmingDelivery, setConfirmingDelivery] = useState<string | null>(null);
  const [deliveryOTP, setDeliveryOTP] = useState('');
  const [openingDispute, setOpeningDispute] = useState<string | null>(null);
  const [disputeReason, setDisputeReason] = useState('');
  const [disputeDescription, setDisputeDescription] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Safely filter orders with null checks
  const filteredOrders = (orders || []).filter(order => {
    const itemName = order?.itemName || '';
    const orderId = order?.id || '';
    const sellerName = order?.seller?.name || '';

    return itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      orderId.includes(searchTerm) ||
      sellerName.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const handleConfirmDelivery = useCallback(async (orderId: string) => {
    if (!deliveryOTP.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter the delivery OTP',
        variant: 'destructive',
      });
      return;
    }

    setActionLoading(true);
    try {
      const response = await api.confirmBuyerDelivery(orderId, deliveryOTP);
      if (response.success) {
        toast({
          title: 'Delivery Confirmed!',
          description: 'Thank you for confirming. Payment has been released to the seller.',
        });
        setConfirmingDelivery(null);
        setDeliveryOTP('');
        onRefresh?.();
      } else {
        toast({
          title: 'Error',
          description: response.error || 'Failed to confirm delivery',
          variant: 'destructive',
        });
      }
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to confirm delivery. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(false);
    }
  }, [deliveryOTP, toast, onRefresh]);

  const handleOpenDispute = useCallback(async (orderId: string) => {
    if (!disputeReason.trim()) {
      toast({
        title: 'Error',
        description: 'Please select a reason for the dispute',
        variant: 'destructive',
      });
      return;
    }

    setActionLoading(true);
    try {
      const response = await api.openBuyerDispute({
        transactionId: orderId,
        reason: disputeReason,
        description: disputeDescription,
      });
      if (response.success) {
        toast({
          title: 'Dispute Opened',
          description: 'Our team will review your case within 24-48 hours.',
        });
        setOpeningDispute(null);
        setDisputeReason('');
        setDisputeDescription('');
        onRefresh?.();
      } else {
        toast({
          title: 'Error',
          description: response.error || 'Failed to open dispute',
          variant: 'destructive',
        });
      }
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to open dispute. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(false);
    }
  }, [disputeReason, disputeDescription, toast, onRefresh]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoaderIcon size={32} className="animate-spin text-[#5d2ba3]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-[#4F4A41]/10 border border-[#4F4A41]/30 rounded-null p-6 text-[#4F4A41]">
        <p className="font-bold">Failed to load orders</p>
        <p className="text-sm">{error}</p>
        <button
          onClick={onRefresh}
          className="mt-4 px-4 py-2 bg-[#3d1a7a] text-white rounded-null text-sm hover:bg-[#250e52] transition"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-[#3d1a7a]">My Purchases</h2>
          <p className="text-sm text-gray-500">{(orders || []).length} total orders</p>
        </div>
        {/* Live Connection Status */}
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-null-full text-xs font-medium transition-all ${isConnected
          ? 'bg-[#5d2ba3]/20 text-[#5d2ba3] border border-[#5d2ba3]/30'
          : 'bg-gray-100 text-gray-500 border border-gray-200'
          }`}>
          {isConnected ? (
            <>
              <RadioIcon size={14} className="animate-pulse" />
              Live Updates
            </>
          ) : (
            <>
              <XCircleIcon size={14} />
              Offline
            </>
          )}
        </div>
      </div>

      <div className="bg-white rounded-null border border-gray-200 shadow-sm overflow-hidden">
        {/* Search */}
        <div className="p-4 border-b border-gray-200">
          <div className="relative max-w-md">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search by item, ID, or seller..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-null focus:outline-none focus:border-[#3d1a7a] text-sm"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-semibold">
              <tr>
                <th className="px-6 py-4">Order ID</th>
                <th className="px-6 py-4">Item</th>
                <th className="px-6 py-4">Seller</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredOrders.length > 0 ? (
                filteredOrders.map((order) => (
                  <tr
                    key={order.id}
                    className={`transition-all duration-500 ${order.lastUpdateLive
                      ? 'bg-[#5d2ba3]/10 animate-pulse'
                      : 'hover:bg-gray-50'
                      } ${selectedOrder === order.id ? 'ring-2 ring-[#5d2ba3] ring-inset' : ''}`}
                  >
                    <td className="px-6 py-4 font-mono text-sm font-medium text-gray-900">
                      <div className="flex items-center gap-2">
                        {order.lastUpdateLive && (
                          <span className="w-2 h-2 bg-[#5d2ba3] rounded-null-full animate-ping" />
                        )}
                        {order.id.slice(0, 8)}...
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {order.itemName || 'Unknown Item'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        <p className="font-semibold text-gray-900">{order.seller?.name || 'Unknown Seller'}</p>
                        <p className="text-xs text-gray-500">{order.seller?.phone || ''}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-gray-900">
                      {formatPrice(order.amount || 0, order.currency)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <StatusBadge status={order.status as any} />
                        {order.lastUpdateLive && (
                          <span className="text-xs text-[#5d2ba3] font-medium">Just updated!</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      <div>
                        <p>{new Date(order.createdAt).toLocaleDateString()}</p>
                        {order.updatedAt !== order.createdAt && (
                          <p className="text-xs text-gray-400">
                            Updated: {new Date(order.updatedAt).toLocaleTimeString()}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          to={`/buyer/orders/${order.id}`}
                          className="p-2 hover:bg-gray-100 rounded-null text-gray-500 transition inline-flex items-center justify-center"
                          title="View Full Details"
                        >
                          <EyeIcon size={18} />
                        </Link>
                        {order.status === 'SHIPPED' && (
                          <button
                            onClick={() => setConfirmingDelivery(order.id)}
                            className="px-3 py-1.5 bg-[#3d1a7a] text-white text-xs font-semibold rounded-null hover:bg-[#250e52] transition"
                            title="Confirm Delivery"
                          >
                            Confirm
                          </button>
                        )}
                        {['PAID', 'SHIPPED'].includes(order.status) && !order.dispute && (
                          <button
                            onClick={() => setOpeningDispute(order.id)}
                            className="p-2 hover:bg-[#6E6658]/20 rounded-null text-[#6E6658] transition"
                            title="Open Dispute"
                          >
                            <AlertTriangleIcon size={18} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    {orders.length === 0 ? (
                      <div className="space-y-2">
                        <p className="font-semibold">No orders yet</p>
                        <p className="text-sm">Your purchases will appear here</p>
                      </div>
                    ) : (
                      'No orders found matching your search'
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Timeline - Show when order is selected */}
      {selectedOrder && (
        <OrderTimeline
          order={filteredOrders.find(o => o.id === selectedOrder)}
          onClose={() => setSelectedOrder(null)}
        />
      )}

      {/* Confirm Delivery Modal */}
      {confirmingDelivery && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-null max-w-md w-full p-6 animate-in zoom-in-95">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-lg font-bold text-[#3d1a7a]">Confirm Delivery</h3>
                <p className="text-sm text-gray-500">Enter the OTP provided by the seller</p>
              </div>
              <button onClick={() => { setConfirmingDelivery(null); setDeliveryOTP(''); }} className="p-2 hover:bg-gray-100 rounded-null">
                <XIcon size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Delivery OTP</label>
                <input
                  type="text"
                  value={deliveryOTP}
                  onChange={(e) => setDeliveryOTP(e.target.value)}
                  placeholder="Enter 4-digit OTP"
                  maxLength={6}
                  className="w-full px-4 py-3 border border-gray-200 rounded-null focus:outline-none focus:border-[#3d1a7a] text-center text-2xl tracking-widest font-mono"
                />
              </div>

              <button
                onClick={() => handleConfirmDelivery(confirmingDelivery)}
                disabled={actionLoading || !deliveryOTP.trim()}
                className="w-full py-3 bg-[#3d1a7a] text-white font-semibold rounded-null hover:bg-[#250e52] disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
              >
                {actionLoading ? (
                  <>
                    <LoaderIcon size={18} className="animate-spin" />
                    Confirming...
                  </>
                ) : (
                  <>
                    <CheckCircleIcon size={18} />
                    Confirm Delivery
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Open Dispute Modal */}
      {openingDispute && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-null max-w-md w-full p-6 animate-in zoom-in-95">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-lg font-bold text-[#3d1a7a]">Open Dispute</h3>
                <p className="text-sm text-gray-500">Tell us what went wrong</p>
              </div>
              <button onClick={() => { setOpeningDispute(null); setDisputeReason(''); setDisputeDescription(''); }} className="p-2 hover:bg-gray-100 rounded-null">
                <XIcon size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Reason</label>
                <select
                  value={disputeReason}
                  onChange={(e) => setDisputeReason(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-null focus:outline-none focus:border-[#3d1a7a]"
                >
                  <option value="">Select a reason</option>
                  <option value="NOT_RECEIVED">Item not received</option>
                  <option value="WRONG_ITEM">Wrong item received</option>
                  <option value="DAMAGED">Item damaged</option>
                  <option value="NOT_AS_DESCRIBED">Not as described</option>
                  <option value="QUALITY_ISSUE">Quality issue</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description (Optional)</label>
                <textarea
                  value={disputeDescription}
                  onChange={(e) => setDisputeDescription(e.target.value)}
                  placeholder="Provide more details about the issue..."
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-200 rounded-null focus:outline-none focus:border-[#3d1a7a] resize-none"
                />
              </div>

              <button
                onClick={() => handleOpenDispute(openingDispute)}
                disabled={actionLoading || !disputeReason}
                className="w-full py-3 bg-[#6E6658] text-white font-semibold rounded-null hover:bg-[#4F4A41] disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
              >
                {actionLoading ? (
                  <>
                    <LoaderIcon size={18} className="animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <AlertTriangleIcon size={18} />
                    Open Dispute
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface OrderTimelineProps {
  order: any;
  onClose: () => void;
}

function OrderTimeline({ order, onClose }: OrderTimelineProps) {
  const { formatPrice } = useCurrency();
  if (!order) return null;

  const steps = [
    { status: 'PENDING', label: 'Order Placed', icon: '📝' },
    { status: 'PAID', label: 'Payment Received', icon: '💰' },
    { status: 'SHIPPED', label: 'Shipped', icon: '📦' },
    { status: 'DELIVERED', label: 'Delivered', icon: '🚚' },
    { status: 'CONFIRMED', label: 'Confirmed', icon: '✅' },
    { status: 'COMPLETED', label: 'Completed', icon: '🎉' },
  ];

  const currentIndex = steps.findIndex(s => s.status === order.status);

  return (
    <div className="bg-white rounded-null border border-gray-200 shadow-sm p-6 animate-in slide-in-from-top-2">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-lg font-bold text-[#3d1a7a]">Order Timeline</h3>
          <p className="text-sm text-gray-500">Track your order progress in real-time</p>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 rounded-null text-gray-500 transition"
        >
          <XIcon size={18} />
        </button>
      </div>

      {/* Order Details */}
      <div className="mb-6 p-4 bg-gray-50 rounded-null">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Item:</span>
            <p className="font-semibold text-gray-900">{order.itemName}</p>
          </div>
          <div>
            <span className="text-gray-500">Amount:</span>
            <p className="font-bold text-gray-900">{formatPrice(order.amount || 0, order.currency)}</p>
          </div>
          <div>
            <span className="text-gray-500">Seller:</span>
            <p className="font-semibold text-gray-900">{order.seller?.name}</p>
          </div>
          <div>
            <span className="text-gray-500">Order ID:</span>
            <p className="font-mono text-gray-900">{order.id.slice(0, 12)}...</p>
          </div>
        </div>
      </div>

      <div className="relative">
        {/* Progress Line */}
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200" />
        <div
          className="absolute left-6 top-0 w-0.5 bg-[#5d2ba3] transition-all duration-500"
          style={{ height: `${Math.max(0, (currentIndex / (steps.length - 1)) * 100)}%` }}
        />

        {/* Steps */}
        <div className="space-y-6">
          {steps.map((step, index) => {
            const isComplete = index <= currentIndex;
            const isCurrent = index === currentIndex;

            return (
              <div key={step.status} className="flex items-center gap-4 relative">
                <div className={`w-12 h-12 rounded-null-full flex items-center justify-center text-xl z-10 transition-all ${isComplete
                  ? 'bg-[#5d2ba3] text-white shadow-lg shadow-[#5d2ba3]/30'
                  : 'bg-gray-100 text-gray-400'
                  } ${isCurrent ? 'ring-4 ring-[#5d2ba3]/20 animate-pulse' : ''}`}>
                  {step.icon}
                </div>
                <div className="flex-1">
                  <p className={`font-semibold ${isComplete ? 'text-gray-900' : 'text-gray-400'}`}>
                    {step.label}
                  </p>
                  {isCurrent && (
                    <p className="text-sm text-[#5d2ba3] font-medium flex items-center gap-1">
                      <RadioIcon size={12} className="animate-pulse" />
                      Current status
                    </p>
                  )}
                </div>
                {isComplete && (
                  <span className="text-[#5d2ba3]">✓</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}