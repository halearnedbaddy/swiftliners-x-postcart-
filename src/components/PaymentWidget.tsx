import { useState } from 'react';
import { Smartphone, CreditCard, Loader, ExternalLink, ShieldCheck, Clock, CheckCircle } from 'lucide-react';
import { usePaystackPayment } from 'react-paystack';
import { api } from '@/services/api';

interface PaymentWidgetProps {
  transactionId: string;
  linkId?: string;
  amount: number;
  buyerName?: string;
  buyerCurrency?: string;
  onPaymentSuccess?: () => void;
}

type PaymentMethod = 'mpesa' | 'card' | 'all';

export function PaymentWidget({ transactionId, linkId, amount, buyerCurrency = 'KES', onPaymentSuccess }: PaymentWidgetProps) {
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setPhoneAddress] = useState({ building: '', street: '', city: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'redirecting' | 'processing_stk' | 'success' | 'failed'>('idle');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('all');

  const isLink = !!linkId;

  // Paystack Config
  const config = {
    reference: (new Date()).getTime().toString(),
    email: email,
    amount: amount * 100, // Paystack is in kobo
    publicKey: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || '',
    currency: buyerCurrency,
    metadata: {
      custom_fields: [
        {
          display_name: "Transaction ID",
          variable_name: "transaction_id",
          value: transactionId
        },
        {
          display_name: "Link ID",
          variable_name: "link_id",
          value: linkId || ""
        }
      ]
    }
  };

  const onSuccess = (reference: any) => {
    setPaymentStatus('processing_stk');
    setIsLoading(true);
    
    // If it's a link, we need to create the order first/during verification
    if (isLink) {
      // For links, we'll use a specialized verification that creates the order
      api.request(`/api/v1/links/${linkId}/purchase`, {
        method: 'POST',
        body: {
          buyerPhone: phone,
          buyerEmail: email,
          deliveryAddress: address,
          paymentMethod: 'PAYSTACK',
          paymentReference: reference.reference,
          buyerCurrency,
          quantity: 1
        },
        requireAuth: false
      }).then((res: any) => {
        if (res.success) {
          setPaymentStatus('success');
          if (onPaymentSuccess) onPaymentSuccess();
        } else {
          setError(res.error || 'Payment verification failed');
          setPaymentStatus('failed');
        }
      }).catch((err) => {
        console.error(err);
        setError('Payment verification failed');
        setPaymentStatus('failed');
      }).finally(() => setIsLoading(false));
    } else {
      // Standard transaction verification
      api.verifyPaystackPayment(transactionId, reference.reference)
        .then((res) => {
          if (res.success) {
            setPaymentStatus('success');
            if (onPaymentSuccess) onPaymentSuccess();
          } else {
            setError(res.error || 'Payment verification failed');
            setPaymentStatus('failed');
          }
        })
        .catch((err) => {
          console.error(err);
          setError('Payment verification failed');
          setPaymentStatus('failed');
        })
        .finally(() => setIsLoading(false));
    }
  };

  const onClose = () => {
    setIsLoading(false);
    console.log('Payment closed');
  };

  const PaystackHookExample = () => {
    const initializePayment = usePaystackPayment(config);
    return (
      <button
        type="button"
        disabled={isLoading || !email || (isLink && !phone)}
        onClick={() => {
          if (!email) {
            setError("Email is required");
            return;
          }
          if (isLink && !phone) {
            setError("Phone number is required");
            return;
          }
          setIsLoading(true);
          // @ts-ignore
          initializePayment(onSuccess, onClose)
        }}
        className="w-full bg-primary hover:bg-primary/90 disabled:bg-muted text-primary-foreground font-bold py-3 rounded-null transition flex items-center justify-center gap-2"
      >
        {isLoading ? (
          <>
            <Loader size={20} className="animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <ExternalLink size={20} />
            {isLink ? `Pay KES ${amount.toLocaleString()}` : 'Pay with Paystack'}
          </>
        )}
      </button>
    );
  };


  return (
    <div className="bg-card rounded-null p-6 border border-border">
      {paymentStatus !== 'success' && (
        <h3 className="font-bold text-lg text-foreground mb-4">
          {isLink ? 'Complete Your Purchase' : 'Choose Payment Method'}
        </h3>
      )}

      {paymentStatus === 'idle' && (
        <>
          {/* Link-specific fields */}
          {isLink && (
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+254 7XX XXX XXX"
                  required
                  className="w-full px-4 py-2 border border-input rounded-null bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              
              <div className="grid grid-cols-1 gap-3">
                <label className="block text-sm font-medium text-foreground">
                  Delivery Address *
                </label>
                <input
                  type="text"
                  value={address.building}
                  onChange={(e) => setPhoneAddress({ ...address, building: e.target.value })}
                  placeholder="Building/House No."
                  className="w-full px-4 py-2 border border-input rounded-null bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
                />
                <input
                  type="text"
                  value={address.street}
                  onChange={(e) => setPhoneAddress({ ...address, street: e.target.value })}
                  placeholder="Street/Estate Name"
                  className="w-full px-4 py-2 border border-input rounded-null bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
                />
                <input
                  type="text"
                  value={address.city}
                  onChange={(e) => setPhoneAddress({ ...address, city: e.target.value })}
                  placeholder="City/Town"
                  className="w-full px-4 py-2 border border-input rounded-null bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
            </div>
          )}

          {/* Payment Method Selector */}
          {!isLink && (
            <div className="flex gap-2 mb-4">
              <button
                type="button"
                onClick={() => setPaymentMethod('all')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-null border transition ${paymentMethod === 'all'
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background text-foreground border-border hover:border-primary/50'
                  }`}
              >
                <ExternalLink size={18} />
                <span className="text-sm font-medium">All Options</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('mpesa')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-null border transition ${paymentMethod === 'mpesa'
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background text-foreground border-border hover:border-primary/50'
                  }`}
              >
                <Smartphone size={18} />
                <span className="text-sm font-medium">M-Pesa</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('card')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-null border transition ${paymentMethod === 'card'
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background text-foreground border-border hover:border-primary/50'
                  }`}
              >
                <CreditCard size={18} />
                <span className="text-sm font-medium">Card</span>
              </button>
            </div>
          )}

          <div className="space-y-4">
            {/* Email - Required for Paystack */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Email Address {isLink && '*'}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                className="w-full px-4 py-2 border border-input rounded-null bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
              />
              <p className="text-xs text-muted-foreground mt-1">Receipt will be sent to this email</p>
            </div>

            {/* Amount Display */}
            <div className="bg-muted p-3 rounded-null">
              <p className="text-sm text-muted-foreground">Amount:</p>
              <p className="text-2xl font-bold text-foreground">KES {amount.toLocaleString()}</p>
            </div>

            {/* Payment Method Info */}
            <div className="bg-muted/50 p-3 rounded-null text-sm text-muted-foreground">
              {paymentMethod === 'all' && (
                <p>Card, M-Pesa, Bank Transfer supported by Paystack.</p>
              )}
              {paymentMethod === 'mpesa' && (
                <p>Select M-Pesa option in the popup window.</p>
              )}
              {paymentMethod === 'card' && (
                <p>Select Card option in the popup window.</p>
              )}
            </div>

            {error && (
              <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-null">
                {error}
              </div>
            )}

            <PaystackHookExample />

            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck size={14} className="text-primary" />
              <span>Secure payment powered by Paystack</span>
            </div>
          </div>
        </>
      )}

      {paymentStatus === 'processing_stk' && (
        <div className="py-12 text-center space-y-6 animate-in fade-in duration-500">
          <div className="relative w-24 h-24 mx-auto">
            <div className="absolute inset-0 border-4 border-primary/20 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            <Smartphone className="absolute inset-0 m-auto text-primary w-10 h-10" />
          </div>
          
          <div className="space-y-2">
            <h3 className="text-xl font-black text-gray-900">Processing Payment...</h3>
            <p className="text-sm text-gray-500 px-8">
              M-Pesa STK Push sent to <span className="font-bold text-gray-900">{phone || 'your phone'}</span>
            </p>
          </div>

          <div className="bg-gray-50 rounded-2xl p-6 text-left max-w-xs mx-auto space-y-4 border border-gray-100">
            <p className="text-xs font-black uppercase tracking-widest text-gray-400">Please follow these steps:</p>
            <ol className="space-y-3">
              {[
                'Check your phone for the prompt',
                'Enter your M-Pesa PIN',
                'Confirm the payment'
              ].map((step, i) => (
                <li key={i} className="flex gap-3 text-sm font-bold text-gray-700">
                  <span className="text-primary">{i + 1}.</span>
                  {step}
                </li>
              ))}
            </ol>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-center gap-2 text-primary font-bold animate-pulse">
              <Clock size={16} />
              <span className="text-sm">Waiting for confirmation...</span>
            </div>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">💡 Tip: Don't close this page</p>
          </div>

          <button 
            onClick={() => setPaymentStatus('idle')}
            className="text-xs font-bold text-gray-400 uppercase tracking-widest hover:text-red-500 transition"
          >
            Cancel Payment
          </button>
        </div>
      )}

      {paymentStatus === 'success' && (
        <div className="bg-white border border-emerald-100 p-8 rounded-2xl text-center animate-in zoom-in duration-300">
          <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={40} className="text-emerald-500" />
          </div>
          <h3 className="text-2xl font-black text-gray-900 mb-2">Payment Successful!</h3>
          <p className="text-gray-500 mb-6">Your order has been placed successfully.</p>
          
          <div className="bg-gray-50 rounded-xl p-4 mb-8 text-left space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Order ID:</span>
              <span className="font-bold text-gray-900">#{transactionId || 'LINK-PURCHASE'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Amount Paid:</span>
              <span className="font-bold text-gray-900">KES {amount.toLocaleString()}</span>
            </div>
          </div>

          <div className="text-left space-y-4 mb-8">
            <h4 className="font-bold text-gray-900 text-sm uppercase tracking-widest">📦 What Happens Next?</h4>
            <ul className="space-y-3">
              {[
                'Seller will be notified immediately',
                'Seller will ship your order',
                'You\'ll receive tracking updates via SMS',
                'Confirm delivery when received',
                'Seller gets paid after your confirmation'
              ].map((step, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-gray-600">
                  <span className="w-5 h-5 bg-primary/10 text-primary text-[10px] font-bold rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 mb-8 flex items-start gap-3 text-left">
            <ShieldCheck className="text-emerald-600 flex-shrink-0" size={20} />
            <div>
              <p className="text-sm font-bold text-emerald-900">Your Payment is Protected</p>
              <p className="text-xs text-emerald-700">Your money is held securely by PayLoom until you confirm delivery.</p>
            </div>
          </div>

          <button 
            onClick={() => window.location.href = '/'}
            className="w-full py-4 bg-gray-900 text-white rounded-xl font-bold hover:bg-gray-800 transition"
          >
            Back to Home
          </button>
        </div>
      )}

      {paymentStatus === 'failed' && (
        <div className="bg-destructive/10 border border-destructive/20 p-6 rounded-null text-center">
          <div className="text-4xl mb-2">❌</div>
          <p className="text-destructive font-bold">Payment Failed</p>
          {error && <p className="text-sm text-destructive/80 mt-1">{error}</p>}
          <button
            onClick={() => {
              setPaymentStatus('idle');
              setError(null);
            }}
            className="mt-4 bg-destructive hover:bg-destructive/90 text-destructive-foreground font-bold py-2 px-4 rounded-null"
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  );
}
