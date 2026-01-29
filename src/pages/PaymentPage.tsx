import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, ShieldCheck, Star, Phone, MapPin, CheckCircle, Package, AlertCircle, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/services/api";
import { useSupabaseAuth } from "@/contexts/SupabaseAuthContext";

interface PaymentLinkData {
  id: string;
  productName: string;
  productDescription?: string | null;
  price: number | string;
  currency: string;
  images: string[];
  status: string;
  seller: {
    name: string;
    sellerProfile?: {
      isVerified: boolean;
      rating: number;
      totalReviews: number;
    };
  };
}

type Step = 'otp' | 'verify' | 'checkout' | 'success';

const PaymentPage = () => {
  const { linkId, transactionId } = useParams<{ linkId?: string; transactionId?: string }>();
  const { toast } = useToast();
  const { requestOTP, login, isAuthenticated, user } = useSupabaseAuth();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentLink, setPaymentLink] = useState<PaymentLinkData | null>(null);
  const [processing, setProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [currentStep, setCurrentStep] = useState<Step>('otp');
  
  // OTP state
  const [phone, setPhone] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  
  // Form state (after OTP verification)
  const [buyerName, setBuyerName] = useState("");
  const [buyerEmail, setBuyerEmail] = useState("");
  const [buyerAddress, setBuyerAddress] = useState("");

  useEffect(() => {
    // Check for Paystack callback
    const urlParams = new URLSearchParams(window.location.search);
    const paymentStatus = urlParams.get('payment');
    const reference = urlParams.get('reference');
    
    if (paymentStatus === 'success' && reference) {
      // Handle successful payment callback
      handlePaymentCallback(reference);
      return;
    }

    if (linkId) {
      fetchPaymentLink();
    } else if (transactionId) {
      // Legacy transaction support - redirect to new flow or handle differently
      setError("Please use the payment link URL provided by the seller");
      setLoading(false);
    } else {
      setError("Invalid payment link");
      setLoading(false);
    }
  }, [linkId, transactionId]);

  const handlePaymentCallback = async (reference: string) => {
    try {
      setLoading(true);
      // Get transaction ID from sessionStorage
      const storedTransactionId = sessionStorage.getItem('pendingTransaction');
      
      if (!storedTransactionId) {
        setError("Transaction not found. Please contact support.");
        return;
      }

      // Verify payment with backend
      const verifyResponse = await api.verifyPaystackPayment(storedTransactionId, reference);
      
      if (verifyResponse.success) {
        setPaymentSuccess(true);
        sessionStorage.removeItem('pendingTransaction');
        sessionStorage.removeItem('pendingPaymentLinkId');
        toast({
          title: "Payment Successful!",
          description: "Your order has been confirmed. The seller will be notified.",
        });
        // Clean up URL
        window.history.replaceState({}, '', window.location.pathname);
      } else {
        setError(verifyResponse.error || "Payment verification failed");
      }
    } catch (err: any) {
      setError(err.message || "Failed to verify payment");
    } finally {
      setLoading(false);
    }
  };

  // Auto-advance to checkout if already authenticated
  useEffect(() => {
    if (isAuthenticated && user && paymentLink && currentStep === 'otp') {
      setPhone(user.phone || "");
      setCurrentStep('checkout');
    }
  }, [isAuthenticated, user, paymentLink]);

  const fetchPaymentLink = async () => {
    if (!linkId) return;
    
    try {
      setLoading(true);
      setError(null);

      const response = await api.getPaymentLink(linkId);

      if (!response.success || !response.data) {
        setError(response.error || "Payment link not found");
        return;
      }

      const linkData = response.data as any;
      setPaymentLink({
        id: linkData.id,
        productName: linkData.productName,
        productDescription: linkData.productDescription,
        price: linkData.price,
        currency: linkData.currency || 'KES',
        images: linkData.images || [],
        status: linkData.status,
        seller: {
          name: linkData.seller?.name || 'Seller',
          sellerProfile: linkData.seller?.sellerProfile
        }
      });
    } catch (err) {
      console.error("Error fetching payment link:", err);
      setError("Failed to load payment link. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!phone.trim()) {
      toast({
        title: "Phone Required",
        description: "Please enter your phone number",
        variant: "destructive",
      });
      return;
    }

    // Normalize phone number
    let normalizedPhone = phone.trim();
    if (!normalizedPhone.startsWith('+')) {
      if (normalizedPhone.startsWith('0')) {
        normalizedPhone = '+254' + normalizedPhone.substring(1);
      } else if (normalizedPhone.startsWith('254')) {
        normalizedPhone = '+' + normalizedPhone;
      } else {
        normalizedPhone = '+254' + normalizedPhone;
      }
    }

    setSendingOtp(true);
    try {
      const result = await requestOTP(normalizedPhone, 'LOGIN');
      if (result.success) {
        setCurrentStep('verify');
        setPhone(normalizedPhone);
        toast({
          title: "OTP Sent!",
          description: result.otp ? `Development OTP: ${result.otp}` : "Check your phone for the verification code",
        });
      } else {
        setError(result.error || "Failed to send OTP");
      }
    } catch (err: any) {
      setError(err.message || "Failed to send OTP");
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!otpCode || otpCode.length !== 6) {
      toast({
        title: "Invalid OTP",
        description: "Please enter the 6-digit OTP code",
        variant: "destructive",
      });
      return;
    }

    setVerifyingOtp(true);
    try {
      const result = await login(phone, otpCode);
      if (result.success) {
        setCurrentStep('checkout');
        toast({
          title: "Verified!",
          description: "You can now complete your purchase",
        });
      } else {
        setError(result.error || "Invalid OTP code");
      }
    } catch (err: any) {
      setError(err.message || "Failed to verify OTP");
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!linkId || !paymentLink) return;
    
    if (!buyerName.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide your name.",
        variant: "destructive",
      });
      return;
    }

    if (!isAuthenticated) {
      toast({
        title: "Authentication Required",
        description: "Please verify your phone number first",
        variant: "destructive",
      });
      return;
    }

    try {
      setProcessing(true);

      // Step 1: Create order/transaction first (without payment reference)
      const purchaseResponse = await api.request(`/api/v1/links/${linkId}/purchase`, {
        method: 'POST',
        body: {
          buyerPhone: phone,
          buyerEmail: buyerEmail || undefined,
          deliveryAddress: buyerAddress || undefined,
          paymentMethod: 'PAYSTACK',
          buyerCurrency: paymentLink.currency,
          quantity: 1,
          buyerName: buyerName || user?.name || 'Buyer'
        },
        requireAuth: false
      });

      if (!purchaseResponse.success || !purchaseResponse.data) {
        throw new Error(purchaseResponse.error || "Failed to create order");
      }

      const transactionId = (purchaseResponse.data as any)?.id;
      if (!transactionId) {
        throw new Error("Transaction ID not found in response");
      }

      // Step 2: Initialize Paystack payment with the created transaction
      const initResponse = await api.initiatePaystackPayment({
        transactionId: transactionId,
        email: buyerEmail || user?.email || `${phone.replace('+', '')}@payloom.temp`,
        metadata: {
          linkId,
          buyerName,
          buyerPhone: phone,
          buyerAddress,
        }
      });

      if (!initResponse.success || !initResponse.data) {
        throw new Error(initResponse.error || "Failed to initialize payment");
      }

      // Step 3: Redirect to Paystack payment page
      const authUrl = (initResponse.data as any)?.authorization_url;
      if (authUrl) {
        // Store for callback: customer is redirected back to this product page to complete/see success
        sessionStorage.setItem('pendingTransaction', transactionId);
        if (linkId) sessionStorage.setItem('pendingPaymentLinkId', linkId);
        window.location.href = authUrl;
        return;
      }

      // If no redirect URL, show success (shouldn't happen normally)
      setPaymentSuccess(true);
      toast({
        title: "Order Created!",
        description: "Please complete payment to secure your order.",
      });
    } catch (err: any) {
      console.error("Payment error:", err);
      toast({
        title: "Payment Failed",
        description: err.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const formatCurrency = (amount: number, currency: string = "KES") => {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="mt-4 text-muted-foreground">Loading payment details...</p>
        </div>
      </div>
    );
  }

  if (error || (!paymentLink && !loading)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8 pb-6">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
            <h2 className="mb-2 text-xl font-semibold">Link Unavailable</h2>
            <p className="mb-6 text-muted-foreground">
              {error || "This payment link may have expired, been sold out, or is invalid."}
            </p>
            <Button asChild className="w-full">
              <Link to="/">Visit Home</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show product preview during OTP flow
  const showProductPreview = paymentLink && (currentStep === 'otp' || currentStep === 'verify');

  if (paymentSuccess) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8 pb-6">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <CheckCircle className="h-8 w-8 text-primary" />
            </div>
            <h2 className="mb-2 text-xl font-semibold">Order Placed!</h2>
            <p className="mb-2 text-muted-foreground">
              Your order for <span className="font-medium text-foreground">{paymentLink?.productName}</span> has been placed.
            </p>
            <p className="mb-6 text-sm text-muted-foreground">
              Complete payment to secure your order
            </p>
            <div className="space-y-3">
              <div className="rounded-lg bg-muted p-4 text-left">
                <div className="flex items-center gap-2 text-sm">
                  <Package className="h-4 w-4" />
                  <span>The seller will ship your item once payment is confirmed</span>
                </div>
              </div>
              <Button asChild variant="outline" className="w-full">
                <Link to="/buyer">View My Orders</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check if link is still available
  if (paymentLink && paymentLink.status !== 'ACTIVE') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8 pb-6">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-accent">
              <Package className="h-8 w-8 text-accent-foreground" />
            </div>
            <h2 className="mb-2 text-xl font-semibold">Item Unavailable</h2>
            <p className="mb-6 text-muted-foreground">
              This item is {paymentLink.status.toLowerCase().replace('_', ' ')} or no longer available.
            </p>
            <Button asChild className="w-full">
              <Link to="/">Browse More Items</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!paymentLink) return null;

  const price = typeof paymentLink.price === 'string' ? parseFloat(paymentLink.price) : paymentLink.price;
  const sellerRating = paymentLink.seller.sellerProfile?.rating || 0;
  const sellerReviews = paymentLink.seller.sellerProfile?.totalReviews || 0;
  const isVerified = paymentLink.seller.sellerProfile?.isVerified || false;

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="mx-auto max-w-lg">
        {/* Product Preview Card - Shown during OTP flow */}
        {showProductPreview && (
          <Card className="mb-6">
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{paymentLink.productName}</CardTitle>
                  {isVerified && (
                    <div className="mt-1 flex items-center gap-1 text-sm text-primary">
                      <ShieldCheck className="h-4 w-4" />
                      <span>Verified Seller</span>
                    </div>
                  )}
                </div>
                <Badge variant="secondary" className="text-lg font-semibold">
                  {formatCurrency(price, paymentLink.currency)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {/* Product Image */}
              {paymentLink.images && paymentLink.images.length > 0 && (
                <div className="mb-4 overflow-hidden rounded-lg">
                  <img
                    src={paymentLink.images[0]}
                    alt={paymentLink.productName}
                    className="h-48 w-full object-cover"
                  />
                </div>
              )}

              {/* Description */}
              {paymentLink.productDescription && (
                <p className="mb-4 text-sm text-muted-foreground">
                  {paymentLink.productDescription}
                </p>
              )}

              {/* Seller Info */}
              <div className="flex items-center gap-3 rounded-lg bg-muted p-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
                  {paymentLink.seller.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="font-medium">{paymentLink.seller.name}</p>
                  {sellerRating > 0 && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Star className="h-3 w-3 fill-primary text-primary" />
                      <span>{sellerRating.toFixed(1)}</span>
                      <span>({sellerReviews} reviews)</span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* OTP Login Step */}
        {currentStep === 'otp' && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-primary" />
                <CardTitle>Verify Your Phone</CardTitle>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Enter your phone number to receive a one-time verification code
              </p>
            </CardHeader>
            <CardContent>
              {error && (
                <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
                  {error}
                </div>
              )}
              <form onSubmit={handleSendOTP} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="phone-input">Phone Number *</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="phone-input"
                      type="tel"
                      placeholder="0712345678 or +254712345678"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="pl-10"
                      required
                      disabled={sendingOtp}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    We'll send a 6-digit code to verify your number
                  </p>
                </div>
                <Button type="submit" className="w-full" size="lg" disabled={sendingOtp}>
                  {sendingOtp ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending OTP...
                    </>
                  ) : (
                    <>
                      Send Verification Code
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* OTP Verification Step */}
        {currentStep === 'verify' && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-primary" />
                <CardTitle>Enter Verification Code</CardTitle>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                We sent a 6-digit code to {phone}
              </p>
            </CardHeader>
            <CardContent>
              {error && (
                <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
                  {error}
                </div>
              )}
              <form onSubmit={handleVerifyOTP} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="otp-input">Verification Code *</Label>
                  <Input
                    id="otp-input"
                    type="text"
                    placeholder="000000"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="text-center text-2xl tracking-widest font-mono"
                    maxLength={6}
                    required
                    disabled={verifyingOtp}
                    autoFocus
                  />
                  <p className="text-xs text-muted-foreground text-center">
                    Enter the 6-digit code sent to your phone
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setCurrentStep('otp');
                      setOtpCode('');
                    }}
                  >
                    Change Number
                  </Button>
                  <Button type="submit" className="flex-1" size="lg" disabled={verifyingOtp || otpCode.length !== 6}>
                    {verifyingOtp ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      'Verify & Continue'
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Checkout Step */}
        {currentStep === 'checkout' && (
          <>
            {/* Product Card */}
            <Card className="mb-6">
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{paymentLink.productName}</CardTitle>
                    {isVerified && (
                      <div className="mt-1 flex items-center gap-1 text-sm text-primary">
                        <ShieldCheck className="h-4 w-4" />
                        <span>Verified Seller</span>
                      </div>
                    )}
                  </div>
                  <Badge variant="secondary" className="text-lg font-semibold">
                    {formatCurrency(price, paymentLink.currency)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {/* Product Image */}
                {paymentLink.images && paymentLink.images.length > 0 && (
                  <div className="mb-4 overflow-hidden rounded-lg">
                    <img
                      src={paymentLink.images[0]}
                      alt={paymentLink.productName}
                      className="h-48 w-full object-cover"
                    />
                  </div>
                )}

                {/* Description */}
                {paymentLink.productDescription && (
                  <p className="mb-4 text-sm text-muted-foreground">
                    {paymentLink.productDescription}
                  </p>
                )}

                {/* Seller Info */}
                <div className="flex items-center gap-3 rounded-lg bg-muted p-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
                    {paymentLink.seller.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{paymentLink.seller.name}</p>
                    {sellerRating > 0 && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Star className="h-3 w-3 fill-primary text-primary" />
                        <span>{sellerRating.toFixed(1)}</span>
                        <span>({sellerReviews} reviews)</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Checkout Form */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Complete Your Purchase</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Verified as: {phone}
                </p>
              </CardHeader>
              <CardContent>
                {error && (
                  <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
                    {error}
                  </div>
                )}
                <form onSubmit={handlePayment} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name *</Label>
                    <Input
                      id="name"
                      placeholder="John Doe"
                      value={buyerName}
                      onChange={(e) => setBuyerName(e.target.value)}
                      required
                      disabled={processing}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email (Optional)</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={buyerEmail}
                      onChange={(e) => setBuyerEmail(e.target.value)}
                      disabled={processing}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address">Delivery Address</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Textarea
                        id="address"
                        placeholder="Enter your delivery address"
                        value={buyerAddress}
                        onChange={(e) => setBuyerAddress(e.target.value)}
                        className="min-h-[80px] pl-10"
                        disabled={processing}
                      />
                    </div>
                  </div>

                  {/* Escrow Notice */}
                  <div className="rounded-lg bg-primary/10 p-3 text-sm text-primary">
                    <div className="flex items-start gap-2">
                      <ShieldCheck className="mt-0.5 h-4 w-4 flex-shrink-0" />
                      <div>
                        <p className="font-medium">Secure Escrow Payment</p>
                        <p className="mt-1 text-xs opacity-80">
                          Your payment is held securely until you confirm delivery.
                        </p>
                      </div>
                    </div>
                  </div>

                  <Button type="submit" className="w-full" size="lg" disabled={processing}>
                    {processing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>Pay {formatCurrency(price, paymentLink.currency)}</>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </>
        )}

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-muted-foreground">
          Protected by PayLoom Escrow • Secure Transactions
        </p>
      </div>
    </div>
  );
};

export { PaymentPage };
