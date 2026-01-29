import { useState, useEffect } from 'react';
import { Search, Store, Eye, Snowflake, Play, Loader, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface AdminStore {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  bio?: string;
  status: 'active' | 'inactive' | 'frozen';
  visibility: string;
  seller: {
    id: string;
    name: string;
    phone: string;
  };
  productCount: number;
  createdAt: string;
}

export function AdminStores() {
  const [stores, setStores] = useState<AdminStore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  

  useEffect(() => {
    fetchStores();
  }, []);

  const fetchStores = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch stores with seller profiles
      const { data: storesData, error: storesError } = await supabase
        .from('stores')
        .select(`
          id,
          name,
          slug,
          logo,
          bio,
          status,
          visibility,
          seller_id,
          created_at
        `)
        .order('created_at', { ascending: false });

      if (storesError) throw storesError;

      // Get product counts and seller info
      const storesWithDetails = await Promise.all(
        (storesData || []).map(async (store) => {
          // Get product count
          const { count } = await supabase
            .from('products')
            .select('*', { count: 'exact', head: true })
            .eq('store_id', store.id);

          // Get seller profile
          const { data: profile } = await supabase
            .from('profiles')
            .select('name, phone, user_id')
            .eq('user_id', store.seller_id)
            .single();

          return {
            id: store.id,
            name: store.name,
            slug: store.slug,
            logo: store.logo || undefined,
            bio: store.bio || undefined,
            status: store.status as 'active' | 'inactive' | 'frozen',
            visibility: store.visibility || 'public',
            seller: {
              id: store.seller_id,
              name: profile?.name || 'Unknown',
              phone: profile?.phone || 'N/A',
            },
            productCount: count || 0,
            createdAt: store.created_at || new Date().toISOString(),
          };
        })
      );

      setStores(storesWithDetails);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch stores');
    } finally {
      setLoading(false);
    }
  };

  const handleFreezeStore = async (storeId: string) => {
    setActionLoading(storeId);
    try {
      const { error } = await supabase
        .from('stores')
        .update({ status: 'frozen' })
        .eq('id', storeId);
      
      if (!error) {
        await fetchStores();
      }
    } catch (err) {
      console.error('Failed to freeze store:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleActivateStore = async (storeId: string) => {
    setActionLoading(storeId);
    try {
      const { error } = await supabase
        .from('stores')
        .update({ status: 'active' })
        .eq('id', storeId);
      
      if (!error) {
        await fetchStores();
      }
    } catch (err) {
      console.error('Failed to activate store:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const filteredStores = stores.filter(store =>
    store.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    store.slug.toLowerCase().includes(searchTerm.toLowerCase()) ||
    store.seller.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active': return 'bg-[#5d2ba3]/10 text-[#5d2ba3]';
      case 'inactive': return 'bg-gray-100 text-gray-700';
      case 'frozen': return 'bg-[#4F4A41]/10 text-[#4F4A41]';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader size={32} className="animate-spin text-[#5d2ba3]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-null p-6 text-red-700">
        <p className="font-bold">Failed to load stores</p>
        <p className="text-sm">{error}</p>
        <button
          onClick={fetchStores}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-null text-sm font-semibold hover:bg-red-700 transition"
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
          <h2 className="text-2xl font-bold text-[#3d1a7a]">Store Management</h2>
          <p className="text-sm text-gray-500">Manage all seller stores ({stores.length} total)</p>
        </div>
        <button
          onClick={fetchStores}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-null text-sm font-semibold hover:bg-gray-200 transition"
        >
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      {/* Search */}
      <div className="bg-white rounded-null border border-gray-200 shadow-sm">
        <div className="p-4 border-b border-gray-200">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search by store name, slug, or seller..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-null focus:outline-none focus:border-[#3d1a7a] text-sm"
            />
          </div>
        </div>

        {/* Stores Grid */}
        <div className="p-6">
          {filteredStores.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredStores.map((store) => (
                <div
                  key={store.id}
                  className="bg-white border border-gray-200 rounded-null overflow-hidden hover:shadow-lg transition"
                >
                  {/* Store Header */}
                  <div className="h-24 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center relative">
                    {store.logo ? (
                      <img src={store.logo} alt={store.name} className="w-16 h-16 rounded-null-full object-cover border-2 border-white" />
                    ) : (
                      <div className="w-16 h-16 rounded-null-full bg-white flex items-center justify-center">
                        <Store className="text-gray-400" size={24} />
                      </div>
                    )}
                    <span className={`absolute top-2 right-2 px-2 py-1 rounded-null-full text-xs font-bold uppercase ${getStatusColor(store.status)}`}>
                      {store.status}
                    </span>
                  </div>

                  {/* Store Info */}
                  <div className="p-4 space-y-3">
                    <div>
                      <h3 className="font-bold text-[#3d1a7a]">{store.name}</h3>
                      <p className="text-xs text-gray-500 font-mono">/{store.slug}</p>
                    </div>

                    <div className="text-sm text-gray-600">
                      <p>Owner: <span className="font-semibold">{store.seller.name}</span></p>
                      <p>Products: <span className="font-semibold">{store.productCount}</span></p>
                      <p>Visibility: <span className={`font-semibold ${store.visibility === 'PUBLIC' ? 'text-[#5d2ba3]' : 'text-gray-500'}`}>
                        {store.visibility}
                      </span></p>
                    </div>

                    <div className="text-xs text-gray-400">
                      Created: {new Date(store.createdAt).toLocaleDateString()}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={() => window.open(`/store/${store.slug}`, '_blank')}
                        className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-null text-sm font-medium hover:bg-gray-200 transition"
                      >
                        <Eye size={14} /> View
                      </button>
                      {store.status === 'frozen' ? (
                        <button
                          onClick={() => handleActivateStore(store.id)}
                          disabled={actionLoading === store.id}
                          className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-[#3d1a7a] text-white rounded-null text-sm font-medium hover:bg-[#250e52] transition disabled:opacity-50"
                        >
                          {actionLoading === store.id ? (
                            <Loader size={14} className="animate-spin" />
                          ) : (
                            <Play size={14} />
                          )}
                          Activate
                        </button>
                      ) : (
                        <button
                          onClick={() => handleFreezeStore(store.id)}
                          disabled={actionLoading === store.id}
                          className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-[#4F4A41] text-white rounded-null text-sm font-medium hover:bg-[#3d3228] transition disabled:opacity-50"
                        >
                          {actionLoading === store.id ? (
                            <Loader size={14} className="animate-spin" />
                          ) : (
                            <Snowflake size={14} />
                          )}
                          Freeze
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Store className="mx-auto text-gray-300 mb-4" size={48} />
              <h3 className="text-lg font-bold text-[#3d1a7a]">No Stores Found</h3>
              <p className="text-gray-500">
                {searchTerm ? 'No stores match your search criteria' : 'No stores have been created yet'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
