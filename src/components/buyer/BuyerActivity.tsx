import { CheckCircleIcon, CreditCardIcon, ShoppingCartIcon, ClockIcon, LoaderIcon, TruckIcon, AlertTriangleIcon, RefreshCwIcon } from '@/components/icons';
import { useState, useEffect, useCallback } from 'react';
import { api } from '@/services/api';

interface Activity {
  id: string;
  type: 'order' | 'delivery' | 'payment' | 'pending' | 'dispute';
  action: string;
  description: string;
  amount: string;
  time: string;
  status?: string;
}

export function BuyerActivity() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchActivity = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch orders and disputes to build activity timeline
      const [ordersRes, disputesRes] = await Promise.all([
        api.getBuyerOrders({ limit: 20 }),
        api.getBuyerDisputes(),
      ]);

      const activityList: Activity[] = [];

      // Process orders into activities
      if (ordersRes.success && ordersRes.data) {
        const ordersData = Array.isArray(ordersRes.data) 
          ? ordersRes.data 
          : (ordersRes.data as any).data || [];

        ordersData.forEach((order: any) => {
          const timeAgo = getTimeAgo(new Date(order.updatedAt || order.createdAt));

          // Create activity based on status
          let activity: Activity;
          switch (order.status) {
            case 'PENDING':
              activity = {
                id: `${order.id}-pending`,
                type: 'pending',
                action: 'Payment Pending',
                description: `Waiting for payment - ${order.itemName}`,
                amount: `KES ${(order.amount || 0).toLocaleString()}`,
                time: timeAgo,
                status: order.status,
              };
              break;
            case 'PAID':
              activity = {
                id: `${order.id}-paid`,
                type: 'order',
                action: 'Order Placed',
                description: `Purchased ${order.itemName} from ${order.seller?.name || 'seller'}`,
                amount: `KES ${(order.amount || 0).toLocaleString()}`,
                time: timeAgo,
                status: order.status,
              };
              break;
            case 'SHIPPED':
              activity = {
                id: `${order.id}-shipped`,
                type: 'delivery',
                action: 'Order Shipped',
                description: `${order.itemName} is on the way`,
                amount: `KES ${(order.amount || 0).toLocaleString()}`,
                time: timeAgo,
                status: order.status,
              };
              break;
            case 'DELIVERED':
            case 'CONFIRMED':
              activity = {
                id: `${order.id}-delivered`,
                type: 'delivery',
                action: 'Delivery Confirmed',
                description: `Item received from ${order.seller?.name || 'seller'}`,
                amount: `KES ${(order.amount || 0).toLocaleString()}`,
                time: timeAgo,
                status: order.status,
              };
              break;
            case 'COMPLETED':
              activity = {
                id: `${order.id}-completed`,
                type: 'payment',
                action: 'Payment Released',
                description: `Transaction completed for ${order.itemName}`,
                amount: `KES ${(order.amount || 0).toLocaleString()}`,
                time: timeAgo,
                status: order.status,
              };
              break;
            default:
              activity = {
                id: `${order.id}-unknown`,
                type: 'order',
                action: 'Order Update',
                description: order.itemName,
                amount: `KES ${(order.amount || 0).toLocaleString()}`,
                time: timeAgo,
                status: order.status,
              };
          }
          activityList.push(activity);
        });
      }

      // Process disputes into activities
      if (disputesRes.success && disputesRes.data) {
        const disputesData = Array.isArray(disputesRes.data) 
          ? disputesRes.data 
          : (disputesRes.data as any).data || [];

        disputesData.forEach((dispute: any) => {
          const timeAgo = getTimeAgo(new Date(dispute.createdAt));
          activityList.push({
            id: `dispute-${dispute.id}`,
            type: 'dispute',
            action: 'Dispute Opened',
            description: `${dispute.reason?.replace('_', ' ')} - ${dispute.transaction?.itemName || 'Order'}`,
            amount: `KES ${(dispute.transaction?.amount || 0).toLocaleString()}`,
            time: timeAgo,
            status: dispute.status,
          });
        });
      }

      // Sort by most recent (this is a simple sort, in production you'd want proper timestamps)
      activityList.sort((a, b) => {
        const timeOrder = ['Just now', 'seconds ago', 'minute ago', 'minutes ago', 'hour ago', 'hours ago', 'day ago', 'days ago', 'week ago', 'weeks ago'];
        const aIndex = timeOrder.findIndex(t => a.time.includes(t));
        const bIndex = timeOrder.findIndex(t => b.time.includes(t));
        return aIndex - bIndex;
      });

      setActivities(activityList);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch activity');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActivity();
  }, [fetchActivity]);

  const getTimeAgo = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'order':
        return ShoppingCartIcon;
      case 'delivery':
        return TruckIcon;
      case 'payment':
        return CreditCardIcon;
      case 'pending':
        return ClockIcon;
      case 'dispute':
        return AlertTriangleIcon;
      default:
        return CheckCircleIcon;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'order':
        return 'bg-[#3d1a7a]/20 text-[#3d1a7a]';
      case 'delivery':
        return 'bg-[#5d2ba3]/20 text-[#5d2ba3]';
      case 'payment':
        return 'bg-[#5d2ba3]/20 text-[#5d2ba3]';
      case 'pending':
        return 'bg-[#6E6658]/20 text-[#6E6658]';
      case 'dispute':
        return 'bg-[#4F4A41]/20 text-[#4F4A41]';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

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
        <p className="font-bold">Failed to load activity</p>
        <p className="text-sm">{error}</p>
        <button 
          onClick={fetchActivity}
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
        <h2 className="text-2xl font-bold text-[#3d1a7a]">Activity Timeline</h2>
        <button
          onClick={fetchActivity}
          disabled={loading}
          className="p-2 hover:bg-gray-100 rounded-null transition"
        >
          <RefreshCwIcon size={18} className={loading ? 'animate-spin text-[#5d2ba3]' : 'text-gray-500'} />
        </button>
      </div>

      <div className="space-y-4">
        {activities.length > 0 ? (
          activities.map((activity) => {
            const Icon = getActivityIcon(activity.type);
            return (
              <div key={activity.id} className="bg-white rounded-null border border-gray-200 shadow-sm p-6 hover:shadow-md transition">
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-null ${getActivityColor(activity.type)}`}>
                    <Icon size={24} />
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-lg font-bold text-[#3d1a7a]">{activity.action}</h3>
                      {activity.status && (
                        <span className={`px-2 py-0.5 rounded-null-full text-xs font-medium ${
                          activity.status === 'COMPLETED' ? 'bg-[#5d2ba3]/20 text-[#5d2ba3]' :
                          activity.status === 'PENDING' ? 'bg-[#6E6658]/20 text-[#6E6658]' :
                          activity.status === 'SHIPPED' ? 'bg-[#3d1a7a]/20 text-[#3d1a7a]' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {activity.status}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{activity.description}</p>

                    <div className="flex items-center justify-between mt-4">
                      <span className="text-xs text-gray-500">{activity.time}</span>
                      <span className="text-sm font-bold text-gray-900">{activity.amount}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-12 bg-white rounded-null border border-gray-200 border-dashed">
            <ShoppingCartIcon className="mx-auto text-gray-400 mb-4" size={48} />
            <h3 className="text-lg font-bold text-[#3d1a7a]">No Activity Yet</h3>
            <p className="text-gray-500">Your purchase activity will appear here</p>
          </div>
        )}
      </div>
    </div>
  );
}