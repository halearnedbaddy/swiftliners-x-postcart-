import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/services/api';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { useCurrency } from '@/hooks/useCurrency';
import {
  HomeIcon, ShoppingBagIcon, WalletIcon, AlertTriangleIcon, SettingsIcon, HelpCircleIcon,
  MessageCircleIcon, TrendingUpIcon, PhoneIcon, MailIcon, PlusIcon, StoreIcon,
  ChevronRightIcon, BellIcon, XIcon, CheckCircleIcon, ClockIcon,
  ArrowUpRightIcon, ArrowDownLeftIcon, CameraIcon, MenuIcon, LinkIcon
} from '@/components/icons';
import { DisputesManagement } from '@/components/DisputesManagement';
import { OrdersTab } from '@/components/OrdersTab';
import StatusBadge from '@/components/StatusBadge';
import { WithdrawalModal } from '@/components/WithdrawalModal';
import { CreateStoreModal } from '@/components/store/CreateStoreModal';
import { StoreDashboard } from '@/components/store/StoreDashboard';
import { AIDraftsTab } from '@/components/seller/AIDraftsTab';
import { LinkGenerator } from '@/components/LinkGenerator';
import { MyLinksPage } from '@/pages/MyLinksPage';
import { CurrencySelector } from '@/components/CurrencySelector';
import { useTranslations } from '@/hooks/useTranslations';

// Types
interface Order {
  id: string;
  buyer: string;
  amount: number;
  item: string;
  status: 'pending' | 'shipped' | 'completed' | 'dispute';
  timeLeft: string;
  rating: number;
  reviews: number;
}

interface Transaction {
  type: 'deposit' | 'withdrawal';
  amount: number;
  desc: string;
  date: string;
}

interface WalletData {
  available: number;
  pending: number;
  total: number;
}

interface SellerProfile {
  name: string;
  verified: boolean;
  memberSince: string;
  isActive: boolean;
  taxId?: string;
  businessRegNumber?: string;
  isBusiness?: boolean;
}

