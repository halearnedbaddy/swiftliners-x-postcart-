import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingBagIcon, WalletIcon, AlertTriangleIcon, ActivityIcon, LogOutIcon, MenuIcon, XIcon } from '@/components/icons';
import { BuyerOrders } from '@/components/buyer/BuyerOrders';
import { BuyerWallet } from '@/components/buyer/BuyerWallet';
import { BuyerDisputes } from '@/components/buyer/BuyerDisputes';
import { BuyerActivity } from '@/components/buyer/BuyerActivity';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { useBuyerData } from '@/hooks/useBuyerData';
import { CurrencySelector } from '@/components/CurrencySelector';
import { useTranslations } from '@/hooks/useTranslations';

export function BuyerDashboard() {
  const navigate = useNavigate();
  const { t } = useTranslations();
  const { user, logout } = useSupabaseAuth() ?? {};
  const { orders, wallet, disputes, loading, error, isConnected, refetch } = useBuyerData();
  const [activeTab, setActiveTab] = useState<'purchases' | 'wallet' | 'disputes' | 'activity'>('purchases');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logout?.();
    navigate('/');
  };

  const navItems = [
    { id: 'purchases', label: t('buyer.myPurchases'), icon: ShoppingBagIcon },
    { id: 'wallet', label: t('buyer.myWallet'), icon: WalletIcon },
    { id: 'disputes', label: t('buyer.myDisputes'), icon: AlertTriangleIcon },
    { id: 'activity', label: t('buyer.activity'), icon: ActivityIcon },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex font-sans">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden" 
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Dark Purple Sidebar */}
      <div className={`fixed inset-y-0 left-0 w-72 bg-[#250e52] flex flex-col z-50 transform transition-transform duration-300 lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        {/* Logo Header */}
        <div className="p-4 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center justify-center w-full">
            <img 
              src="/logo.jpeg" 
              alt="PayLoom Logo" 
              className="w-40 h-auto object-contain"
            />
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden text-white p-2 hover:bg-[#5d2ba3]/50 rounded-null-lg">
            <XIcon size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto sidebar-scrollbar">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id as typeof activeTab);
                  if (window.innerWidth < 1024) setIsSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-null-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-[#5d2ba3] text-white shadow-lg shadow-[#5d2ba3]/30'
                    : 'text-white hover:bg-[#5d2ba3]/50 hover:text-white'
                }`}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Logout & Profile Footer */}
        <div className="mt-auto border-t border-[#3d1a7a]">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-6 py-4 text-sm font-medium text-[#6E6658] hover:bg-[#4F4A41]/10 transition"
          >
            <LogOutIcon size={18} />
            <span>{t('buyer.logout')}</span>
          </button>
          <div className="p-4 bg-[#250e52]/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#3d1a7a] rounded-null-full flex items-center justify-center text-white font-bold text-sm">
                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">{user?.name || t('buyer.user')}</p>
                <p className="text-white/70 text-xs truncate">{user?.email || user?.phone || ''}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 lg:ml-72 min-h-screen">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 h-14 flex items-center justify-between px-6 sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2 text-gray-500 hover:bg-gray-100 rounded-null-lg transition"
            >
              <MenuIcon size={20} />
            </button>
            <h1 className="text-lg font-semibold text-[#3d1a7a]">
              {activeTab === 'purchases' && 'My Purchases'}
              {activeTab === 'wallet' && 'My Wallet'}
              {activeTab === 'disputes' && 'My Disputes'}
              {activeTab === 'activity' && 'Activity'}
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <CurrencySelector />
            <span className={`flex items-center gap-1.5 text-xs font-medium ${isConnected ? 'text-[#5d2ba3]' : 'text-gray-400'}`}>
              <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-[#5d2ba3]' : 'bg-gray-300'}`}></span>
              {isConnected ? 'Online' : 'Offline'}
            </span>
          </div>
        </header>

        {/* Content Area */}
        <main className="p-6">
          <div className="max-w-7xl mx-auto">
            {activeTab === 'purchases' && <BuyerOrders orders={orders} loading={loading} error={error} isConnected={isConnected} onRefresh={refetch} />}
            {activeTab === 'wallet' && <BuyerWallet wallet={wallet} loading={loading} error={error} onRefresh={refetch} userEmail={user?.email} />}
            {activeTab === 'disputes' && <BuyerDisputes disputes={disputes} loading={loading} error={error} onRefresh={refetch} />}
            {activeTab === 'activity' && <BuyerActivity />}
          </div>
        </main>
      </div>
    </div>
  );
}
