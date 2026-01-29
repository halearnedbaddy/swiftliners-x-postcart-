import { Search, Filter, Eye, MoreHorizontal, Download, Loader } from 'lucide-react';
import StatusBadge from '../StatusBadge';
import { useAdminData } from '@/hooks/useAdminData';
import { useState } from 'react';
import { exportToCSV } from '@/utils/csvExport';
import { DateRangeFilter } from '@/components/ui/DateRangeFilter';

export function AdminTransactions() {
    const { transactions, loading, error } = useAdminData();
    const [searchTerm, setSearchTerm] = useState('');
    const [dateStart, setDateStart] = useState<string | null>(null);
    const [dateEnd, setDateEnd] = useState<string | null>(null);

    const filteredTransactions = transactions.filter(trx => {
        const matchesSearch = trx.id.includes(searchTerm) ||
            trx.seller.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            trx.buyer?.name.toLowerCase().includes(searchTerm.toLowerCase());
        
        // Date range filter
        let matchesDate = true;
        if (dateStart || dateEnd) {
            const trxDate = new Date(trx.createdAt);
            if (dateStart) {
                matchesDate = matchesDate && trxDate >= new Date(dateStart);
            }
            if (dateEnd) {
                const endDate = new Date(dateEnd);
                endDate.setHours(23, 59, 59, 999);
                matchesDate = matchesDate && trxDate <= endDate;
            }
        }
        
        return matchesSearch && matchesDate;
    });

    const handleExportCSV = () => {
        const exportData = filteredTransactions.map(trx => ({
            id: trx.id,
            itemName: trx.itemName,
            amount: trx.amount,
            status: trx.status,
            buyerName: trx.buyer?.name || 'N/A',
            sellerName: trx.seller.name,
            sellerPhone: trx.seller.phone,
            createdAt: new Date(trx.createdAt).toISOString(),
        }));

        const columns = [
            { key: 'id' as const, label: 'Transaction ID' },
            { key: 'itemName' as const, label: 'Item' },
            { key: 'amount' as const, label: 'Amount (KES)' },
            { key: 'status' as const, label: 'Status' },
            { key: 'buyerName' as const, label: 'Buyer' },
            { key: 'sellerName' as const, label: 'Seller' },
            { key: 'sellerPhone' as const, label: 'Seller Phone' },
            { key: 'createdAt' as const, label: 'Created At' },
        ];

        const dateRange = dateStart || dateEnd 
            ? `_${dateStart || 'start'}_to_${dateEnd || 'now'}` 
            : '';
        exportToCSV(exportData, `transactions${dateRange}_${new Date().toISOString().split('T')[0]}`, columns);
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="flex justify-between items-center flex-wrap gap-4">
                    <div>
                        <h2 className="text-2xl font-bold text-[#3d1a7a]">Transaction Monitoring</h2>
                        <p className="text-sm text-gray-500 mt-1">Live view of all escrow transactions</p>
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
                        <h2 className="text-2xl font-bold text-[#3d1a7a]">Transaction Monitoring</h2>
                        <p className="text-sm text-gray-500 mt-1">Live view of all escrow transactions</p>
                    </div>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-null p-6 text-red-700">
                    <p className="font-bold">Failed to load transactions</p>
                    <p className="text-sm">{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center flex-wrap gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-[#3d1a7a]">Transaction Monitoring</h2>
                    <p className="text-sm text-gray-500 mt-1">Live view of all escrow transactions ({transactions.length} total)</p>
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
                        disabled={filteredTransactions.length === 0}
                        className="flex items-center gap-2 px-4 py-2 bg-[#5d2ba3] text-white rounded-null text-sm font-semibold hover:bg-[#3d1a7a] transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Download size={16} /> Export CSV
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-null border border-gray-200 shadow-sm overflow-hidden">
                {/* Filters */}
                <div className="p-4 border-b border-gray-200 flex gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search by Transaction ID, Buyer, or Seller..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-null focus:outline-none focus:border-[#3d1a7a] text-sm"
                        />
                    </div>
                    <button className="px-4 py-2 border border-gray-200 rounded-null hover:bg-gray-50 transition flex items-center gap-2 text-sm font-medium text-gray-700">
                        <Filter size={16} /> Filter Status
                    </button>
                </div>
                {/* Table */}
                <table className="w-full text-left">
                    <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-semibold">
                        <tr>
                            <th className="px-6 py-4">Transaction ID</th>
                            <th className="px-6 py-4">Item</th>
                            <th className="px-6 py-4">Seller</th>
                            <th className="px-6 py-4">Amount</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4">Date</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filteredTransactions.length > 0 ? (
                            filteredTransactions.map((trx) => (
                                <tr key={trx.id} className="hover:bg-gray-50 transition">
                                    <td className="px-6 py-4 font-mono text-sm font-medium text-gray-900">
                                        {trx.id}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600">
                                        {trx.itemName}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm">
                                            <p className="font-semibold text-gray-900">{trx.seller.name}</p>
                                            <p className="text-xs text-gray-500">{trx.seller.phone}</p>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm font-bold text-[#3d1a7a]">
                                        KES {trx.amount.toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4">
                                        <StatusBadge status={trx.status as any} />
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500">
                                        {new Date(trx.createdAt).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button className="p-2 hover:bg-gray-100 rounded-null text-gray-500 transition" title="View Details">
                                                <Eye size={18} />
                                            </button>
                                            <button className="p-2 hover:bg-gray-100 rounded-null text-gray-500 transition">
                                                <MoreHorizontal size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                                    No transactions found matching your search
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
