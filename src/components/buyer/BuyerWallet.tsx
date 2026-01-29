import { CreditCardIcon, TrendingUpIcon, ClockIcon, ArrowUpRightIcon, ArrowDownLeftIcon, LoaderIcon, RefreshCwIcon, PlusIcon, CheckCircleIcon, ShieldIcon } from '@/components/icons';
import { useState, useEffect, useCallback } from 'react';
import { api } from '@/services/api';
import { TopUpModal } from '@/components/TopUpModal';
import confetti from 'canvas-confetti';

interface BuyerWalletProps {
  wallet: any;
  loading: boolean;
  error: string | null;
  onRefresh?: () => void;
  userEmail?: string;
}

interface WalletTransaction {
  id: string;
  type: 'PURCHASE' | 'REFUND' | 'TOP_UP' | 'RELEASE';
  amount: number;
  description: string;
  status: string;
  createdAt: string;
  transaction?: {
    itemName: string;
    seller?: { name: string };
  };
}

export function BuyerWallet({ wallet, loading, error, onRefresh, userEmail }: BuyerWalletProps) {
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [showTopUpModal, setShowTopUpModal] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Trigger confetti animation
  const triggerConfetti = () => {
    const duration = 3000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#10b981', '#34d399', '#6ee7b7'],
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#10b981', '#34d399', '#6ee7b7'],
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };

    frame();
  };

  // Check for topup success in URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const topupSuccess = urlParams.get('topup');
    const reference = urlParams.get('reference');
    
    if (topupSuccess === 'success' && reference) {
      setIsVerifying(true);
      // Verify the topup and refresh wallet
      api.verifyPaystackPayment('topup', reference).then((result) => {
        setIsVerifying(false);
        if (result?.success) {
          setShowSuccess(true);
          triggerConfetti();
          setTimeout(() => setShowSuccess(false), 4000);
        }
        onRefresh?.();
      }).catch(() => {
        setIsVerifying(false);
      });
      // Clear URL params
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [onRefresh]);

  const fetchTransactions = useCallback(async () => {
    try {
      setTransactionsLoading(true);
      // Use the buyer orders as transactions for now
      const response = await api.getBuyerOrders({ limit: 10 });
      if (response.success && response.data) {
        const ordersData = Array.isArray(response.data) 
          ? response.data 
          : (response.data as any).data || [];
        
        // Transform orders to transaction-like format
        const txns = ordersData.map((order: any) => ({
          id: order.id,
          type: 'PURCHASE' as const,
          amount: order.amount,
          description: order.itemName,
          status: order.status,
          createdAt: order.createdAt,
          transaction: {
            itemName: order.itemName,
            seller: order.seller,
          },
        }));
        setTransactions(txns);
      }
    } catch (err) {
      console.error('Failed to fetch transactions:', err);
    } finally {
      setTransactionsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

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
        <p className="font-bold">Failed to load wallet</p>
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

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'PURCHASE':
        return <ArrowUpRightIcon className="text-[#4F4A41]" size={20} />;
      case 'REFUND':
      case 'RELEASE':
        return <ArrowDownLeftIcon className="text-[#5d2ba3]" size={20} />;
      default:
        return <CreditCardIcon className="text-gray-500" size={20} />;
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'PURCHASE':
        return 'text-[#4F4A41]';
      case 'REFUND':
      case 'RELEASE':
        return 'text-[#5d2ba3]';
      default:
        return 'text-gray-600';
    }
  };

  const getTransactionSign = (type: string) => {
    switch (type) {
      case 'PURCHASE':
        return '-';
      case 'REFUND':
      case 'RELEASE':
        return '+';
      default:
        return '';
    }
  };

  return (
    <div className="space-y-6 relative">
      {/* Verifying Payment Overlay */}
      {isVerifying && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-null p-8 text-center shadow-2xl animate-in zoom-in-95 duration-200 max-w-sm mx-4">
            <div className="w-16 h-16 bg-primary/10 rounded-null-full flex items-center justify-center mx-auto mb-4">
              <LoaderIcon size={32} className="animate-spin text-primary" />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-2">Verifying Payment</h3>
            <p className="text-muted-foreground text-sm">Please wait while we confirm your top-up...</p>
            <div className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <ShieldIcon size={14} className="text-primary" />
              <span>Secure transaction processing</span>
            </div>
          </div>
        </div>
      )}

      {/* Success Animation Overlay */}
      {showSuccess && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-null p-8 text-center shadow-2xl animate-in zoom-in-95 duration-200 max-w-sm mx-4">
            <div className="w-20 h-20 bg-[#5d2ba3]/20 rounded-null-full flex items-center justify-center mx-auto mb-4 animate-in zoom-in duration-300">
              <CheckCircleIcon size={40} className="text-[#5d2ba3]" />
            </div>
            <h3 className="text-2xl font-bold text-foreground mb-2">Top-Up Successful!</h3>
            <p className="text-muted-foreground">Your wallet balance has been updated.</p>
          </div>
        </div>
      )}
      {/* Top Up Button */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-[#3d1a7a]">My Wallet</h2>
        <button
          onClick={() => setShowTopUpModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#3d1a7a] text-white font-semibold rounded-null hover:bg-[#250e52] transition shadow-sm"
        >
          <PlusIcon size={18} />
          Top Up Wallet
        </button>
      </div>

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Available Balance Card */}
        <div className="bg-white rounded-null border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-[#5d2ba3] rounded-null flex items-center justify-center">
              <ArrowUpRightIcon className="text-white" size={24} />
            </div>
            <button
              onClick={() => setShowTopUpModal(true)}
              className="px-3 py-1.5 bg-[#5d2ba3]/20 text-[#5d2ba3] text-xs font-semibold rounded-null hover:bg-[#5d2ba3]/30 transition"
            >
              + Add Funds
            </button>
          </div>
          <p className="text-sm text-gray-600 mb-2">Available Balance</p>
          <h3 className="text-3xl font-bold text-gray-900 mb-2">
            KES {(wallet?.availableBalance || wallet?.balance || 0).toLocaleString()}
          </h3>
          <div className="flex items-center gap-1 text-sm text-[#5d2ba3]">
            <TrendingUpIcon size={16} />
            <span>Ready to use</span>
          </div>
          <p className="text-xs text-gray-500 mt-2">Available for purchases</p>
        </div>

        {/* Pending Balance Card */}
        <div className="bg-white rounded-null border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-[#6E6658] rounded-null flex items-center justify-center">
              <ClockIcon className="text-white" size={24} />
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-2">In Escrow</p>
          <h3 className="text-3xl font-bold text-gray-900 mb-2">
            KES {(wallet?.pendingBalance || wallet?.escrowBalance || 0).toLocaleString()}
          </h3>
          <div className="flex items-center gap-1 text-sm text-[#6E6658]">
            <ClockIcon size={16} />
            <span>Awaiting delivery</span>
          </div>
          <p className="text-xs text-gray-500 mt-2">Will be released after confirmation</p>
        </div>

        {/* Total Spent Card */}
        <div className="bg-white rounded-null border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-[#3d1a7a] rounded-null flex items-center justify-center">
              <TrendingUpIcon className="text-white" size={24} />
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-2">Total Spent</p>
          <h3 className="text-3xl font-bold text-gray-900 mb-2">
            KES {(wallet?.totalSpent || 0).toLocaleString()}
          </h3>
          <div className="flex items-center gap-1 text-sm text-[#3d1a7a]">
            <TrendingUpIcon size={16} />
            <span>All time</span>
          </div>
          <p className="text-xs text-gray-500 mt-2">Across {wallet?.totalTransactions || transactions.length} purchases</p>
        </div>
      </div>

      {/* Transaction History Card */}
      <div className="bg-white rounded-null border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <h3 className="text-lg font-bold text-[#3d1a7a]">Recent Transactions</h3>
          <button
            onClick={fetchTransactions}
            disabled={transactionsLoading}
            className="p-2 hover:bg-gray-100 rounded-null transition"
          >
            <RefreshCwIcon size={18} className={transactionsLoading ? 'animate-spin text-[#5d2ba3]' : 'text-gray-500'} />
          </button>
        </div>
        
        <div className="divide-y divide-gray-100">
          {transactionsLoading ? (
            <div className="p-8 text-center">
              <LoaderIcon size={24} className="animate-spin text-[#5d2ba3] mx-auto" />
            </div>
          ) : transactions.length > 0 ? (
            transactions.map((txn) => (
              <div key={txn.id} className="flex items-center justify-between p-4 hover:bg-gray-50 transition">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-null-full flex items-center justify-center ${
                    txn.type === 'PURCHASE' ? 'bg-[#4F4A41]/20' : 'bg-[#5d2ba3]/20'
                  }`}>
                    {getTransactionIcon(txn.type)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{txn.description || 'Transaction'}</p>
                    <p className="text-xs text-gray-500">
                      {txn.transaction?.seller?.name && `${txn.transaction.seller.name} • `}
                      {new Date(txn.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`text-sm font-bold ${getTransactionColor(txn.type)}`}>
                    {getTransactionSign(txn.type)}KES {txn.amount.toLocaleString()}
                  </span>
                  <p className="text-xs text-gray-500 mt-1">
                    <span className={`px-2 py-0.5 rounded-null-full text-xs font-medium ${
                      txn.status === 'COMPLETED' ? 'bg-[#5d2ba3]/20 text-[#5d2ba3]' :
                      txn.status === 'PENDING' ? 'bg-[#6E6658]/20 text-[#6E6658]' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {txn.status}
                    </span>
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-gray-500">
              <CreditCardIcon size={32} className="mx-auto mb-2 opacity-50" />
              <p className="font-semibold">No transactions yet</p>
              <p className="text-sm">Your purchase history will appear here</p>
            </div>
          )}
        </div>
      </div>

      {/* Top Up Modal */}
      <TopUpModal 
        isOpen={showTopUpModal} 
        onClose={() => setShowTopUpModal(false)}
        userEmail={userEmail}
      />
    </div>
  );
}