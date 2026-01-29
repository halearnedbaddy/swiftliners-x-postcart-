import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import {
    ArrowLeft,
    Package,
    Truck,
    CheckCircle,
    AlertCircle,
    MessageSquare,
    Store,
    Clock,
    CreditCard,
    MapPin,
    ExternalLink
} from "lucide-react";
import { io } from "socket.io-client";
import { useSupabaseAuth } from "@/contexts/SupabaseAuthContext";
import { api } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";

interface OrderDetails {
    id: string;
    itemName: string;
    itemDescription?: string;
    amount: number;
    quantity: number;
    currency: string;
    status: string;
    createdAt: string;
    paidAt?: string;
    shippedAt?: string;
    deliveredAt?: string;
    completedAt?: string;
    buyerAddress?: string;
    trackingNumber?: string;
    courierName?: string;
    seller: {
        id: string;
        name: string;
        phone?: string;
        email?: string;
        sellerProfile?: {
            businessName?: string;
            rating?: number;
        };
    };
}

export function BuyerOrderDetailPage() {
    const { transactionId } = useParams();
    const { user } = useSupabaseAuth() ?? {};
    const { toast } = useToast();
    const [order, setOrder] = useState<OrderDetails | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchOrderDetails();

        // Convert Replit/Localhost logic for Socket URL
        const backendUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
        const socketUrl = backendUrl.replace('/api/v1', '');

        const newSocket = io(socketUrl, {
            query: { token: localStorage.getItem('accessToken') },
            transports: ['websocket']
        });

        newSocket.on('connect', () => {
            console.log('Connected to socket for order updates');
            if (user?.id) {
                newSocket.emit('join-notifications', user.id);
            }
        });

        newSocket.on('notification', (data: any) => {
            console.log('Received notification:', data);

            // If notification relates to this transaction, refresh data
            if (data.data?.transactionId === transactionId) {
                toast({
                    title: data.title,
                    description: data.message,
                });
                fetchOrderDetails();
            }
        });

        return () => {
            newSocket.disconnect();
        };
    }, [transactionId, user]);

    const fetchOrderDetails = async () => {
        try {
            if (!transactionId) return;
            setLoading(true);
            const res = await api.getBuyerOrderDetails(transactionId);
            if (res.success && res.data) {
                setOrder(res.data as OrderDetails);
            } else {
                toast({
                    title: "Error",
                    description: "Failed to load order details",
                    variant: "destructive",
                });
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status: string) => {
        const styles: Record<string, string> = {
            PENDING: "bg-yellow-100 text-yellow-800",
            PAID: "bg-blue-100 text-blue-800",
            Processing: "bg-blue-100 text-blue-800", // Case sensitivity handle
            PROCESSING: "bg-blue-100 text-blue-800",
            SHIPPED: "bg-purple-100 text-purple-800",
            DELIVERED: "bg-green-100 text-green-800",
            COMPLETED: "bg-green-100 text-green-800",
            CANCELLED: "bg-red-100 text-red-800",
            DISPUTED: "bg-orange-100 text-orange-800",
        };
        return (
            <Badge className={styles[status] || "bg-gray-100 text-gray-800"}>
                {status}
            </Badge>
        );
    };

    const getStatusStep = (status: string) => {
        const steps = ['PENDING', 'PAID', 'SHIPPED', 'DELIVERED', 'COMPLETED'];
        // Normalize status just in case
        const currentIdx = steps.indexOf(status === 'PROCESSING' ? 'PAID' : status);
        return Math.max(0, currentIdx);
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <div className="animate-spin rounded-null-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!order) {
        return (
            <div className="container max-w-4xl mx-auto py-8 px-4 text-center">
                <h2 className="text-2xl font-bold mb-4">Order Not Found</h2>
                <Button asChild>
                    <Link to="/buyer">Return to Dashboard</Link>
                </Button>
            </div>
        );
    }

    const currentStep = getStatusStep(order.status);

    return (
        <div className="min-h-screen bg-gray-50 pb-12">
            {/* Header */}
            <div className="bg-white border-b sticky top-0 z-10">
                <div className="container max-w-5xl mx-auto py-4 px-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" asChild>
                            <Link to="/buyer">
                                <ArrowLeft className="h-5 w-5" />
                            </Link>
                        </Button>
                        <div>
                            <h1 className="text-xl font-bold flex items-center gap-2">
                                Order #{order.id.slice(-8)}
                                {getStatusBadge(order.status)}
                            </h1>
                            <p className="text-sm text-gray-500">
                                Placed on {new Date(order.createdAt).toLocaleDateString()}
                            </p>
                        </div>
                    </div>
                    <Button variant="outline" onClick={fetchOrderDetails}>
                        Check Status
                    </Button>
                </div>
            </div>

            <div className="container max-w-5xl mx-auto py-8 px-4 grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Main Content - Left Column */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Order Progress */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Order Progress</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="relative flex justify-between">
                                {['Ordered', 'Paid', 'Shipped', 'Delivered', 'Completed'].map((step, idx) => (
                                    <div key={step} className="flex flex-col items-center relative z-10 w-20">
                                        <div className={`w-8 h-8 rounded-null-full flex items-center justify-center border-2 
                      ${idx <= currentStep ? 'bg-primary border-primary text-white' : 'bg-white border-gray-300 text-gray-300'}
                    `}>
                                            {idx <= currentStep ? <CheckCircle className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                                        </div>
                                        <span className={`text-xs mt-2 font-medium ${idx <= currentStep ? 'text-primary' : 'text-gray-400'}`}>
                                            {step}
                                        </span>
                                    </div>
                                ))}
                                {/* Connecting Line */}
                                <div className="absolute top-4 left-0 w-full h-0.5 bg-gray-200 -z-0">
                                    <div
                                        className="h-full bg-primary transition-all duration-500"
                                        style={{ width: `${(currentStep / 4) * 100}%` }}
                                    ></div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Item Details */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Item Details</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-start gap-4">
                                <div className="h-20 w-20 bg-gray-100 rounded-null-lg flex items-center justify-center">
                                    <Package className="h-8 w-8 text-gray-400" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-lg">{order.itemName}</h3>
                                    <p className="text-gray-600 mb-2">{order.itemDescription || "No description provided."}</p>
                                    <div className="flex gap-4 text-sm text-gray-500">
                                        <span>Qty: {order.quantity}</span>
                                        <span>•</span>
                                        <span className="font-medium text-black">
                                            {order.currency} {order.amount.toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Shipping Information */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Truck className="h-5 w-5" /> Shipping Information
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {order.status === 'SHIPPED' || order.status === 'DELIVERED' || order.status === 'COMPLETED' ? (
                                <>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-sm text-gray-500">Courier Service</p>
                                            <p className="font-medium">{order.courierName || 'Not specified'}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-500">Tracking Number</p>
                                            <p className="font-medium font-mono">{order.trackingNumber || 'N/A'}</p>
                                        </div>
                                    </div>
                                    {order.shippedAt && (
                                        <div className="bg-blue-50 p-3 rounded-null-md text-blue-700 text-sm flex gap-2">
                                            <Clock className="h-4 w-4 mt-0.5" />
                                            Shipped on {new Date(order.shippedAt).toLocaleString()}
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="text-center py-6 text-gray-500 bg-gray-50 rounded-null-lg">
                                    <Package className="h-8 w-8 mx-auto mb-2 opacity-30" />
                                    <p>Shipping details will be available once the seller ships your item.</p>
                                </div>
                            )}

                            <Separator />

                            <div>
                                <p className="text-sm text-gray-500 mb-1 flex items-center gap-1">
                                    <MapPin className="h-3 w-3" /> Delivery Address
                                </p>
                                <p className="font-medium text-gray-900">{order.buyerAddress || 'Digital Product / No address provided'}</p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Payment History Log */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <CreditCard className="h-5 w-5" /> Payment History
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {[
                                    { label: "Order Created", date: order.createdAt, active: true },
                                    { label: "Payment Successful", date: order.paidAt, active: !!order.paidAt },
                                    { label: "Funds Secured in Escrow", date: order.paidAt, active: !!order.paidAt },
                                    { label: "Funds Released to Seller", date: order.completedAt, active: !!order.completedAt }
                                ].filter(e => e.active).map((event, i) => (
                                    <div key={i} className="flex gap-4">
                                        <div className="flex flex-col items-center">
                                            <div className="h-2 w-2 bg-primary rounded-null-full mt-2"></div>
                                            {i < 3 && <div className="w-0.5 bg-gray-200 flex-1 min-h-[20px]"></div>}
                                        </div>
                                        <div className="pb-4">
                                            <p className="font-medium text-sm">{event.label}</p>
                                            <p className="text-xs text-gray-500">{new Date(event.date!).toLocaleString()}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Sidebar - Right Column */}
                <div className="space-y-6">

                    {/* Seller Information */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Store className="h-5 w-5" /> Seller Info
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 bg-primary/10 rounded-null-full flex items-center justify-center text-primary font-bold">
                                    {order.seller.name.charAt(0)}
                                </div>
                                <div>
                                    <p className="font-bold">{order.seller.sellerProfile?.businessName || order.seller.name}</p>
                                    <div className="flex items-center text-xs text-yellow-500">
                                        {'★'.repeat(Math.round(order.seller.sellerProfile?.rating || 0))}
                                        <span className="text-gray-400 ml-1">({order.seller.sellerProfile?.rating || 0})</span>
                                    </div>
                                </div>
                            </div>

                            <Separator />

                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Contact Name</span>
                                    <span className="font-medium">{order.seller.name}</span>
                                </div>
                                {order.seller.phone && (
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Phone</span>
                                        <span className="font-medium">{order.seller.phone}</span>
                                    </div>
                                )}
                                {order.seller.email && (
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Email</span>
                                        <span className="font-medium truncate max-w-[150px]" title={order.seller.email}>
                                            {order.seller.email}
                                        </span>
                                    </div>
                                )}
                            </div>

                            <div className="pt-2">
                                <Button variant="outline" className="w-full flex gap-2">
                                    <MessageSquare className="h-4 w-4" /> Message Seller
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Actions */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Actions</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {order.status === 'SHIPPED' && (
                                <Button className="w-full bg-[#3d1a7a] hover:bg-[#250e52]">
                                    Confirm Delivery
                                </Button>
                            )}
                            {['PAID', 'SHIPPED', 'DELIVERED'].includes(order.status) && (
                                <Button variant="destructive" className="w-full">
                                    <AlertCircle className="h-4 w-4 mr-2" /> Report Issue
                                </Button>
                            )}
                            <Button variant="secondary" className="w-full" asChild>
                                <a href={`/pay/${order.id}`} target="_blank" rel="noreferrer">
                                    <ExternalLink className="h-4 w-4 mr-2" /> View Public Link
                                </a>
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Help */}
                    <Card className="bg-blue-50 border-blue-100">
                        <CardContent className="p-4">
                            <h4 className="font-semibold text-blue-900 mb-1">Need Help?</h4>
                            <p className="text-sm text-blue-800 mb-3">
                                If you have issues with this order, funds are held safely in escrow until resolved.
                            </p>
                            <Link to="/support" className="text-sm font-medium text-blue-600 hover:underline">
                                Contact Support &rarr;
                            </Link>
                        </CardContent>
                    </Card>

                </div>
            </div>
        </div>
    );
}
