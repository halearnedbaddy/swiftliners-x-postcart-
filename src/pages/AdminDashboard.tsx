import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HomeIcon, UsersIcon, AlertTriangleIcon, ActivityIcon, SettingsIcon, LogOutIcon, StoreIcon, LinkIcon, MenuIcon, XIcon } from '@/components/icons';
import { AdminOverview } from '@/components/admin/AdminOverview';
import { AdminTransactions } from '@/components/admin/AdminTransactions';
import { AdminDisputes } from '@/components/admin/AdminDisputes';
import { AdminUsers } from '@/components/admin/AdminUsers';
import { AdminStores } from '@/components/admin/AdminStores';
import { AdminSocial } from '@/components/admin/AdminSocial';
import { AdminSettings } from '@/components/admin/AdminSettings';
import { AdminNotificationCenter } from '@/components/admin/AdminNotificationCenter';
import { useSupabaseAuth } from '@/contexts/SupabaseAuthContext';
import { useTranslations } from '@/hooks/useTranslations';

export function AdminDashboard() {
  const navigate = useNavigate();
  const { t } = useTranslations();
  const { user, logout } = useSupabaseAuth() ?? {};
  const [activeTab, setActiveTab] = useState<'overview' | 'transactions' | 'disputes' | 'users' | 'settings' | 'stores' | 'social'>('overview');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logout?.();
    navigate('/');
  };

  const navItems = [
    { id: 'overview', label: t('admin.overview'), icon: HomeIcon },
    { id: 'transactions', label: t('admin.transactions'), icon: ActivityIcon },
    { id: 'disputes', label: t('admin.disputes'), icon: AlertTriangleIcon },
    { id: 'users', label: t('admin.userManagement'), icon: UsersIcon },
    { id: 'stores', label: t('admin.stores'), icon: StoreIcon },
    { id: 'social', label: t('admin.socialPages'), icon: LinkIcon },
    { id: 'settings', label: t('admin.settings'), icon: SettingsIcon },
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
                    ? 'bg-[#5d2ba3] text-white shadow-lg shadow-[#5d2ba3]/30 border-l-4 border-l-[#3d1a7a]'
                    : 'text-white/80 hover:bg-[#5d2ba3]/50 hover:text-white hover:border-l-4 hover:border-l-[#5d2ba3]/50'
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
            className="w-full flex items-center gap-3 px-6 py-4 text-sm font-medium text-white/80 hover:bg-[#5d2ba3]/50 hover:text-white transition"
          >
            <LogOutIcon size={18} />
            <span>{t('admin.logout')}</span>
          </button>
          <div className="p-4 bg-[#250e52]/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#3d1a7a] rounded-null-full flex items-center justify-center text-white font-bold text-sm">
                {user?.name?.charAt(0)?.toUpperCase() || 'A'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">{user?.name || t('admin.administrator')}</p>
                <p className="text-white/70 text-xs truncate">{user?.email || ''}</p>
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
            <h1 className="text-lg font-semibold text-[#3d1a7a] capitalize">
              {activeTab === 'users' ? 'User Management' : activeTab === 'social' ? 'Social Pages' : activeTab}
            </h1>
          </div>
          <AdminNotificationCenter />
        </header>

        {/* Content Area */}
        <main className="p-6">
          <div className="max-w-7xl mx-auto">
            {activeTab === 'overview' && <AdminOverview />}
            {activeTab === 'transactions' && <AdminTransactions />}
            {activeTab === 'disputes' && <AdminDisputes />}
            {activeTab === 'users' && <AdminUsers />}
            {activeTab === 'stores' && <AdminStores />}
            {activeTab === 'social' && <AdminSocial />}
            {activeTab === 'settings' && <AdminSettings />}
          </div>
        </main>
      </div>
    </div>
  );
}
