import { 
  HomeIcon, BarChartIcon, PackageIcon, ShoppingCartIcon, GlobeIcon, SettingsIcon 
} from '@/components/icons';

export type StoreTab = 'overview' | 'analytics' | 'products' | 'orders' | 'my-store' | 'settings';

interface StoreSidebarProps {
  activeTab: StoreTab;
  onTabChange: (tab: StoreTab) => void;
  storeName?: string;
}

export function StoreSidebar({ activeTab, onTabChange, storeName }: StoreSidebarProps) {
  const managementItems = [
    { id: 'overview' as StoreTab, label: 'Overview', icon: HomeIcon },
    { id: 'analytics' as StoreTab, label: 'Analytics', icon: BarChartIcon },
    { id: 'products' as StoreTab, label: 'Products', icon: PackageIcon },
    { id: 'orders' as StoreTab, label: 'Orders', icon: ShoppingCartIcon },
  ];

  const storefrontItems = [
    { id: 'my-store' as StoreTab, label: 'My Store', icon: GlobeIcon },
    { id: 'settings' as StoreTab, label: 'Settings', icon: SettingsIcon },
  ];

  const renderNavItem = (item: { id: StoreTab; label: string; icon: typeof HomeIcon }) => {
    const Icon = item.icon;
    const isActive = activeTab === item.id;

    return (
      <button
        key={item.id}
        onClick={() => onTabChange(item.id)}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-null-xl transition-all duration-200 ${
          isActive
            ? 'bg-primary text-primary-foreground font-semibold shadow-md'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
        }`}
      >
        <Icon size={20} />
        <span>{item.label}</span>
        {isActive && (
          <div className="ml-auto w-2 h-2 rounded-null-full bg-primary-foreground/80" />
        )}
      </button>
    );
  };

  return (
    <div className="w-64 bg-card border-r border-border h-full p-4">
      {/* Store Header */}
      {storeName && (
        <div className="mb-6 pb-4 border-b border-border">
          <h2 className="text-lg font-bold text-foreground truncate">{storeName}</h2>
          <p className="text-xs text-muted-foreground">Store Dashboard</p>
        </div>
      )}

      {/* Management Section */}
      <div className="mb-6">
        <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-3 px-4">
          Management
        </p>
        <nav className="space-y-1">
          {managementItems.map(renderNavItem)}
        </nav>
      </div>

      {/* Storefront Section */}
      <div>
        <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-3 px-4">
          Storefront
        </p>
        <nav className="space-y-1">
          {storefrontItems.map(renderNavItem)}
        </nav>
      </div>
    </div>
  );
}
