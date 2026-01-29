import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '@/services/api';
import { CheckoutModal } from '@/components/CheckoutModal';

interface ProductData {
  id: string;
  name: string;
  description?: string;
  price?: number;
  images?: string[];
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
}

export function ProductDetailPage() {
  const { storeSlug, productId } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState<ProductData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function load() {
      if (!storeSlug || !productId) return;
      setLoading(true);
      const res = await api.getPublicProduct(storeSlug, productId);
      if (!mounted) return;
      if (res.success && res.data) {
        setProduct(res.data as unknown as ProductData);
        setError(null);
      } else {
        setError(res.error || 'Product not found');
      }
      setLoading(false);
    }
    load();
    return () => { mounted = false; };
  }, [storeSlug, productId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading product...</div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white border border-gray-200 rounded-null-xl p-6 text-center">
          <p className="font-bold text-gray-800 mb-2">Product unavailable</p>
          <p className="text-sm text-gray-600">{error || 'The product could not be found.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <button onClick={() => navigate(-1)} className="text-sm text-gray-600 hover:text-gray-900">← Back</button>
          <h1 className="text-2xl font-bold text-[#3d1a7a] mt-2">{product.name}</h1>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white border border-gray-200 rounded-null-xl overflow-hidden">
          <div className="aspect-video bg-gray-100">
            {product.images && product.images.length > 0 ? (
              <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">No image</div>
            )}
          </div>
        </div>
        <div>
          {typeof product.price === 'number' && (
            <p className="text-2xl font-bold text-[#5d2ba3]">
              {(product as any).currency || 'KES'} {product.price.toLocaleString()}
            </p>
          )}
          {(product as any).isAvailable === false && (
            <div className="mt-4 bg-[#4F4A41]/10 border border-[#4F4A41]/30 rounded-null-lg p-4">
              <p className="text-[#4F4A41] font-semibold mb-1">⚠️ Currently Unavailable</p>
              {(product as any).availabilityNote && (
                <p className="text-sm text-[#4F4A41]">{(product as any).availabilityNote}</p>
              )}
            </div>
          )}
          {product.description && (
            <p className="mt-4 text-gray-700 whitespace-pre-line">{product.description}</p>
          )}
          <div className="mt-8 space-y-4">
            {(product as any).isAvailable === false ? (
              <div className="bg-gray-50 border border-gray-200 rounded-null-lg p-4 text-center">
                <p className="text-gray-800 font-semibold mb-1">Product Unavailable</p>
                <p className="text-sm text-gray-600">This product is currently out of stock.</p>
              </div>
            ) : product.price ? (
              <>
                <button
                  className="w-full px-4 py-3 rounded-null-lg bg-[#5d2ba3] text-white font-semibold hover:bg-[#3d1a7a] transition"
                  onClick={() => setCheckoutOpen(true)}
                >
                  Buy Now - {(product as any).currency || 'KES'} {product.price.toLocaleString()}
                </button>
                <p className="text-sm text-gray-600 text-center">
                  Secure checkout • No account required
                </p>
              </>
            ) : (
              <div className="bg-[#6E6658]/10 border border-[#6E6658]/30 rounded-null-lg p-4 text-center">
                <p className="text-[#6E6658] text-sm">Price not available. Please contact the seller.</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {product && storeSlug && (
        <CheckoutModal
          isOpen={checkoutOpen}
          onClose={() => setCheckoutOpen(false)}
          product={product}
          storeSlug={storeSlug}
          onSuccess={(transactionId) => {
            setCheckoutOpen(false);
            navigate(`/pay/${transactionId}`);
          }}
        />
      )}
    </div>
  );
}

export default ProductDetailPage;