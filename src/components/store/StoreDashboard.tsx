import { useState } from 'react';
import { StoreSidebar, StoreTab } from './StoreSidebar';
import { StoreOverview } from './StoreOverview';
import { StoreAnalytics } from './StoreAnalytics';
import { StoreProducts } from './StoreProducts';
import { StoreOrders } from './StoreOrders';
import { MyStorefront } from './MyStorefront';
import { StoreSettings } from './StoreSettings';
import { Menu, X, Bell, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface StoreData {
  id: string;
  name: string;
  slug: string;
  logo?: string | null;
  bio?: string | null;
  visibility?: string;
  status?: string;
}

interface StoreDashboardProps {
  store: StoreData;
  onStoreUpdate: (data: Partial<StoreData>) => void;
  onBack: () => void;
}

export function StoreDashboard({ store, onStoreUpdate, onBack }: StoreDashboardProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<StoreTab>('overview');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return <StoreOverview storeName={store.name} storeSlug={store.slug} storeId={store.id} onNavigate={(tab) => setActiveTab(tab as StoreTab)} />;
      case 'analytics':
        return <StoreAnalytics />;
      case 'products':
        return <StoreProducts storeSlug={store.slug} />;
      case 'orders':
        return <StoreOrders />;
      case 'my-store':
        return <MyStorefront storeSlug={store.slug} storeName={store.name} />;
      case 'settings':
        return <StoreSettings store={store} onUpdate={onStoreUpdate} />;
      default:
        return <StoreOverview storeName={store.name} />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation */}
      <nav className="bg-card border-b border-border sticky top-0 z-40">
        <div className="px-4 md:px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)} 
              className="md:hidden text-foreground p-2 hover:bg-muted rounded-null transition"
            >
              {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition"
            >
              <ArrowLeft size={20} />
              <span className="hidden sm:inline">Back to Dashboard</span>
            </button>
            <div className="hidden md:block w-px h-6 bg-border" />
            <div
              className="text-xl font-black bg-gradient-to-r from-[#5d2ba3] to-[#3d1a7a] bg-clip-text text-transparent cursor-pointer"
              onClick={() => navigate('/')}
            >
              PayLoom
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button className="relative p-2 text-foreground hover:bg-muted rounded-full transition">
              <Bell size={24} />
            </button>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/80 text-primary-foreground font-bold flex items-center justify-center">
              {store.name.charAt(0).toUpperCase()}
            </div>
          </div>
        </div>
      </nav>

      <div className="flex">
        {/* Sidebar */}
        <div className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 fixed md:sticky top-16 h-[calc(100vh-64px)] z-30 transition-transform duration-300`}>
          <StoreSidebar 
            activeTab={activeTab} 
            onTabChange={(tab) => {
              setActiveTab(tab);
              setSidebarOpen(false);
            }}
            storeName={store.name}
          />
        </div>

        {/* Overlay for mobile */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-20 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main Content */}
        <div className="flex-1 p-4 md:p-6 min-h-[calc(100vh-64px)]">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
