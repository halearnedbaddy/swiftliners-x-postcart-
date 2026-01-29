import { ArrowDownLeft, ArrowUpRight, Download, Search } from 'lucide-react';

interface Transaction {
    id: string;
    type: 'payment' | 'refund' | 'deposit';
    amount: number;
    description: string;
    date: string;
    status: 'completed' | 'pending' | 'failed';
}

export function BuyerHistory() {
    // Mock Data
    const transactions: Transaction[] = [
        {
            id: "TRX-88219",
            type: "payment",
            amount: 14500,
            description: "Payment to Tech Haven KE",
            date: "Dec 20, 2023",
            status: "completed"
        },
        {
            id: "TRX-88220",
            type: "deposit",
            amount: 5000,
            description: "Wallet Top-up via M-Pesa",
            date: "Dec 18, 2023",
            status: "completed"
        },
        {
            id: "TRX-88221",
            type: "refund",
            amount: 2500,
            description: "Refund from Style Loft (Out of Stock)",
            date: "Nov 15, 2023",
            status: "completed"
        }
    ];

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold">Transaction History</h2>
                    <p className="text-gray-500 text-sm">Download receipts and track your spending</p>
                </div>
                <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-nulllg hover:bg-gray-50 transition text-sm font-semibold">
                    <Download size={16} />
                    Download Statement
                </button>
            </div>

            {/* Transactions List */}
            <div className="bg-white rounded-nullxl border border-gray-200 overflow-hidden shadow-sm">
                <div className="p-4 border-b border-gray-100 flex gap-4">
                    <Search className="text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search transactions..."
                        className="flex-1 outline-none text-sm"
                    />
                </div>

                <table className="w-full text-left">
                    <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-semibold">
                        <tr>
                            <th className="px-6 py-4">Transaction</th>
                            <th className="px-6 py-4">Date</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4 text-right">Amount</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {transactions.map((trx) => (
                            <tr key={trx.id} className="hover:bg-gray-50 transition group">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-nullfull flex items-center justify-center ${trx.type === 'payment' ? 'bg-red-50 text-red-600' :
                                            trx.type === 'deposit' ? 'bg-green-50 text-green-600' :
                                                'bg-blue-50 text-blue-600'
                                            }`}>
                                            {trx.type === 'payment' ? <ArrowUpRight size={18} /> : <ArrowDownLeft size={18} />}
                                        </div>
                                        <div>
                                            <p className="font-semibold text-gray-900 group-hover:text-green-700 transition">{trx.description}</p>
                                            <p className="text-xs text-gray-500">{trx.id}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-600">
                                    {trx.date}
                                </td>
                                <td className="px-6 py-4">
                                    <span className="px-2 py-1 rounded-nullfull bg-green-100 text-green-700 text-xs font-bold capitalize">
                                        {trx.status}
                                    </span>
                                </td>
                                <td className={`px-6 py-4 text-right font-bold ${trx.type === 'payment' ? 'text-gray-900' : 'text-green-600'
                                    }`}>
                                    {trx.type === 'payment' ? '-' : '+'}KES {trx.amount.toLocaleString()}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
