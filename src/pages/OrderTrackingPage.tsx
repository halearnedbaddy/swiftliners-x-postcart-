import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import {
    CheckCircle, AlertCircle, 
    Store, Clock, ChevronLeft, ShieldCheck,
    Star, X, Loader2
} from "lucide-react";
import { api } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

interface OrderDetails {
    id: string;
    itemName: string;
    itemDescription?: string;
    amount: number;
    currency: string;
    status: string;
    createdAt: string;
    paidAt?: string;
    shippedAt?: string;
    deliveredAt?: string;
    completedAt?: string;
    trackingNumber?: string;
    courierName?: string;
    sellerId: string;
    seller: {
        name: string;
        sellerProfile?: {
            businessName?: string;
            rating?: number;
        };
    };
}

export function OrderTrackingPage() {
    const { transactionId } = useParams();
    const { toast } = useToast();
    const [order, setOrder] = useState<OrderDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [isConfirming, setIsConfirming] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [showDisputeModal, setShowDisputeModal] = useState(false);
    const [rating, setRating] = useState(5);
    const [review, setReview] = useState('');
    const [disputeReason, setDisputeReason] = useState('');

    useEffect(() => {
        fetchOrderDetails();
    }, [transactionId]);

    const fetchOrderDetails = async () => {
        try {
            if (!transactionId) return;
            setLoading(true);
            const res = await api.trackOrder(transactionId);
            if (res.success && res.data) {
                setOrder(res.data as OrderDetails);
            } else {
                toast({
                    title: "Error",
                    description: "Failed to load tracking details",
                    variant: "destructive",
                });
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleConfirmDelivery = async () => {
        if (!transactionId) return;
        setIsConfirming(true);
        try {
            // Note: Public tracking might need a way to verify the user (e.g. phone)
            // For now, we'll use the authenticated endpoint if logged in, or a public one
            const res = await api.request(`/api/v1/buyer/orders/${transactionId}/confirm-delivery`, {
                method: 'POST',
                body: { transactionId, rating, review }
            });

            if (res.success) {
                toast({ title: "Success", description: "Delivery confirmed and funds released!" });
                setShowConfirmModal(false);
                fetchOrderDetails();
            } else {
                toast({ title: "Error", description: res.error || "Failed to confirm delivery", variant: "destructive" });
            }
        } catch (error) {
            toast({ title: "Error", description: "An unexpected error occurred", variant: "destructive" });
        } finally {
            setIsConfirming(false);
        }
    };

    const handleOpenDispute = async () => {
        if (!transactionId) return;
        setIsConfirming(true);
        try {
            const res = await api.request(`/api/v1/buyer/disputes`, {
                method: 'POST',
                body: { transactionId, reason: disputeReason }
            });

            if (res.success) {
                toast({ title: "Dispute Opened", description: "Our team will review the issue." });
                setShowDisputeModal(false);
                fetchOrderDetails();
            } else {
                toast({ title: "Error", description: res.error || "Failed to open dispute", variant: "destructive" });
            }
        } catch (error) {
            toast({ title: "Error", description: "An unexpected error occurred", variant: "destructive" });
        } finally {
            setIsConfirming(false);
        }
    };

    const getStatusStep = (status: string) => {
        const steps = ['PENDING', 'PAID', 'SHIPPED', 'DELIVERED', 'COMPLETED'];
        const currentIdx = steps.indexOf(status === 'PROCESSING' ? 'PAID' : status);
        return Math.max(0, currentIdx);
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!order) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 text-center">
                <AlertCircle className="w-16 h-16 text-gray-300 mb-4" />
                <h2 className="text-2xl font-bold mb-2">Order Not Found</h2>
                <p className="text-gray-500 mb-6">We couldn't find an order with this ID.</p>
                <Button asChild>
                    <Link to="/">Back to Home</Link>
                </Button>
            </div>
        );
    }

    const currentStep = getStatusStep(order.status);
    const timeline = [
        { label: 'Order Placed', date: order.createdAt, active: true },
        { label: 'Payment Confirmed', date: order.paidAt, active: !!order.paidAt },
        { label: 'Order Shipped', date: order.shippedAt, active: !!order.shippedAt, details: order.courierName ? `${order.courierName} - ${order.trackingNumber}` : null },
        { label: 'Delivered', date: order.deliveredAt, active: !!order.deliveredAt },
    ];

    return (
        <div className="min-h-screen bg-gray-50 pb-24">
            {/* Header */}
            <header className="bg-white border-b border-gray-100 px-4 h-14 flex items-center justify-between sticky top-0 z-30">
                <button onClick={() => window.history.back()} className="p-2 -ml-2">
                    <ChevronLeft size={24} />
                </button>
                <h1 className="font-black text-primary tracking-tighter text-lg">Track Order</h1>
                <div className="w-10"></div>
            </header>

            <div className="max-w-xl mx-auto px-4 py-6 space-y-6">
                {/* Order Summary Card */}
                <Card className="border-none shadow-sm rounded-2xl overflow-hidden">
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h2 className="text-xl font-black text-gray-900">{order.itemName}</h2>
                                <p className="text-sm text-gray-500">Order #{order.id.slice(-8).toUpperCase()}</p>
                            </div>
                            <Badge className="bg-primary/10 text-primary border-none font-bold">
                                {order.status}
                            </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-primary font-bold">
                            <Store size={16} />
                            <span>{order.seller.sellerProfile?.businessName || order.seller.name}</span>
                        </div>
                    </CardContent>
                </Card>

                {/* Timeline Card */}
                <Card className="border-none shadow-sm rounded-2xl overflow-hidden">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm uppercase tracking-widest font-black text-gray-400">Order Timeline</CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                        <div className="space-y-8">
                            {timeline.map((item, i) => (
                                <div key={i} className="flex gap-4 relative">
                                    {i < timeline.length - 1 && (
                                        <div className={`absolute left-3 top-8 w-0.5 h-8 ${i < currentStep ? 'bg-primary' : 'bg-gray-100'}`} />
                                    )}
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 z-10 ${
                                        item.active ? 'bg-primary text-white' : 'bg-gray-100 text-gray-300'
                                    }`}>
                                        {item.active ? <CheckCircle size={14} /> : <Clock size={14} />}
                                    </div>
                                    <div className="flex-1">
                                        <p className={`font-bold text-sm ${item.active ? 'text-gray-900' : 'text-gray-400'}`}>
                                            {item.label}
                                        </p>
                                        {item.date && (
                                            <p className="text-xs text-gray-500">
                                                {new Date(item.date).toLocaleString()}
                                            </p>
                                        )}
                                        {item.details && (
                                            <p className="text-xs font-mono bg-gray-50 p-2 rounded-lg mt-2 text-gray-600 border border-gray-100">
                                                {item.details}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Action Section */}
                <div className="space-y-3">
                    {['SHIPPED', 'DELIVERED'].includes(order.status) && (
                        <Button 
                            onClick={() => setShowConfirmModal(true)}
                            className="w-full py-6 rounded-2xl font-black text-lg shadow-lg shadow-primary/20"
                        >
                            ✅ CONFIRM DELIVERY
                        </Button>
                    )}
                    
                    {['PAID', 'SHIPPED', 'DELIVERED'].includes(order.status) && (
                        <Button 
                            variant="outline" 
                            onClick={() => setShowDisputeModal(true)}
                            className="w-full py-6 rounded-2xl font-black text-gray-600 border-2"
                        >
                            ⚠️ REPORT ISSUE
                        </Button>
                    )}
                </div>

                {/* Confirm Delivery Modal */}
                {showConfirmModal && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-0 md:p-4">
                        <div className="bg-white w-full max-w-md rounded-t-3xl md:rounded-2xl p-6 animate-in slide-in-from-bottom duration-300">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-black text-gray-900">Confirm Delivery</h3>
                                <button onClick={() => setShowConfirmModal(false)} className="p-2 bg-gray-100 rounded-full">
                                    <X size={20} />
                                </button>
                            </div>
                            
                            <p className="text-gray-600 text-sm mb-6">
                                Have you received your order and is it as described?
                            </p>

                            <div className="space-y-6">
                                <div>
                                    <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-3">Rate your experience</label>
                                    <div className="flex gap-2">
                                        {[1, 2, 3, 4, 5].map((s) => (
                                            <button 
                                                key={s} 
                                                onClick={() => setRating(s)}
                                                className={`w-12 h-12 rounded-xl flex items-center justify-center transition ${
                                                    rating >= s ? 'bg-amber-400 text-white' : 'bg-gray-100 text-gray-300'
                                                }`}
                                            >
                                                <Star size={24} fill="currentColor" />
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Leave a review (Optional)</label>
                                    <textarea 
                                        value={review}
                                        onChange={(e) => setReview(e.target.value)}
                                        placeholder="Great product! Fast delivery..."
                                        className="w-full p-4 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:border-primary transition h-24 resize-none"
                                    />
                                </div>

                                <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-xs text-amber-800">
                                    <p className="font-bold mb-1">⚠️ IMPORTANT</p>
                                    Once confirmed, funds will be released to the seller. This action cannot be undone.
                                </div>

                                <Button 
                                    onClick={handleConfirmDelivery}
                                    disabled={isConfirming}
                                    className="w-full py-6 rounded-xl font-black text-lg"
                                >
                                    {isConfirming ? <Loader2 className="animate-spin" /> : 'CONFIRM & RELEASE PAYMENT'}
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Dispute Modal */}
                {showDisputeModal && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-0 md:p-4">
                        <div className="bg-white w-full max-w-md rounded-t-3xl md:rounded-2xl p-6 animate-in slide-in-from-bottom duration-300">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-black text-gray-900">Report an Issue</h3>
                                <button onClick={() => setShowDisputeModal(false)} className="p-2 bg-gray-100 rounded-full">
                                    <X size={20} />
                                </button>
                            </div>
                            
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">What is the issue?</label>
                                    <select 
                                        value={disputeReason}
                                        onChange={(e) => setDisputeReason(e.target.value)}
                                        className="w-full p-4 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:border-primary transition"
                                    >
                                        <option value="">Select a reason</option>
                                        <option value="item_not_received">Item not received</option>
                                        <option value="item_not_as_described">Item not as described</option>
                                        <option value="item_damaged">Item arrived damaged</option>
                                        <option value="wrong_item">Received wrong item</option>
                                        <option value="other">Other issue</option>
                                    </select>
                                </div>

                                <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-xs text-red-800">
                                    <p className="font-bold mb-1">🛡️ YOUR FUNDS ARE SAFE</p>
                                    Opening a dispute will hold the funds in escrow until our team reviews the case.
                                </div>

                                <Button 
                                    variant="destructive"
                                    onClick={handleOpenDispute}
                                    disabled={isConfirming || !disputeReason}
                                    className="w-full py-6 rounded-xl font-black text-lg"
                                >
                                    {isConfirming ? <Loader2 className="animate-spin" /> : 'OPEN DISPUTE'}
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Protection Reassurance */}
                <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5 flex items-start gap-4">
                    <ShieldCheck className="text-emerald-600 flex-shrink-0" size={24} />
                    <div>
                        <p className="text-sm font-bold text-emerald-900">Your Payment is Protected</p>
                        <p className="text-xs text-emerald-700 leading-relaxed">
                            PayLoom holds your funds securely in escrow. The seller only gets paid once you confirm delivery or after 7 days of verified shipping.
                        </p>
                    </div>
                </div>

                {/* Footer Links */}
                <div className="flex justify-center gap-6 pt-4">
                    <button className="text-xs font-bold text-gray-400 uppercase tracking-widest hover:text-primary transition">
                        Chat with Seller
                    </button>
                    <button className="text-xs font-bold text-gray-400 uppercase tracking-widest hover:text-primary transition">
                        Contact Support
                    </button>
                </div>
            </div>
        </div>
    );
}
