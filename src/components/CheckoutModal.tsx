import { useState } from 'react';
import { X, CreditCard, Smartphone, Wallet } from 'lucide-react';
import { api } from '@/services/api';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: {
    id: string;
    name: string;
    description?: string;
    price?: number;
    images?: string[];
  };
  storeSlug: string;
  onSuccess: (transactionId: string) => void;
}

export function CheckoutModal({ isOpen, onClose, product, storeSlug, onSuccess }: CheckoutModalProps) {
  const [step, setStep] = useState<'details' | 'payment' | 'processing'>('details');
  const [paymentMethod, setPaymentMethod] = useState<'MPESA' | 'MOBILE_MONEY' | 'CARD'>('MPESA');
  const [buyerDetails, setBuyerDetails] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [transactionId, setTransactionId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCreateTransaction = async () => {
    if (!buyerDetails.name || !buyerDetails.phone) {
      setError('Please fill in your name and phone number');
      return;
    }

    if (!product.price) {
      setError('Product price is not available');
      return;
    }

    setError(null);
    setStep('processing');

    try {
      const response = await api.request<{ transactionId?: string; id?: string }>(
        `/api/v1/storefront/${storeSlug}/products/${product.id}/checkout`,
        {
          method: 'POST',
          body: {
            buyerName: buyerDetails.name,
            buyerPhone: buyerDetails.phone,
            buyerEmail: buyerDetails.email || undefined,
            buyerAddress: buyerDetails.address || undefined,
            paymentMethod,
          },
          requireAuth: false,
        }
      );

      if (response.success && response.data) {
        const txId = (response.data as any).transactionId ?? (response.data as any).id;
        if (txId) {
          setTransactionId(txId);
          setStep('payment');
          onSuccess(txId);
        } else {
          throw new Error(response.error || 'Failed to create checkout');
        }
      } else {
        throw new Error(response.error || 'Failed to create checkout');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create checkout');
      setStep('details');
    }
  };

  const handleInitiatePayment = async () => {
    if (!transactionId) return;

    setError(null);
    setStep('processing');

    try {
      // Use Paystack for payment
      const response = await api.initiatePaystackPayment({
        transactionId,
        email: buyerDetails.email || `${buyerDetails.phone.replace(/\D/g, '')}@placeholder.com`,
        metadata: {
          buyerName: buyerDetails.name,
          buyerPhone: buyerDetails.phone,
          paymentMethod,
        },
      });

      if (response.success && response.data) {
        const data = response.data as { authorizationUrl: string };
        // Redirect to Paystack checkout
        window.location.href = data.authorizationUrl;
      } else {
        throw new Error(response.error || 'Failed to initiate payment');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initiate payment');
      setStep('payment');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-null max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex justify-between items-center">
          <h2 className="text-xl font-bold">Checkout</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Product Summary */}
          <div className="border border-gray-200 rounded-null p-4">
            <div className="flex gap-4">
              {product.images && product.images.length > 0 && (
                <img src={product.images[0]} alt={product.name} className="w-20 h-20 object-cover rounded-null" />
              )}
              <div className="flex-1">
                <h3 className="font-semibold">{product.name}</h3>
                {product.price && (
                  <p className="text-lg font-bold text-[#3d1a7a] mt-1">KES {product.price.toLocaleString()}</p>
                )}
              </div>
            </div>
          </div>

          {step === 'details' && (
            <>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    value={buyerDetails.name}
                    onChange={(e) => setBuyerDetails(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-null focus:outline-none focus:border-blue-500"
                    placeholder="Enter your name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number *</label>
                  <input
                    type="tel"
                    value={buyerDetails.phone}
                    onChange={(e) => setBuyerDetails(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-null focus:outline-none focus:border-blue-500"
                    placeholder="+1234567890"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email (optional)</label>
                  <input
                    type="email"
                    value={buyerDetails.email}
                    onChange={(e) => setBuyerDetails(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-null focus:outline-none focus:border-blue-500"
                    placeholder="your@email.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Address (optional)</label>
                  <textarea
                    value={buyerDetails.address}
                    onChange={(e) => setBuyerDetails(prev => ({ ...prev, address: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-null focus:outline-none focus:border-blue-500"
                    rows={3}
                    placeholder="Enter delivery address"
                  />
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-null text-sm">
                  {error}
                </div>
              )}

              <button
                onClick={handleCreateTransaction}
                className="w-full bg-[#3d1a7a] text-white py-3 rounded-null font-semibold hover:bg-[#250e52] transition"
              >
                Continue to Payment
              </button>
            </>
          )}

          {step === 'payment' && (
            <>
              <div className="space-y-3">
                <h3 className="font-semibold">Select Payment Method</h3>
                <button
                  onClick={() => setPaymentMethod('MPESA')}
                  className={`w-full p-4 border-2 rounded-null flex items-center gap-3 transition ${
                    paymentMethod === 'MPESA' ? 'border-[#3d1a7a] bg-[#3d1a7a]/10' : 'border-gray-200'
                  }`}
                >
                  <Smartphone className="text-[#3d1a7a]" size={24} />
                  <div className="flex-1 text-left">
                    <p className="font-semibold">M-Pesa</p>
                    <p className="text-sm text-gray-600">Pay via M-Pesa STK Push</p>
                  </div>
                </button>
                <button
                  onClick={() => setPaymentMethod('MOBILE_MONEY')}
                  className={`w-full p-4 border-2 rounded-null flex items-center gap-3 transition ${
                    paymentMethod === 'MOBILE_MONEY' ? 'border-[#3d1a7a] bg-[#3d1a7a]/10' : 'border-gray-200'
                  }`}
                >
                  <Wallet className="text-[#3d1a7a]" size={24} />
                  <div className="flex-1 text-left">
                    <p className="font-semibold">Mobile Money</p>
                    <p className="text-sm text-gray-600">Other mobile money providers</p>
                  </div>
                </button>
                <button
                  onClick={() => setPaymentMethod('CARD')}
                  className={`w-full p-4 border-2 rounded-null flex items-center gap-3 transition ${
                    paymentMethod === 'CARD' ? 'border-[#3d1a7a] bg-[#3d1a7a]/10' : 'border-gray-200'
                  }`}
                >
                  <CreditCard className="text-[#3d1a7a]" size={24} />
                  <div className="flex-1 text-left">
                    <p className="font-semibold">Card Payment</p>
                    <p className="text-sm text-gray-600">Credit or debit card</p>
                  </div>
                </button>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-null text-sm">
                  {error}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setStep('details')}
                  className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-null font-semibold hover:bg-gray-300 transition"
                >
                  Back
                </button>
                <button
                  onClick={handleInitiatePayment}
                  className="flex-1 bg-[#3d1a7a] text-white py-3 rounded-null font-semibold hover:bg-[#250e52] transition"
                >
                  Pay Now
                </button>
              </div>
            </>
          )}

          {step === 'processing' && (
            <div className="text-center py-8">
              <div className="w-12 h-12 border-4 border-[#3d1a7a] border-t-transparent rounded-null-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Processing...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

