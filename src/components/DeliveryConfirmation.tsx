import { useState } from 'react';
import { CheckCircle, Loader } from 'lucide-react';
import { api } from '@/services/api';

interface DeliveryConfirmationProps {
  transactionId: string;
  amount: number;
  sellerName: string;
  onSuccess?: () => void;
}

export function DeliveryConfirmation({ transactionId, amount, sellerName, onSuccess }: DeliveryConfirmationProps) {
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleConfirmDelivery = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await api.request('/api/v1/payments/confirm-delivery', {
        method: 'POST',
        body: {
          transactionId,
          deliveryOTP: otp,
        },
      });

      if (response.success) {
        setSuccess(true);
        onSuccess?.();
      } else {
        setError(response.error || 'Failed to confirm delivery');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-null-lg p-6 text-center">
        <CheckCircle className="text-green-600 mx-auto mb-3" size={40} />
        <h3 className="font-bold text-lg text-green-700 mb-1">Delivery Confirmed!</h3>
        <p className="text-sm text-green-600">KES {amount.toLocaleString()} released to {sellerName}'s M-Pesa</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-null-lg p-6 border border-gray-200">
      <h3 className="font-bold text-lg mb-4">Confirm Delivery</h3>
      <p className="text-sm text-gray-600 mb-4">
        Enter the OTP provided by {sellerName} to confirm receipt and release payment.
      </p>

      <form onSubmit={handleConfirmDelivery} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Delivery OTP
          </label>
          <input
            type="text"
            value={otp}
            onChange={(e) => setOtp(e.target.value.slice(0, 6))}
            placeholder="000000"
            maxLength={6}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-null-lg focus:ring-2 focus:ring-[#3d1a7a] text-center text-2xl font-bold tracking-widest"
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-null text-sm">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading || otp.length !== 6}
          className="w-full bg-[#3d1a7a] hover:bg-[#250e52] disabled:bg-gray-400 text-white font-bold py-3 rounded-null-lg transition flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <Loader size={20} className="animate-spin" />
              Confirming...
            </>
          ) : (
            'Confirm Delivery'
          )}
        </button>
      </form>
    </div>
  );
}
