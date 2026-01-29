import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

/**
 * Fallback for Paystack callback when redirect lands on /payment/callback.
 * Redirects customer to the product page (/buy/:linkId) with success params
 * so they see order success and can use OTP login flow.
 */
export function PaymentCallbackPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const reference = searchParams.get('reference');

  useEffect(() => {
    const linkId = sessionStorage.getItem('pendingPaymentLinkId');
    if (reference && linkId) {
      navigate(`/buy/${linkId}?payment=success&reference=${reference}`, { replace: true });
      return;
    }
    if (reference) {
      // No linkId: e.g. top-up or old flow – go to buyer dashboard
      navigate(`/buyer?payment=success&reference=${reference}`, { replace: true });
      return;
    }
    navigate('/', { replace: true });
  }, [navigate, reference]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
        <p className="mt-4 text-muted-foreground">Completing your payment...</p>
      </div>
    </div>
  );
}
