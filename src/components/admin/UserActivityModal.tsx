import { useState, useEffect } from 'react';
import { X, Loader, Clock, ShoppingBag, Wallet, AlertTriangle, LogIn } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface UserActivityModalProps {
  user: {
    id: string;
    name: string;
    memberSince: string;
  };
  isOpen: boolean;
  onClose: () => void;
}

interface ActivityData {
  lastLogin: string | null;
  totalLogins: number;
  transactions: {
    total: number;
    completed: number;
    disputed: number;
    totalAmount: number;
  };
  wallet: {
    availableBalance: number;
    totalEarned: number;
    totalSpent: number;
  };
  auditLogs: Array<{
    id: string;
    action: string;
    entity: string;
    createdAt: string;
    success: boolean;
  }>;
}

export function UserActivityModal({ user, isOpen, onClose }: UserActivityModalProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activity, setActivity] = useState<ActivityData | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchActivity();
    }
  }, [isOpen, user.id]);

  const fetchActivity = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch user profile for last login
      const { data: profile } = await supabase
        .from('profiles')
        .select('last_login')
        .eq('user_id', user.id)
        .single();

      // Fetch transactions (as seller or buyer)
      const [sellerTxRes, buyerTxRes] = await Promise.all([
        supabase
          .from('transactions')
          .select('status, amount')
          .eq('seller_id', user.id),
        supabase
          .from('transactions')
          .select('status, amount')
          .eq('buyer_id', user.id),
      ]);

      const allTx = [...(sellerTxRes.data || []), ...(buyerTxRes.data || [])];
      const completed = allTx.filter(t => t.status === 'completed' || t.status === 'delivered').length;
      const disputed = allTx.filter(t => t.status === 'disputed').length;
      const totalAmount = allTx.reduce((sum, t) => sum + (t.amount || 0), 0);

      // Fetch wallet
      const { data: wallet } = await supabase
        .from('wallets')
        .select('available_balance, total_earned, total_spent')
        .eq('user_id', user.id)
        .single();

      // Fetch recent audit logs
      const { data: logs } = await supabase
        .from('audit_logs')
        .select('id, action, entity, created_at, success')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      setActivity({
        lastLogin: profile?.last_login || null,
        totalLogins: 0, // Would need a login counter
        transactions: {
          total: allTx.length,
          completed,
          disputed,
          totalAmount,
        },
        wallet: {
          availableBalance: wallet?.available_balance || 0,
          totalEarned: wallet?.total_earned || 0,
          totalSpent: wallet?.total_spent || 0,
        },
        auditLogs: (logs || []).map(l => ({
          id: l.id,
          action: l.action,
          entity: l.entity,
          createdAt: l.created_at || '',
          success: l.success || false,
        })),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load activity');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h3 className="text-lg font-bold text-[#3d1a7a]">User Activity</h3>
            <p className="text-sm text-gray-500">{user.name}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader size={32} className="animate-spin text-[#5d2ba3]" />
            </div>
          ) : error ? (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          ) : activity ? (
            <div className="space-y-6">
              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 text-gray-500 mb-1">
                    <LogIn size={14} />
                    <span className="text-xs font-medium uppercase">Last Login</span>
                  </div>
                  <p className="font-semibold text-gray-900">
                    {activity.lastLogin 
                      ? new Date(activity.lastLogin).toLocaleDateString()
                      : 'Never'}
                  </p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 text-gray-500 mb-1">
                    <Clock size={14} />
                    <span className="text-xs font-medium uppercase">Member Since</span>
                  </div>
                  <p className="font-semibold text-gray-900">
                    {new Date(user.memberSince).toLocaleDateString()}
                  </p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 text-gray-500 mb-1">
                    <ShoppingBag size={14} />
                    <span className="text-xs font-medium uppercase">Transactions</span>
                  </div>
                  <p className="font-semibold text-gray-900">
                    {activity.transactions.total}
                  </p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 text-gray-500 mb-1">
                    <Wallet size={14} />
                    <span className="text-xs font-medium uppercase">Balance</span>
                  </div>
                  <p className="font-semibold text-gray-900">
                    KES {activity.wallet.availableBalance.toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Transaction Summary */}
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-3">Transaction Summary</h4>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-[#5d2ba3]">{activity.transactions.completed}</p>
                    <p className="text-xs text-gray-500">Completed</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-amber-600">{activity.transactions.disputed}</p>
                    <p className="text-xs text-gray-500">Disputed</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-700">KES {activity.transactions.totalAmount.toLocaleString()}</p>
                    <p className="text-xs text-gray-500">Total Volume</p>
                  </div>
                </div>
              </div>

              {/* Wallet Summary */}
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-3">Wallet Activity</h4>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-lg font-bold text-green-600">KES {activity.wallet.totalEarned.toLocaleString()}</p>
                    <p className="text-xs text-gray-500">Total Earned</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-red-600">KES {activity.wallet.totalSpent.toLocaleString()}</p>
                    <p className="text-xs text-gray-500">Total Spent</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-[#5d2ba3]">KES {activity.wallet.availableBalance.toLocaleString()}</p>
                    <p className="text-xs text-gray-500">Available</p>
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              {activity.auditLogs.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-3">Recent Activity</h4>
                  <div className="space-y-2">
                    {activity.auditLogs.map(log => (
                      <div 
                        key={log.id}
                        className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
                      >
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${log.success ? 'bg-green-500' : 'bg-red-500'}`} />
                          <span className="text-sm text-gray-700">{log.action}</span>
                          <span className="text-xs text-gray-400">({log.entity})</span>
                        </div>
                        <span className="text-xs text-gray-500">
                          {new Date(log.createdAt).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activity.auditLogs.length === 0 && (
                <div className="flex items-center gap-2 p-4 bg-gray-50 rounded-lg text-gray-500">
                  <AlertTriangle size={16} />
                  <span className="text-sm">No recent activity logs found</span>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
