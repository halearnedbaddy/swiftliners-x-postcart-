import { MessageSquare, AlertTriangle, CheckCircle, XCircle, Loader, Download } from 'lucide-react';
import { useAdminData } from '@/hooks/useAdminData';
import { useState } from 'react';
import { exportToCSV } from '@/utils/csvExport';
import { DateRangeFilter } from '@/components/ui/DateRangeFilter';
import { api } from '@/services/api';

export function AdminDisputes() {
    const { disputes, loading, error, refetch } = useAdminData();
    const [resolving, setResolving] = useState<string | null>(null);
    const [dateStart, setDateStart] = useState<string | null>(null);
    const [dateEnd, setDateEnd] = useState<string | null>(null);

    // Filter disputes by date range
    const filteredDisputes = disputes.filter(dispute => {
        if (!dateStart && !dateEnd) return true;
        
        const disputeDate = new Date(dispute.createdAt);
        let matchesDate = true;
        
        if (dateStart) {
            matchesDate = matchesDate && disputeDate >= new Date(dateStart);
        }
        if (dateEnd) {
            const endDate = new Date(dateEnd);
            endDate.setHours(23, 59, 59, 999);
            matchesDate = matchesDate && disputeDate <= endDate;
        }
        
        return matchesDate;
    });

    const handleResolveDispute = async (disputeId: string, favoriteSide: 'buyer' | 'seller') => {
        setResolving(disputeId);
        try {
            const res = await api.resolveDispute(disputeId, {
                resolution: `Dispute resolved in favor of ${favoriteSide}`,
                winner: favoriteSide,
            });
            if (res.success) await refetch();
        } catch (err) {
            console.error('Failed to resolve dispute:', err);
        } finally {
            setResolving(null);
        }
    };

    const handleExportCSV = () => {
        const exportData = filteredDisputes.map(dispute => ({
            id: dispute.id,
            transactionId: dispute.transactionId,
            reason: dispute.reason,
            status: dispute.status,
            itemName: dispute.transaction?.itemName || 'N/A',
            amount: dispute.transaction?.amount || 0,
            sellerName: dispute.transaction?.seller?.name || 'N/A',
            buyerName: dispute.transaction?.buyer?.name || 'N/A',
            createdAt: new Date(dispute.createdAt).toISOString(),
        }));

        const columns = [
            { key: 'id' as const, label: 'Dispute ID' },
            { key: 'transactionId' as const, label: 'Transaction ID' },
            { key: 'reason' as const, label: 'Reason' },
            { key: 'status' as const, label: 'Status' },
            { key: 'itemName' as const, label: 'Item' },
            { key: 'amount' as const, label: 'Amount (KES)' },
            { key: 'sellerName' as const, label: 'Seller' },
            { key: 'buyerName' as const, label: 'Buyer' },
            { key: 'createdAt' as const, label: 'Created At' },
        ];

        const dateRange = dateStart || dateEnd 
            ? `_${dateStart || 'start'}_to_${dateEnd || 'now'}` 
            : '';
        exportToCSV(exportData, `disputes${dateRange}_${new Date().toISOString().split('T')[0]}`, columns);
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="flex justify-between items-center flex-wrap gap-4">
                    <div>
                        <h2 className="text-2xl font-bold text-[#3d1a7a]">Dispute Resolution Center</h2>
                        <p className="text-sm text-gray-500 mt-1">Manage and resolve transaction disputes</p>
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
                <div className="flex justify-between items-center flex-wrap gap-4">
                    <div>
                        <h2 className="text-2xl font-bold text-[#3d1a7a]">Dispute Resolution Center</h2>
                        <p className="text-sm text-gray-500 mt-1">Manage and resolve transaction disputes</p>
                    </div>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-null p-6 text-red-700">
                    <p className="font-bold">Failed to load disputes</p>
                    <p className="text-sm">{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center flex-wrap gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-[#3d1a7a]">Dispute Resolution Center</h2>
                    <p className="text-sm text-gray-500 mt-1">Manage and resolve transaction disputes ({disputes.length} total{filteredDisputes.length !== disputes.length ? `, showing ${filteredDisputes.length}` : ''})</p>
                </div>
                <div className="flex items-center gap-2">
                    <DateRangeFilter
                        startDate={dateStart}
                        endDate={dateEnd}
                        onApply={(start, end) => {
                            setDateStart(start);
                            setDateEnd(end);
                        }}
                        onClear={() => {
                            setDateStart(null);
                            setDateEnd(null);
                        }}
                    />
                    <button 
                        onClick={handleExportCSV}
                        disabled={filteredDisputes.length === 0}
                        className="flex items-center gap-2 px-4 py-2 bg-[#3d1a7a] text-white rounded-null text-sm font-semibold hover:bg-[#250e52] transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Download size={16} /> Export CSV
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
                {filteredDisputes.length > 0 ? (
                    filteredDisputes.map((dispute) => (
                        <div key={dispute.id} className="bg-white rounded-null border border-gray-200 shadow-sm p-6 flex flex-col md:flex-row gap-6">
                            <div className="flex-1 space-y-4">
                                <div className="flex items-center gap-3 flex-wrap">
                                    <span className={`px-3 py-1 rounded-null-full text-xs font-bold uppercase ${dispute.status === 'OPEN' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
                                        }`}>
                                        {dispute.status}
                                    </span>
                                    <span className="text-gray-400 text-sm">Case #{dispute.id}</span>
                                    <span className="text-gray-400 text-sm">• {new Date(dispute.createdAt).toLocaleDateString()}</span>
                                </div>

                                <div>
                                    <h3 className="text-lg font-bold text-[#3d1a7a]">{dispute.reason}</h3>
                                    <p className="text-sm text-gray-600 mt-1">
                                        Transaction: <span className="font-mono text-blue-600">{dispute.transaction.itemName}</span>
                                    </p>
                                    <p className="text-sm text-gray-600">
                                        <span className="font-semibold">{dispute.transaction.seller.name}</span>
                                        {dispute.transaction.buyer && ` ↔ ${dispute.transaction.buyer.name}`}
                                    </p>
                                </div>

                                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-null text-red-700 text-sm max-w-md">
                                    <AlertTriangle size={16} />
                                    <span className="font-bold">Amount at Risk: KES {dispute.transaction.amount.toLocaleString()}</span>
                                </div>
                            </div>

                            <div className="flex flex-col gap-3 justify-center min-w-[200px]">
                                <button className="w-full py-2 px-4 bg-[#3d1a7a] text-white rounded-null font-semibold hover:bg-[#250e52] transition flex items-center justify-center gap-2">
                                    <MessageSquare size={16} /> View Evidence
                                </button>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        onClick={() => handleResolveDispute(dispute.id, 'seller')}
                                        disabled={resolving === dispute.id}
                                        className="py-2 px-3 border border-[#5d2ba3]/30 bg-[#5d2ba3]/10 text-[#5d2ba3] rounded-null font-semibold hover:bg-[#5d2ba3]/20 transition flex items-center justify-center gap-2 text-xs disabled:opacity-50"
                                    >
                                        <CheckCircle size={14} /> Release
                                    </button>
                                    <button
                                        onClick={() => handleResolveDispute(dispute.id, 'buyer')}
                                        disabled={resolving === dispute.id}
                                        className="py-2 px-3 border border-[#4F4A41]/30 bg-[#4F4A41]/10 text-[#4F4A41] rounded-null font-semibold hover:bg-[#4F4A41]/20 transition flex items-center justify-center gap-2 text-xs disabled:opacity-50"
                                    >
                                        <XCircle size={14} /> Refund
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-center py-12 bg-white rounded-null border border-gray-200 border-dashed">
                        <CheckCircle className="mx-auto text-[#5d2ba3] mb-4" size={48} />
                        <h3 className="text-lg font-bold text-[#3d1a7a]">
                            {dateStart || dateEnd ? 'No disputes in selected date range' : 'All Clear!'}
                        </h3>
                        <p className="text-gray-500">
                            {dateStart || dateEnd 
                                ? 'Try adjusting your date filter to see more results.' 
                                : 'There are no open disputes requiring attention.'}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