export function SellerDashboard() {
  const navigate = useNavigate();
  const { t } = useTranslations();
  const { logout } = useSupabaseAuth();
  const { selectedCountry } = useCurrency();
  const [activeTab, setActiveTab] = useState('home');
  const [withdrawalModal, setWithdrawalModal] = useState(false);
  const [shareModal, setShareModal] = useState(false);
  const [showCreateStoreModal, setShowCreateStoreModal] = useState(false);
  const [showStoreDashboard, setShowStoreDashboard] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Empty data states - ready for API integration
  const [orders] = useState<Order[]>([]);
  const [transactions] = useState<Transaction[]>([]);
  const [wallet] = useState<WalletData>({ available: 0, pending: 0, total: 0 });
  const [profile] = useState<SellerProfile>({ name: 'Seller', verified: false, memberSince: '', isActive: false });

  // Store settings state
  const [storeData, setStoreData] = useState<{
    id?: string;
    name?: string;
    slug?: string;
    logo?: string | null;
    bio?: string | null;
    visibility?: string;
    status?: string;
  } | null>(null);
  const [storeLoading, setStoreLoading] = useState(true);
  const [storefrontCopied, setStorefrontCopied] = useState(false);

  // Load store data when store tab is active
  useEffect(() => {
    async function loadStore() {
      if (activeTab === 'store') {
        setStoreLoading(true);
        const res = await api.getMyStore();
        if (res.success && res.data) {
          setStoreData(res.data as any);
        }
        setStoreLoading(false);
      }
    }
    loadStore();
  }, [activeTab]);

  const navItems = [
    { id: 'home', label: t('seller.home'), icon: HomeIcon },
    { id: 'orders', label: t('seller.orders'), icon: ShoppingBagIcon },
    { id: 'wallet', label: t('seller.wallet'), icon: WalletIcon },
    { id: 'disputes', label: t('seller.disputes'), icon: AlertTriangleIcon },
    { id: 'create_link', label: t('seller.createLink'), icon: PlusIcon },
    { id: 'my_links', label: t('seller.myLinks'), icon: LinkIcon },
    { id: 'store', label: t('seller.storeSettings'), icon: SettingsIcon },
    { id: 'ai_drafts', label: t('seller.aiDrafts'), icon: CameraIcon },
    { id: 'published', label: t('seller.publishedProducts'), icon: ShoppingBagIcon },
    { id: 'sync_logs', label: t('seller.syncLogs'), icon: ClockIcon },
    { id: 'social', label: t('seller.socialLinks'), icon: LinkIcon },
    { id: 'settings', label: t('seller.settings'), icon: SettingsIcon },
    { id: 'support', label: t('seller.support'), icon: HelpCircleIcon },
  ];

  // CREATE LINK TAB - Now uses the full-featured LinkGenerator component
  const renderCreateLink = () => (
    <LinkGenerator />
  );

  // HOME TAB
  const renderHome = () => (
    <div className="space-y-6">
      {/* Financial Summary Cards - Matching Image Design */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Revenue Card */}
        <div className="bg-white rounded-null-2xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-[#5d2ba3] rounded-null-xl flex items-center justify-center">
              <ArrowUpRightIcon className="text-white" size={24} />
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-2">Total Revenue</p>
          <h3 className="text-3xl font-bold text-[#250e52] mb-2">
            KES {wallet.total.toLocaleString()}
          </h3>
          <div className="flex items-center gap-1 text-sm text-[#5d2ba3]">
            <TrendingUpIcon size={16} />
            <span>+2.10%</span>
          </div>
          <p className="text-xs text-gray-500 mt-2">Compared to last month</p>
        </div>

        {/* Total Expenses Card */}
        <div className="bg-white rounded-null-2xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-[#5d2ba3] rounded-null-xl flex items-center justify-center">
              <ArrowDownLeftIcon className="text-white" size={24} />
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-2">Total Expenses</p>
          <h3 className="text-3xl font-bold text-[#250e52] mb-2">
            KES {wallet.pending.toLocaleString()}
          </h3>
          <div className="flex items-center gap-1 text-sm text-[#5d2ba3]">
            <TrendingUpIcon size={16} />
            <span>+2.50%</span>
          </div>
          <p className="text-xs text-gray-500 mt-2">Compared to last month</p>
        </div>

        {/* Current Ratio Card */}
        <div className="bg-white rounded-null-2xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-[#5d2ba3] rounded-null-xl flex items-center justify-center">
              <TrendingUpIcon className="text-white" size={24} />
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-2">Available Balance</p>
          <h3 className="text-3xl font-bold text-[#250e52] mb-2">
            KES {wallet.available.toLocaleString()}
          </h3>
          <div className="flex items-center gap-1 text-sm text-[#5d2ba3]">
            <TrendingUpIcon size={16} />
            <span>+1.75%</span>
          </div>
          <p className="text-xs text-gray-500 mt-2">Compared to last month</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid md:grid-cols-4 gap-6">
        {[
          { label: 'New Orders', value: orders.filter(o => o.status === 'pending').length, icon: ShoppingBagIcon },
          { label: 'Active Orders', value: orders.filter(o => o.status === 'shipped').length, icon: ClockIcon },
          { label: 'Completed', value: orders.filter(o => o.status === 'completed').length, icon: CheckCircleIcon },
          { label: 'Disputes', value: 0, icon: AlertTriangleIcon },
        ].map((stat, idx) => (
          <div key={idx} className="bg-white rounded-null-2xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 bg-[#5d2ba3]/10 rounded-null-lg flex items-center justify-center">
                <stat.icon className="text-white" size={20} />
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-2">{stat.label}</p>
            <p className="text-2xl font-bold text-[#250e52]">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Action Board */}
      <div className="bg-[#4F4A41]/10 border border-[#4F4A41]/30 rounded-nullxl p-6">
        <h3 className="text-lg font-bold text-[#4F4A41] mb-4">🔴 Awaiting Your Action</h3>
        {orders.filter(o => o.status === 'pending').length === 0 ? (
          <div className="text-center py-8 text-[#6E6658]">
            <CheckCircleIcon className="w-12 h-12 mx-auto mb-4 text-[#5d2ba3]" size={48} />
            <p>No pending actions! You're all caught up.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.filter(o => o.status === 'pending').map((order) => (
              <div key={order.id} className="bg-white p-4 rounded-nulllg border border-[#5d2ba3]/20 hover:border-[#4F4A41]/50 transition cursor-pointer">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-bold text-[#250e52]">Order #{order.id}</p>
                    <p className="text-sm text-[#6E6658]">{order.buyer}</p>
                  </div>
                  <StatusBadge status={order.status} size="sm" />
                </div>
                <p className="text-[#250e52] text-sm mb-3">{order.item} • KES {order.amount.toLocaleString()}</p>
                <div className="flex gap-2">
                  <button className="flex-1 bg-[#3d1a7a] text-white py-1 rounded-null text-sm hover:bg-[#250e52] transition">Accept</button>
                  <button className="flex-1 bg-[#4F4A41] text-white py-1 rounded-null text-sm hover:bg-[#6E6658] transition">Reject</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-nullxl border border-[#5d2ba3]/20 p-6">
        <h3 className="text-lg font-bold mb-4 text-[#250e52]">📊 Recent Activity</h3>
        {transactions.length === 0 ? (
          <div className="text-center py-8 text-[#6E6658]">
            <ClockIcon className="w-12 h-12 mx-auto mb-4 text-[#5d2ba3]/50" />
            <p>No recent activity yet.</p>
            <p className="text-sm">Your transactions will appear here.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {transactions.slice(0, 5).map((tx, idx) => (
              <div key={idx} className="flex items-start gap-3 pb-3 border-b border-[#5d2ba3]/20 last:border-0">
                {tx.type === 'deposit' ? (
                  <ArrowDownLeftIcon className="text-[#5d2ba3] flex-shrink-0 mt-1" size={20} />
                ) : (
                  <ArrowUpRightIcon className="text-[#4F4A41] flex-shrink-0 mt-1" size={20} />
                )}
                <div className="flex-1">
                  <p className="font-semibold text-[#250e52]">{tx.desc}</p>
                  <p className="text-sm text-[#6E6658]">{tx.date}</p>
                </div>
                <p className={`font-bold ${tx.type === 'deposit' ? 'text-[#5d2ba3]' : 'text-[#4F4A41]'}`}>
                  {tx.type === 'deposit' ? '+' : '-'}KES {tx.amount.toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  // ORDERS TAB
  const renderOrders = () => (
    <OrdersTab onCreatePaymentLink={() => setActiveTab('social')} />
  );

  // WALLET TAB
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [showAddPayoutMethod, setShowAddPayoutMethod] = useState(false);
  const [payoutForm, setPayoutForm] = useState({
    type: 'MOBILE_MONEY',
    provider: 'M-PESA',
    accountNumber: '',
    accountName: '',
    isDefault: false,
  });

  useEffect(() => {
    async function loadPaymentMethods() {
      if (activeTab === 'wallet') {
        const res = await api.getPaymentMethods();
        if (res.success && res.data) {
          setPaymentMethods(Array.isArray(res.data) ? res.data : []);
        }
      }
    }
    loadPaymentMethods();
  }, [activeTab]);

  const handleAddPayoutMethod = async () => {
    if (!payoutForm.accountNumber || !payoutForm.accountName) {
      alert('Please fill in all required fields');
      return;
    }
    const res = await api.addPaymentMethod(payoutForm);
    if (res.success) {
      setPayoutForm({ type: 'MOBILE_MONEY', provider: 'M-PESA', accountNumber: '', accountName: '', isDefault: false });
      setShowAddPayoutMethod(false);
      const updatedRes = await api.getPaymentMethods();
      if (updatedRes.success && updatedRes.data) {
        setPaymentMethods(Array.isArray(updatedRes.data) ? updatedRes.data : []);
      }
      alert('Payout method added successfully!');
    } else {
      alert(res.error || 'Failed to add payout method');
    }
  };

  const renderWallet = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-[#3d1a7a]">💼 Wallet & Balance</h2>

      {/* Payout Methods Section */}
      <div className="bg-white rounded-nullxl border border-gray-200 p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-[#3d1a7a]">💰 Payout Methods</h3>
          <button
            onClick={() => setShowAddPayoutMethod(!showAddPayoutMethod)}
            className="px-4 py-2 rounded-null-lg bg-[#3d1a7a] text-white hover:bg-[#250e52] transition text-sm font-semibold"
          >
            {showAddPayoutMethod ? 'Cancel' : '+ Add Payout Method'}
          </button>
        </div>

        {paymentMethods.length === 0 && !showAddPayoutMethod && (
          <div className="bg-[#6E6658]/10 border border-[#6E6658]/30 rounded-null-lg p-4 mb-4">
            <p className="text-[#4F4A41] font-semibold mb-1">⚠️ No Payout Method Added</p>
            <p className="text-sm text-[#6E6658]">You need to add a payout method before you can activate your store or withdraw funds.</p>
          </div>
        )}

        {showAddPayoutMethod && (
          <div className="bg-[#5d2ba3]/5 rounded-null-lg p-4 mb-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#250e52] mb-1">Payment Type *</label>
              <select
                value={payoutForm.type}
                onChange={(e) => setPayoutForm({ ...payoutForm, type: e.target.value, provider: e.target.value === 'MOBILE_MONEY' ? 'M-PESA' : '' })}
                className="w-full px-4 py-2 rounded-null-lg border border-[#5d2ba3]/30 focus:outline-none focus:border-[#3d1a7a]"
              >
                <option value="MOBILE_MONEY">Mobile Money</option>
                <option value="BANK_ACCOUNT">Bank Account</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Provider *</label>
              {payoutForm.type === 'MOBILE_MONEY' ? (
                <select
                  value={payoutForm.provider}
                  onChange={(e) => setPayoutForm({ ...payoutForm, provider: e.target.value })}
                  className="w-full px-4 py-2 rounded-null-lg border border-[#5d2ba3]/30 focus:outline-none focus:border-[#3d1a7a]"
                >
                  <option value="M-PESA">M-Pesa</option>
                  <option value="AIRTEL_MONEY">Airtel Money</option>
                  <option value="T-KASH">T-Kash</option>
                </select>
              ) : (
                <input
                  type="text"
                  value={payoutForm.provider}
                  onChange={(e) => setPayoutForm({ ...payoutForm, provider: e.target.value })}
                  placeholder="Bank name (e.g., Equity, KCB)"
                  className="w-full px-4 py-2 rounded-null-lg border border-[#5d2ba3]/30 focus:outline-none focus:border-[#3d1a7a]"
                />
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {payoutForm.type === 'MOBILE_MONEY' ? 'Phone Number' : 'Account Number'} *
              </label>
              <input
                type="text"
                value={payoutForm.accountNumber}
                onChange={(e) => setPayoutForm({ ...payoutForm, accountNumber: e.target.value })}
                placeholder={payoutForm.type === 'MOBILE_MONEY' ? '+254 712 345 678' : 'Account number'}
                className="w-full px-4 py-2 rounded-null-lg border border-[#5d2ba3]/30 focus:outline-none focus:border-[#3d1a7a]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Account Name *</label>
              <input
                type="text"
                value={payoutForm.accountName}
                onChange={(e) => setPayoutForm({ ...payoutForm, accountName: e.target.value })}
                placeholder="Full name as on account"
                className="w-full px-4 py-2 rounded-null-lg border border-[#5d2ba3]/30 focus:outline-none focus:border-[#3d1a7a]"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isDefault"
                checked={payoutForm.isDefault}
                onChange={(e) => setPayoutForm({ ...payoutForm, isDefault: e.target.checked })}
                className="w-4 h-4"
              />
              <label htmlFor="isDefault" className="text-sm text-gray-700">Set as default payout method</label>
            </div>
            <button
              onClick={handleAddPayoutMethod}
              className="w-full px-4 py-2 rounded-null-lg bg-[#3d1a7a] text-white hover:bg-[#250e52] transition font-semibold"
            >
              Add Payout Method
            </button>
          </div>
        )}

        {paymentMethods.length > 0 && (
          <div className="space-y-3">
            {paymentMethods.map((method) => (
              <div key={method.id} className="flex items-center justify-between p-4 bg-[#5d2ba3]/5 rounded-null-lg border border-[#5d2ba3]/20">
                <div>
                  <p className="font-semibold text-[#250e52]">{method.provider}</p>
                  <p className="text-sm text-[#6E6658]">{method.accountNumber}</p>
                  <p className="text-xs text-[#6E6658]/70">{method.accountName}</p>
                </div>
                <div className="flex items-center gap-2">
                  {method.isDefault && (
                    <span className="px-2 py-1 bg-[#5d2ba3]/20 text-[#3d1a7a] rounded-null-full text-xs font-semibold">Default</span>
                  )}
                  <span className={`px-2 py-1 rounded-null-full text-xs font-semibold ${method.isActive ? 'bg-[#5d2ba3]/20 text-[#3d1a7a]' : 'bg-[#6E6658]/20 text-[#6E6658]'
                    }`}>
                    {method.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="bg-[#5d2ba3] rounded-nullxl p-8 text-white">
          <p className="text-white mb-2">Available to Withdraw</p>
          <p className="text-4xl font-bold mb-4 ">KES {wallet.available.toLocaleString()}</p>
          <button
            onClick={() => setWithdrawalModal(true)}
            disabled={paymentMethods.length === 0}
            className="w-full bg-[#250e52] text-white py-3 rounded-nulllg hover:bg-[#3d1a7a] transition font-bold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            💸 Withdraw
          </button>
          {paymentMethods.length === 0 && (
            <p className="text-xs text-white mt-2 text-center">Add payout method first</p>
          )}
        </div>

        <div className="bg-[#6E6658] rounded-nullxl p-8 text-white">
          <p className="text-white/90 mb-2">Pending Escrow</p>
          <p className="text-4xl font-bold mb-2">KES {wallet.pending.toLocaleString()}</p>
          <p className="text-sm text-white/80">({orders.filter(o => o.status !== 'completed').length} orders pending)</p>
        </div>

        <div className="bg-[#3d1a7a] rounded-nullxl p-8 text-white">
          <p className="text-white mb-2">Total Earnings</p>
          <p className="text-4xl font-bold mb-2">KES {wallet.total.toLocaleString()}</p>
          <p className="text-sm text-white">All time</p>
        </div>
      </div>

      {/* Transaction History */}
      <div className="bg-white rounded-nullxl border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-[#3d1a7a] mb-6">📝 Transaction History</h3>
        {transactions.length === 0 ? (
          <div className="text-center py-12 text-[#6E6658]">
            <WalletIcon className="w-16 h-16 mx-auto mb-4 text-[#5d2ba3]/50" />
            <p className="text-lg">No transactions yet</p>
            <p className="text-sm">Your transaction history will appear here.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {transactions.map((tx: any, idx: number) => {
              // If transaction has fee breakdown, show it
              const hasFeeBreakdown = tx.platformFee !== undefined && tx.sellerPayout !== undefined;
              const grossAmount = hasFeeBreakdown ? (tx.platformFee + tx.sellerPayout) : tx.amount;

              return (
                <div key={idx} className="p-4 bg-[#5d2ba3]/5 rounded-nulllg border border-[#5d2ba3]/20">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-nullfull ${tx.type === 'deposit' ? 'bg-[#5d2ba3]/20' : 'bg-[#4F4A41]/20'}`}>
                        {tx.type === 'deposit' ? (
                          <ArrowDownLeftIcon className="text-white" size={20} />
                        ) : (
                          <ArrowUpRightIcon className="text-white" size={20} />
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-[#250e52]">{tx.desc || tx.itemName || 'Transaction'}</p>
                        <p className="text-sm text-[#6E6658]">{tx.date || new Date(tx.createdAt || Date.now()).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      {hasFeeBreakdown ? (
                        <div>
                          <p className="text-lg font-bold text-[#5d2ba3]">+KES {tx.sellerPayout.toLocaleString()}</p>
                          <p className="text-xs text-[#6E6658]">Net (after fees)</p>
                        </div>
                      ) : (
                        <p className={`text-xl font-bold ${tx.type === 'deposit' ? 'text-[#5d2ba3]' : 'text-[#4F4A41]'}`}>
                          {tx.type === 'deposit' ? '+' : '-'}KES {tx.amount.toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                  {hasFeeBreakdown && (
                    <div className="mt-3 pt-3 border-t border-[#5d2ba3]/20 text-xs text-[#6E6658] space-y-1">
                      <div className="flex justify-between">
                        <span>Gross Amount:</span>
                        <span className="font-semibold">KES {grossAmount.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Platform Fee ({tx.platformFeePercent || 5}%):</span>
                        <span className="text-[#4F4A41]">-KES {tx.platformFee.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between font-semibold text-[#5d2ba3]">
                        <span>Your Payout:</span>
                        <span>KES {tx.sellerPayout.toLocaleString()}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  // DISPUTES TAB
  const renderDisputes = () => <DisputesManagement />;

  // SOCIAL TAB
  const [socialAccounts, setSocialAccounts] = useState<any[]>([]);
  const [socialLoading, setSocialLoading] = useState(false);
  const [connectingPlatform, setConnectingPlatform] = useState<string | null>(null);
  const [connectForm, setConnectForm] = useState({ pageUrl: '', pageId: '' });

  useEffect(() => {
    async function loadSocial() {
      if (activeTab === 'social') {
        setSocialLoading(true);
        const res = await api.listSocialAccounts();
        if (res.success && res.data) {
          setSocialAccounts(Array.isArray(res.data) ? res.data : []);
        }
        setSocialLoading(false);
      }
    }
    loadSocial();
  }, [activeTab]);

  const handleConnectSocial = async (platform: 'INSTAGRAM' | 'FACEBOOK') => {
    if (!connectForm.pageUrl) {
      alert('Please enter the page URL');
      return;
    }
    setConnectingPlatform(platform);
    const res = await api.connectSocialPage({
      platform,
      pageUrl: connectForm.pageUrl,
      pageId: connectForm.pageId || undefined,
    });
    if (res.success) {
      setConnectForm({ pageUrl: '', pageId: '' });
      setConnectingPlatform(null);
      const updatedRes = await api.listSocialAccounts();
      if (updatedRes.success && updatedRes.data) {
        setSocialAccounts(Array.isArray(updatedRes.data) ? updatedRes.data : []);
      }
      alert('Social page connected! AI will scan for products.');
    } else {
      alert(res.error || 'Failed to connect');
      setConnectingPlatform(null);
    }
  };

  const handleRescan = async (id: string) => {
    const res = await api.rescanSocialPage(id);
    if (res.success) {
      alert('Rescan triggered! Check sync logs for status.');
    } else {
      alert(res.error || 'Failed to trigger rescan');
    }
  };

  const renderSocial = () => {
    if (socialLoading) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-600">Loading social accounts...</div>
        </div>
      );
    }

    const platforms = [
      { key: 'INSTAGRAM', name: 'Instagram', icon: '📸' },
      { key: 'FACEBOOK', name: 'Facebook', icon: '👍' },
    ];

    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-[#3d1a7a]">📱 Social Media Connections</h2>
        <p className="text-gray-600">Connect your social pages to automatically import products via AI.</p>

        <div className="grid md:grid-cols-2 gap-6">
          {platforms.map((platform) => {
            const connected = socialAccounts.find(acc => acc.platform === platform.key);
            return (
              <div key={platform.key} className={`rounded-nullxl p-6 border-2 ${connected ? 'bg-[#5d2ba3]/10 border-[#5d2ba3]/30' : 'bg-[#5d2ba3]/5 border-[#5d2ba3]/20'}`}>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="text-3xl mb-2">{platform.icon}</p>
                    <p className="font-bold text-lg">{platform.name}</p>
                    {connected ? (
                      <p className="text-sm text-gray-600">{connected.pageUrl}</p>
                    ) : (
                      <p className="text-sm text-gray-600">Not Connected</p>
                    )}
                  </div>
                  {connected && <span className="px-3 py-1 bg-[#5d2ba3]/30 text-[#3d1a7a] rounded-nullfull text-xs font-bold">✓ Connected</span>}
                </div>
                {connected ? (
                  <div className="space-y-2">
                    <button
                      onClick={() => handleRescan(connected.id)}
                      className="w-full bg-[#3d1a7a] text-white py-2 rounded-nulllg hover:bg-[#250e52] transition text-sm font-semibold"
                    >
                      Rescan Now
                    </button>
                    <p className="text-xs text-gray-500 text-center">
                      Last scanned: {connected.lastScannedAt ? new Date(connected.lastScannedAt).toLocaleDateString() : 'Never'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder={`${platform.name} page URL`}
                      value={connectForm.pageUrl}
                      onChange={(e) => setConnectForm({ ...connectForm, pageUrl: e.target.value })}
                      className="w-full px-3 py-2 rounded-null-lg border border-gray-300 text-sm"
                    />
                    <button
                      onClick={() => handleConnectSocial(platform.key as 'INSTAGRAM' | 'FACEBOOK')}
                      disabled={connectingPlatform === platform.key || !connectForm.pageUrl}
                      className="w-full bg-[#5d2ba3] text-white py-2 rounded-nulllg hover:bg-[#3d1a7a] transition font-semibold disabled:opacity-50"
                    >
                      {connectingPlatform === platform.key ? 'Connecting...' : 'Connect'}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

      </div>
    );
  };

  // STORE SETTINGS TAB
  const renderStore = () => {
    if (storeLoading) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="text-muted-foreground">Loading store settings...</div>
        </div>
      );
    }

    if (!storeData) {
      return (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-[#3d1a7a]">🏬 Create Your Store</h2>
          <div className="bg-card rounded-null-xl border border-border p-8 text-center">
            <StoreIcon className="w-16 h-16 mx-auto mb-4 text-[#5d2ba3]/50" size={64} />
            <h3 className="text-xl font-bold text-[#3d1a7a] mb-2">You don't have a store yet</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Create your store to start selling products and managing orders. It only takes a minute!
            </p>
            <button
              onClick={() => setShowCreateStoreModal(true)}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-null-xl bg-primary text-primary-foreground hover:bg-primary/90 transition font-semibold"
            >
              <PlusIcon size={20} />
              Create Store
            </button>
          </div>
        </div>
      );
    }

    // If store exists, show button to open store dashboard
    const storefrontUrl = storeData.slug ? `${window.location.origin}/store/${storeData.slug}` : '';
    const copyStorefrontLink = () => {
      if (!storefrontUrl) return;
      navigator.clipboard.writeText(storefrontUrl);
      setStorefrontCopied(true);
      setTimeout(() => setStorefrontCopied(false), 2000);
    };

    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-[#3d1a7a]">🏬 Your Store</h2>
        <div className="bg-card rounded-null-xl border border-border p-6">
          <div className="flex items-center gap-4 mb-4">
            {storeData.logo ? (
              <img src={storeData.logo} alt="Store logo" className="w-16 h-16 object-cover rounded-null-xl" />
            ) : (
              <div className="w-16 h-16 bg-muted rounded-null-xl flex items-center justify-center">
                <StoreIcon size={28} className="text-[#5d2ba3]/70" />
              </div>
            )}
            <div>
              <h3 className="text-xl font-bold text-[#3d1a7a]">{storeData.name}</h3>
              <p className="text-sm text-muted-foreground">/store/{storeData.slug}</p>
            </div>
            <span className={`ml-auto px-3 py-1 rounded-null-full text-sm font-bold ${storeData.status === 'ACTIVE' ? 'bg-[#5d2ba3]/20 text-[#3d1a7a]' :
              storeData.status === 'FROZEN' ? 'bg-[#4F4A41]/20 text-[#4F4A41]' :
                'bg-[#6E6658]/20 text-[#6E6658]'
              }`}>
              {storeData.status || 'INACTIVE'}
            </span>
          </div>
          {storefrontUrl && (
            <div className="mb-4 p-3 bg-muted/50 rounded-null-lg border border-border">
              <p className="text-xs font-semibold text-muted-foreground mb-2">Storefront link (share with customers)</p>
              <div className="flex gap-2">
                <code className="flex-1 truncate text-sm py-2 px-3 bg-background rounded-null border border-border">{storefrontUrl}</code>
                <button
                  type="button"
                  onClick={copyStorefrontLink}
                  className="px-4 py-2 rounded-null-lg bg-[#3d1a7a] text-white hover:bg-[#250e52] transition text-sm font-semibold whitespace-nowrap"
                >
                  {storefrontCopied ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {storeData.status === 'ACTIVE' ? 'Your storefront is live.' : 'Activate your store in Store Dashboard → Settings to make this link live.'}
              </p>
            </div>
          )}
          <button
            onClick={() => setShowStoreDashboard(true)}
            className="w-full px-4 py-3 rounded-null-xl bg-primary text-primary-foreground hover:bg-primary/90 transition font-semibold"
          >
            Open Store Dashboard
          </button>
        </div>
      </div>
    );
  };

  // PUBLISHED PRODUCTS TAB
  const [publishedProducts, setPublishedProducts] = useState<any[]>([]);
  const [publishedLoading, setPublishedLoading] = useState(false);

  useEffect(() => {
    async function loadPublished() {
      if (activeTab === 'published') {
        setPublishedLoading(true);
        const res = await api.listPublishedProducts();
        if (res.success && res.data) {
          setPublishedProducts(Array.isArray(res.data) ? res.data : []);
        }
        setPublishedLoading(false);
      }
    }
    loadPublished();
  }, [activeTab]);

  const handleArchiveProduct = async (id: string) => {
    if (!confirm('Archive this product? It will be removed from your storefront.')) return;
    const res = await api.archiveProduct(id);
    if (res.success) {
      const updatedRes = await api.listPublishedProducts();
      if (updatedRes.success && updatedRes.data) {
        setPublishedProducts(Array.isArray(updatedRes.data) ? updatedRes.data : []);
      }
    }
  };

  const renderPublishedProducts = () => {
    if (publishedLoading) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-600">Loading products...</div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-[#3d1a7a]">✅ Published Products</h2>
        {publishedProducts.length === 0 ? (
          <div className="bg-white rounded-nullxl border border-gray-200 p-8 text-center">
            <p className="text-gray-600">No published products yet.</p>
            <p className="text-sm text-gray-500 mt-2">Publish drafts to make them visible on your storefront.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {publishedProducts.map((product) => (
              <div key={product.id} className="bg-white rounded-nullxl border border-gray-200 p-6">
                {product.images && product.images.length > 0 && (
                  <img src={product.images[0]} alt={product.name} className="w-full h-48 object-cover rounded-null-lg mb-4" />
                )}
                <h3 className="font-semibold text-lg mb-2">{product.name}</h3>
                {product.price && (
                  <p className="text-[#3d1a7a] font-bold mb-2">KES {product.price.toLocaleString()}</p>
                )}
                {product.description && (
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">{product.description}</p>
                )}
                <div className="flex gap-2">

                  <a
                    href={`/store/${storeData?.slug || 'your-store'}/product/${product.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 px-3 py-2 rounded-nulllg bg-gray-200 text-gray-800 text-sm hover:bg-gray-300 transition text-center"
                  >
                    View
                  </a>
                  <button
                    onClick={() => handleArchiveProduct(product.id)}
                    className="flex-1 px-3 py-2 rounded-nulllg bg-[#4F4A41] text-white text-sm hover:bg-[#6E6658] transition"
                  >
                    Archive
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // SYNC LOGS TAB
  const [syncLogs, setSyncLogs] = useState<any[]>([]);
  const [syncLogsLoading, setSyncLogsLoading] = useState(false);

  useEffect(() => {
    async function loadSyncLogs() {
      if (activeTab === 'sync_logs') {
        setSyncLogsLoading(true);
        const res = await api.adminListSyncLogs(1, 50);
        if (res.success && res.data) {
          const logs = Array.isArray(res.data) ? res.data : (res.data as any).logs || [];
          setSyncLogs(logs);
        }
        setSyncLogsLoading(false);
      }
    }
    loadSyncLogs();
  }, [activeTab]);

  const renderSyncLogs = () => {
    if (syncLogsLoading) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-600">Loading sync logs...</div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-[#3d1a7a]">🪵 Sync Logs</h2>
          <button
            onClick={async () => {
              const res = await api.triggerStoreRescan();
              if (res.success) {
                alert('Rescan triggered! Refresh to see new logs.');
                const updatedRes = await api.adminListSyncLogs(1, 50);
                if (updatedRes.success && updatedRes.data) {
                  const logs = Array.isArray(updatedRes.data) ? updatedRes.data : (updatedRes.data as any).logs || [];
                  setSyncLogs(logs);
                }
              }
            }}
            className="px-4 py-2 rounded-null-lg bg-[#3d1a7a] text-white hover:bg-[#250e52] transition text-sm font-semibold"
          >
            Trigger Rescan
          </button>
        </div>

        {syncLogs.length === 0 ? (
          <div className="bg-white rounded-nullxl border border-gray-200 p-8 text-center">
            <p className="text-gray-600">No sync logs yet.</p>
            <p className="text-sm text-gray-500 mt-2">Sync logs will appear here after you connect social pages and scans run.</p>
          </div>
        ) : (
          <div className="bg-white rounded-nullxl border border-gray-200 p-6">
            <div className="space-y-3">
              {syncLogs.map((log: any, idx: number) => (
                <div key={log.id || idx} className="p-4 rounded-nulllg bg-gray-50 border border-gray-200">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <p className="font-semibold">{log.message || log.eventType || 'Sync Event'}</p>
                      <p className="text-xs text-gray-600 mt-1">
                        {log.createdAt ? new Date(log.createdAt).toLocaleString() : 'Unknown time'}
                      </p>
                      {(log.newCount > 0 || log.updatedCount > 0 || log.archivedCount > 0) && (
                        <div className="flex gap-4 mt-2 text-xs text-gray-600">
                          {log.newCount > 0 && <span className="text-[#5d2ba3]">+{log.newCount} new</span>}
                          {log.updatedCount > 0 && <span className="text-[#5d2ba3]">~{log.updatedCount} updated</span>}
                          {log.archivedCount > 0 && <span className="text-[#4F4A41]">-{log.archivedCount} archived</span>}
                        </div>
                      )}
                    </div>
                    <span className={`px-3 py-1 rounded-nullfull text-xs font-bold ${log.status === 'SUCCESS' ? 'bg-[#5d2ba3]/20 text-[#3d1a7a]' :
                      log.status === 'ERROR' ? 'bg-[#4F4A41]/20 text-[#4F4A41]' :
                        log.status === 'PARTIAL' ? 'bg-[#6E6658]/20 text-[#6E6658]' :
                          'bg-[#5d2ba3]/10 text-[#6E6658]'
                      }`}>
                      {log.status || 'UNKNOWN'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // SETTINGS TAB
  const [taxForm, setTaxForm] = useState({
    taxId: '',
    businessRegNumber: '',
    isBusiness: false
  });
  const [isSavingTax, setIsSavingTax] = useState(false);

  useEffect(() => {
    if (activeTab === 'settings') {
      setTaxForm({
        taxId: profile.taxId || '',
        businessRegNumber: profile.businessRegNumber || '',
        isBusiness: profile.isBusiness || false
      });
    }
  }, [activeTab, profile]);

  const handleSaveTax = async () => {
    setIsSavingTax(true);
    try {
      const res = await api.request('/api/v1/seller/profile/tax', {
        method: 'PATCH',
        body: taxForm
      });
      if (res.success) {
        alert('Tax information saved successfully!');
      } else {
        alert(res.error || 'Failed to save tax information');
      }
    } catch (err) {
      alert('An unexpected error occurred');
    } finally {
      setIsSavingTax(false);
    }
  };

  const renderSettings = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-[#3d1a7a]">⚙️ Settings</h2>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="bg-white rounded-nullxl border border-gray-200 p-6">
          <p className="text-gray-600 text-sm mb-2">Profile Picture</p>
          <div className="w-24 h-24 bg-gray-200 rounded-nulllg mb-4 flex items-center justify-center">
            <CameraIcon size={32} className="text-[#6E6658]" />
          </div>
          <button className="w-full bg-[#5d2ba3] text-white py-2 rounded-nulllg hover:bg-[#3d1a7a] transition font-semibold text-sm">
            Change Photo
          </button>
        </div>

        <div className="md:col-span-2 bg-white rounded-nullxl border border-gray-200 p-6">
          <p className="font-bold text-lg mb-4">Tax & Compliance</p>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Entity Type</label>
              <div className="flex gap-4">
                <button 
                  onClick={() => setTaxForm({ ...taxForm, isBusiness: false })}
                  className={`flex-1 py-2 rounded-lg border transition font-bold text-sm ${!taxForm.isBusiness ? 'bg-[#5d2ba3] text-white border-[#5d2ba3]' : 'bg-white text-gray-600 border-gray-200'}`}
                >
                  Individual
                </button>
                <button 
                  onClick={() => setTaxForm({ ...taxForm, isBusiness: true })}
                  className={`flex-1 py-2 rounded-lg border transition font-bold text-sm ${taxForm.isBusiness ? 'bg-[#5d2ba3] text-white border-[#5d2ba3]' : 'bg-white text-gray-600 border-gray-200'}`}
                >
                  Registered Business
                </button>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {selectedCountry.code === 'KE' ? 'KRA PIN Number' : 'Tax Identification Number (TIN)'} *
              </label>
              <input 
                type="text"
                value={taxForm.taxId}
                onChange={(e) => setTaxForm({ ...taxForm, taxId: e.target.value })}
                placeholder={selectedCountry.code === 'KE' ? 'A012345678X' : 'Enter your TIN'}
                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:border-[#5d2ba3]"
              />
            </div>

            {taxForm.isBusiness && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Business Registration Number</label>
                <input 
                  type="text"
                  value={taxForm.businessRegNumber}
                  onChange={(e) => setTaxForm({ ...taxForm, businessRegNumber: e.target.value })}
                  placeholder="e.g. PVT-123456"
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:border-[#5d2ba3]"
                />
              </div>
            )}

            <button 
              onClick={handleSaveTax}
              disabled={isSavingTax || !taxForm.taxId}
              className="w-full bg-[#5d2ba3] text-white py-3 rounded-lg font-bold hover:bg-[#3d1a7a] transition disabled:opacity-50"
            >
              {isSavingTax ? 'Saving...' : 'Save Tax Information'}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-nullxl border border-gray-200 p-6">
        <p className="font-bold text-lg mb-4">Verification Status</p>
        <div className="space-y-3">
          <div className="flex justify-between items-center p-3 bg-[#5d2ba3]/10 rounded-nulllg border border-[#5d2ba3]/30">
            <span className="font-semibold">ID Verification</span>
            <span className="text-[#5d2ba3] font-bold">⏳ Pending</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-[#5d2ba3]/10 rounded-nulllg border border-[#5d2ba3]/30">
            <span className="font-semibold">Phone</span>
            <span className="text-[#5d2ba3] font-bold">⏳ Pending</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-[#5d2ba3]/10 rounded-nulllg border border-[#5d2ba3]/30">
            <span className="font-semibold">M-Pesa</span>
            <span className="text-[#5d2ba3] font-bold">⏳ Pending</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-nullxl border border-gray-200 p-6">
        <p className="font-bold text-lg mb-4">Quick Settings</p>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="font-semibold">Push Notifications</span>
            <input type="checkbox" defaultChecked className="w-5 h-5" />
          </div>
          <div className="flex justify-between items-center">
            <span className="font-semibold">SMS Alerts</span>
            <input type="checkbox" defaultChecked className="w-5 h-5" />
          </div>
          <div className="flex justify-between items-center">
            <span className="font-semibold">Email Updates</span>
            <input type="checkbox" defaultChecked className="w-5 h-5" />
          </div>
        </div>
      </div>

      <button
        onClick={() => navigate('/')}
        className="w-full bg-[#4F4A41] text-white py-3 rounded-nulllg hover:bg-[#6E6658] transition font-bold text-lg"
      >
        🚪 Log Out
      </button>
    </div>
  );

  // SUPPORT TAB
  const renderSupport = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-[#3d1a7a]">❓ Help & Support</h2>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="bg-white rounded-nullxl border border-gray-200 p-6 text-center hover:shadow-lg transition cursor-pointer">
          <MessageCircleIcon className="w-12 h-12 mx-auto mb-4 text-[#3d1a7a]" size={48} />
          <p className="font-bold mb-2">Live Chat</p>
          <p className="text-sm text-gray-600 mb-4">Available 9 AM - 6 PM</p>
          <button className="w-full bg-[#5d2ba3] text-white py-2 rounded-nulllg hover:bg-[#3d1a7a] transition font-semibold">
            Start Chat
          </button>
        </div>

        <div className="bg-white rounded-nullxl border border-gray-200 p-6 text-center hover:shadow-lg transition cursor-pointer">
          <MailIcon className="w-12 h-12 mx-auto mb-4 text-[#5d2ba3]" size={48} />
          <p className="font-bold mb-2">Email Support</p>
          <p className="text-sm text-gray-600 mb-4">support@payloom.com</p>
          <button className="w-full bg-[#5d2ba3] text-white py-2 rounded-nulllg hover:bg-[#3d1a7a] transition font-semibold">
            Send Email
          </button>
        </div>

        <div className="bg-white rounded-nullxl border border-gray-200 p-6 text-center hover:shadow-lg transition cursor-pointer">
          <PhoneIcon className="w-12 h-12 mx-auto mb-4 text-[#6E6658]" size={48} />
          <p className="font-bold mb-2">Call Us</p>
          <p className="text-sm text-gray-600 mb-4">+254 701 234 567</p>
          <button className="w-full bg-[#5d2ba3] text-white py-2 rounded-nulllg hover:bg-[#3d1a7a] transition font-semibold">
            Call Now
          </button>
        </div>
      </div>

      <div className="bg-white rounded-nullxl border border-gray-200 p-6">
        <p className="font-bold text-lg mb-4">Common Questions</p>
        <div className="space-y-3">
          {[
            'How do orders work?',
            'What if buyer doesn\'t confirm?',
            'How to withdraw funds?',
            'How to handle disputes?',
            'How to connect social media?',
          ].map((q, idx) => (
            <div key={idx} className="p-3 bg-gray-50 rounded-nulllg border border-gray-200 hover:bg-gray-100 transition cursor-pointer flex justify-between items-center">
              <span>{q}</span>
              <ChevronRightIcon size={20} className="text-[#6E6658]" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // If store dashboard is open, show it instead
  if (showStoreDashboard && storeData) {
    return (
      <StoreDashboard
        store={{
          id: storeData.id || '',
          name: storeData.name || '',
          slug: storeData.slug || '',
          logo: storeData.logo,
          bio: storeData.bio,
          visibility: storeData.visibility,
          status: storeData.status,
        }}
        onStoreUpdate={(data) => setStoreData(prev => prev ? { ...prev, ...data } : null)}
        onBack={() => setShowStoreDashboard(false)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex font-sans">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden" 
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 w-72 bg-[#250e52] flex flex-col z-50 transform transition-transform duration-300 lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 border-b border-[#3d1a7a] flex items-center justify-between">
          <div className="flex items-center justify-center w-full">
            <img 
              src="/logo.jpeg" 
              alt="PayLoom Logo" 
              className="w-40 h-auto object-contain"
            />
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden text-[#5d2ba3] p-2 hover:bg-[#3d1a7a]/30 rounded-null-lg">
            <XIcon size={24} />
          </button>
        </div>

        <nav className="flex-1 py-6 px-4 space-y-1 overflow-y-auto sidebar-scrollbar">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  if (window.innerWidth < 1024) setIsSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-null-xl text-sm font-bold transition-all duration-200 ${
                  isActive
                    ? 'bg-[#5d2ba3] text-white shadow-lg shadow-[#5d2ba3]/20'
                    : 'text-white hover:bg-[#5d2ba3]/50 hover:text-white'
                }`}
              >
                <Icon size={20} />
                <span>{item.label}</span>
                {isActive && <ChevronRightIcon className="ml-auto text-white" size={16} />}
              </button>
            );
          })}
        </nav>

        {/* Profile/Footer Area */}
        <div className="p-4 border-t border-[#3d1a7a] bg-[#250e52]/50">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-[#3d1a7a] rounded-null-full flex items-center justify-center text-white font-bold">
              {profile.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-bold truncate">{profile.name}</p>
              <p className="text-white/70 text-xs truncate">Seller Account</p>
            </div>
          </div>
          <button
            onClick={async () => {
              await logout();
              navigate('/');
            }}
            className="w-full flex items-center justify-center gap-2 py-2 text-sm font-bold text-[#6E6658] hover:text-[#4F4A41] transition"
          >
            {t('seller.logout')}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 lg:ml-72 min-h-screen">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-4 md:px-8 sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2 text-gray-500 hover:bg-gray-100 rounded-null-lg transition"
            >
              <MenuIcon size={24} />
            </button>
            <h1 className="text-xl font-black text-[#250e52] hidden md:block">
              {navItems.find(i => i.id === activeTab)?.label}
            </h1>
          </div>

          <div className="flex items-center gap-3 md:gap-6">
            <CurrencySelector />
            <button className="p-2 text-[#3d1a7a] hover:bg-gray-100 rounded-full transition relative">
              <BellIcon size={24} />
              <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-[#5d2ba3] border-2 border-white rounded-full"></span>
            </button>
            <div className="h-8 w-px bg-gray-200 hidden md:block"></div>
            <div className="flex items-center gap-3">
              <div className="text-right hidden md:block">
                <p className="text-sm font-bold text-[#250e52]">{profile.name}</p>
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#5d2ba3]"></div>
                  <p className="text-[10px] text-gray-500 font-medium">ONLINE</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="p-6">
          <div className="max-w-7xl mx-auto">
            {activeTab === 'home' && renderHome()}
            {activeTab === 'orders' && renderOrders()}
            {activeTab === 'wallet' && renderWallet()}
            {activeTab === 'disputes' && renderDisputes()}
            {activeTab === 'create_link' && renderCreateLink()}
            {activeTab === 'my_links' && <MyLinksPage />}
            {activeTab === 'store' && renderStore()}
            {activeTab === 'ai_drafts' && <AIDraftsTab />}
            {activeTab === 'published' && renderPublishedProducts()}
            {activeTab === 'sync_logs' && renderSyncLogs()}
            {activeTab === 'social' && renderSocial()}
            {activeTab === 'settings' && renderSettings()}
            {activeTab === 'support' && renderSupport()}
          </div>
        </main>
      </div>

      {/* Withdrawal Modal */}
      <WithdrawalModal
        isOpen={withdrawalModal}
        onClose={() => setWithdrawalModal(false)}
        availableBalance={wallet.available}
      />

      {/* Create Store Modal */}
      <CreateStoreModal
        isOpen={showCreateStoreModal}
        onClose={() => setShowCreateStoreModal(false)}
        onStoreCreated={(store) => {
          setStoreData(store);
          setShowCreateStoreModal(false);
          setShowStoreDashboard(true);
        }}
      />

      {/* Share Modal */}
      {shareModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-null-xl max-w-md w-full p-8">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-[#3d1a7a]">🔗 Share on Social</h3>
              <button onClick={() => setShareModal(false)} className="text-gray-500 hover:text-gray-700">
                <XIcon size={24} />
              </button>
            </div>
            <div className="bg-[#5d2ba3]/10 p-4 rounded-null-lg mb-6 border border-[#5d2ba3]/30">
              <p className="text-sm font-mono text-gray-900 break-all">Create a payment link first to share</p>
            </div>
            <div className="space-y-3 mb-6">
              <button className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-null-lg bg-[#5d2ba3] text-white hover:bg-[#3d1a7a] transition font-semibold">
                📸 Share on Instagram
              </button>
              <button className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-null-lg bg-[#5d2ba3] text-white hover:bg-[#3d1a7a] transition font-semibold">
                💬 Share on WhatsApp
              </button>
              <button className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-null-lg bg-[#5d2ba3] text-white hover:bg-[#3d1a7a] transition font-semibold">
                👍 Share on Facebook
              </button>
            </div>
            <button onClick={() => setShareModal(false)} className="w-full px-4 py-3 rounded-null-lg bg-gray-100 text-gray-900 hover:bg-gray-200 transition font-semibold">
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}