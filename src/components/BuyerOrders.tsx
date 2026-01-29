import { useState } from 'react';
import { SearchIcon, FilterIcon, ShoppingBagIcon, ClockIcon, CheckCircleIcon, PackageIcon } from '@/components/icons';
import StatusBadge from './StatusBadge';

interface Order {
    id: string;
    seller: string;
    amount: number;
    item: string;
    status: 'pending' | 'shipped' | 'delivered' | 'completed' | 'dispute' | 'cancelled';
    date: string;
    image: string;
}

export function BuyerOrders() {
    const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active');

    // Mock Data
    const orders: Order[] = [
        {
            id: "ORD-7829",
            seller: "Tech Haven KE",
            amount: 14500,
            item: "Samsung Galaxy Watch 5",
            status: "shipped",
            date: "2023-12-20",
            image: "⌚"
        },
        {
            id: "ORD-9921",
            seller: "Glamour Trends",
            amount: 3200,
            item: "Vintage Denim Jacket",
            status: "pending",
            date: "2023-12-18",
            image: "👕"
        },
        {
            id: "ORD-5543",
            seller: "Gadget World",
            amount: 85000,
            item: "MacBook Air M1",
            status: "completed",
            date: "2023-11-05",
            image: "💻"
        }
    ];

    const filteredOrders = orders.filter(order => {
        if (activeTab === 'active') {
            return ['pending', 'shipped', 'delivered', 'dispute'].includes(order.status);
        }
        return ['completed', 'cancelled'].includes(order.status);
    });

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold">My Orders</h2>
                    <p className="text-gray-500 text-sm">Track and manage your purchases</p>
                </div>

                <div className="flex bg-gray-100 p-1 rounded-nulllg">
                    <button
                        onClick={() => setActiveTab('active')}
                        className={`px-4 py-2 rounded-nullmd text-sm font-semibold transition ${activeTab === 'active' ? 'bg-white shadow text-[#3d1a7a]' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Active Orders
                    </button>
                    <button
                        onClick={() => setActiveTab('completed')}
                        className={`px-4 py-2 rounded-nullmd text-sm font-semibold transition ${activeTab === 'completed' ? 'bg-white shadow text-[#3d1a7a]' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Past Orders
                    </button>
                </div>
            </div>

            {/* Search Bar */}
            <div className="flex gap-2">
                <div className="relative flex-1">
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search by Item Name or Order ID..."
                        className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-nullxl focus:outline-none focus:border-[#3d1a7a] transition"
                    />
                </div>
                <button className="px-5 border border-gray-200 rounded-nullxl hover:bg-gray-50 transition flex items-center gap-2 font-medium text-gray-700">
                    <FilterIcon size={18} />
                    Filters
                </button>
            </div>

            {/* Orders List */}
            <div className="space-y-4">
                {filteredOrders.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-nullxl border border-gray-100">
                        <ShoppingBagIcon className="w-16 h-16 text-gray-200 mx-auto mb-4" size={64} />
                        <h3 className="text-lg font-bold text-[#3d1a7a]">No {activeTab} orders found</h3>
                        <p className="text-gray-500">Your order history is empty for this category.</p>
                    </div>
                ) : (
                    filteredOrders.map(order => (
                        <div key={order.id} className="bg-white border border-gray-200 rounded-nullxl p-6 hover:shadow-md transition group">
                            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                                <div className="flex gap-4 items-center">
                                    <div className="w-16 h-16 bg-gray-50 rounded-nullxl flex items-center justify-center text-3xl shadow-inner">
                                        {order.image}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg group-hover:text-[#3d1a7a] transition">{order.item}</h3>
                                        <p className="text-sm text-gray-500">Sold by <span className="font-semibold text-gray-900">{order.seller}</span></p>
                                        <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                                            <ClockIcon size={12} />
                                            <span>{order.date}</span>
                                            <span>•</span>
                                            <span>{order.id}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col md:items-end gap-2 w-full md:w-auto pl-20 md:pl-0 border-t md:border-t-0 pt-4 md:pt-0">
                                    <p className="font-black text-xl">KES {order.amount.toLocaleString()}</p>
                                    <StatusBadge status={order.status} />
                                </div>
                            </div>

                            <div className="mt-6 pt-4 border-t border-gray-100 flex justify-end gap-3">
                                {order.status === 'shipped' && (
                                    <button className="px-4 py-2 bg-[#3d1a7a] text-white rounded-nulllg text-sm font-bold hover:bg-[#250e52] transition flex items-center gap-2">
                                        <CheckCircleIcon size={16} /> Confirm Receipt
                                    </button>
                                )}
                                <button className="px-4 py-2 border border-gray-200 rounded-nulllg text-sm font-semibold hover:bg-gray-50 transition">
                                    View Details
                                </button>
                                {order.status === 'shipped' && (
                                    <button className="px-4 py-2 border border-gray-200 text-blue-600 rounded-nulllg text-sm font-semibold hover:bg-blue-50 transition flex items-center gap-2">
                                        <PackageIcon size={16} /> Track
                                    </button>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
