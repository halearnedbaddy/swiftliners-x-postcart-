import { Users, AlertTriangle, DollarSign, Activity, Loader } from 'lucide-react';
import { useAdminData } from '@/hooks/useAdminData';
import { useCurrency } from '@/hooks/useCurrency';

export function AdminOverview() {
    const { metrics, loading, error } = useAdminData();
    const { formatPrice } = useCurrency();

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-bold text-[#3d1a7a]">Platform Overview</h2>
                        <p className="text-sm text-gray-500 mt-1">Real-time platform statistics and system status</p>
                    </div>
                </div>
                <div className="flex items-center justify-center py-12">
                    <Loader size={32} className="animate-spin text-[#5d2ba3]" />
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-bold text-[#3d1a7a]">Platform Overview</h2>
                        <p className="text-sm text-gray-500 mt-1">Real-time platform statistics and system status</p>
                    </div>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-null p-6 text-red-700">
                    <p className="font-bold">Failed to load dashboard</p>
                    <p className="text-sm">{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-[#3d1a7a]">Platform Overview</h2>
                    <p className="text-sm text-gray-500 mt-1">Real-time platform statistics and system status</p>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-null border border-gray-200 shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-[#5d2ba3]/10 rounded-null text-[#5d2ba3]">
                            <DollarSign size={24} />
                        </div>
                    </div>
                    <p className="text-sm text-gray-500 font-medium">Total Volume</p>
                    <h3 className="text-3xl font-black text-gray-900">{formatPrice(metrics?.volume.total || 0, 'KES')}</h3>
                    <p className="text-xs text-gray-400 mt-1">≈ {formatPrice((metrics?.volume.total || 0) / 129.5, 'USD')}</p>
                </div>

                <div className="bg-white p-6 rounded-null border border-gray-200 shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-[#5d2ba3]/10 rounded-null text-[#5d2ba3]">
                            <Activity size={24} />
                        </div>
                    </div>
                    <p className="text-sm text-gray-500 font-medium">Completed Transactions</p>
                    <h3 className="text-3xl font-black text-gray-900">{metrics?.transactions.completed || 0}</h3>
                </div>

                <div className="bg-white p-6 rounded-null border border-gray-200 shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-[#4F4A41]/10 rounded-null text-[#4F4A41]">
                            <AlertTriangle size={24} />
                        </div>
                    </div>
                    <p className="text-sm text-gray-500 font-medium">Open Disputes</p>
                    <h3 className="text-3xl font-black text-gray-900">{metrics?.disputes.open || 0}</h3>
                </div>

                <div className="bg-white p-6 rounded-null border border-gray-200 shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-[#5d2ba3]/10 rounded-null text-[#5d2ba3]">
                            <Users size={24} />
                        </div>
                    </div>
                    <p className="text-sm text-gray-500 font-medium">Total Users</p>
                    <h3 className="text-3xl font-black text-gray-900">{metrics?.users.total || 0}</h3>
                </div>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
                {/* Summary Stats */}
                <div className="md:col-span-2 bg-white p-6 rounded-null border border-gray-200 shadow-sm">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-lg text-[#3d1a7a]">Platform Statistics</h3>
                    </div>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center pb-4 border-b border-gray-200">
                            <span className="text-gray-600">Buyers</span>
                            <span className="text-2xl font-bold text-gray-900">{metrics?.users.buyers || 0}</span>
                        </div>
                        <div className="flex justify-between items-center pb-4 border-b border-gray-200">
                            <span className="text-gray-600">Sellers</span>
                            <span className="text-2xl font-bold text-gray-900">{metrics?.users.sellers || 0}</span>
                        </div>
                        <div className="flex justify-between items-center pb-4 border-b border-gray-200">
                            <span className="text-gray-600">Total Transactions</span>
                            <span className="text-2xl font-bold text-gray-900">{metrics?.transactions.total || 0}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-gray-600">Pending Transactions</span>
                            <span className="text-2xl font-bold text-gray-900">{metrics?.transactions.pending || 0}</span>
                        </div>
                    </div>
                </div>

                {/* System Status */}
                <div className="bg-white p-6 rounded-null border border-gray-200 shadow-sm">
                    <h3 className="font-bold text-lg text-[#3d1a7a] mb-6">System Status</h3>
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-3 h-3 bg-[#5d2ba3] rounded-null-full"></div>
                            <span className="text-sm text-gray-600">Database Connected</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-3 h-3 bg-[#5d2ba3] rounded-null-full"></div>
                            <span className="text-sm text-gray-600">API Operational</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-3 h-3 bg-[#5d2ba3] rounded-null-full"></div>
                            <span className="text-sm text-gray-600">All Services Running</span>
                        </div>
                        <div className="mt-6 p-3 bg-[#5d2ba3]/10 border border-[#5d2ba3]/20 rounded-null">
                            <p className="text-xs text-[#5d2ba3] font-semibold">✓ Platform Healthy</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
