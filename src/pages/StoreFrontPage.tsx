import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '@/services/api';

interface StorefrontProduct {
  id: string;
  name: string;
  description?: string;
  price?: number;
  images?: string[];
}

interface StorefrontData {
  id: string;
  name: string;
  slug: string;
  status: 'INACTIVE' | 'ACTIVE' | 'FROZEN';
  products: StorefrontProduct[];
}

export function StoreFrontPage() {
  const { storeSlug } = useParams();
  const [store, setStore] = useState<StorefrontData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      if (!storeSlug) return;
      setLoading(true);
      const res = await api.getStorefront(storeSlug);
      if (!mounted) return;
      if (res.success && res.data) {
        setStore(res.data as unknown as StorefrontData);
        setError(null);
      } else {
        setError(res.error || 'Failed to load store');
      }
      setLoading(false);
    }
    load();
    return () => {
      mounted = false;
    };
  }, [storeSlug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading store...</div>
      </div>
    );
  }

  if (error || !store) {
    // Check if it's an inactive store error
    const isInactiveError = error?.toLowerCase().includes('inactive') || error?.toLowerCase().includes('activate');
    
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white border border-gray-200 rounded-null p-8 text-center max-w-md">
          <div className="mb-4">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
            </div>
            <p className="font-bold text-gray-800 mb-2 text-lg">
              {isInactiveError ? 'Store Not Yet Active' : 'Store Unavailable'}
            </p>
            <p className="text-sm text-gray-600 mb-4">
              {error || 'The store could not be found or is currently unavailable.'}
            </p>
            {isInactiveError && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left text-sm text-blue-800">
                <p className="font-semibold mb-2">To activate your store:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Connect at least one social account</li>
                  <li>Add a payout method</li>
                  <li>Activate your store in Settings</li>
                </ul>
              </div>
            )}
          </div>
          <Link 
            to="/" 
            className="inline-block px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition font-medium"
          >
            Return Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold text-[#3d1a7a]">{store.name}</h1>
          <p className="text-sm text-gray-600">Public Storefront • {store.products.length} products</p>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {store.products.length === 0 ? (
          <div className="bg-white rounded-null border border-gray-200 p-8 text-center text-gray-600">
            No products published yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {store.products.map((p: any) => (
              <Link
                key={p.id}
                to={`/store/${store.slug}/product/${p.id}`}
                className="bg-white border border-gray-200 rounded-null overflow-hidden hover:shadow-md transition relative"
              >
                {p.isAvailable === false && (
                  <div className="absolute top-2 right-2 bg-[#4F4A41] text-white px-2 py-1 rounded-null-full text-xs font-semibold z-10">
                    Unavailable
                  </div>
                )}
                <div className="aspect-video bg-gray-100 relative">
                  {p.images && p.images.length > 0 ? (
                    <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">No image</div>
                  )}
                  {p.isAvailable === false && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <span className="bg-[#4F4A41] text-white px-4 py-2 rounded-null font-semibold">Out of Stock</span>
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <p className="font-bold text-[#3d1a7a]">{p.name}</p>
                  {typeof p.price === 'number' && (
                    <p className="text-[#5d2ba3] font-semibold mt-1">
                      {p.currency || 'KES'} {p.price.toLocaleString()}
                    </p>
                  )}
                  {p.isAvailable === false && p.availabilityNote && (
                    <p className="text-sm text-[#4F4A41] mt-1 italic">{p.availabilityNote}</p>
                  )}
                  {p.description && (
                    <p className="text-sm text-gray-600 mt-2 line-clamp-2">{p.description}</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default StoreFrontPage;