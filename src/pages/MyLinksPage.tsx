import { useState, useEffect } from 'react';
import { api } from '@/services/api';
import { 
    Copy, ExternalLink, Trash2, Clock, CheckCircle, 
    MoreVertical, Search
} from 'lucide-react';
import StatusBadge from '@/components/StatusBadge';

export function MyLinksPage() {
    const [links, setLinks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('ALL');
    const [search, setSearch] = useState('');
    const [copiedId, setCopiedId] = useState<string | null>(null);

    const fetchLinks = async () => {
        setLoading(true);
        try {
            const res = await api.getMyPaymentLinks({ 
                status: filter !== 'ALL' ? filter : undefined 
            });
            if (res.success && res.data) {
                setLinks(res.data as any[]);
            }
        } catch (error) {
            console.error('Failed to fetch links:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLinks();
    }, [filter]);

    const handleCopy = (linkUrl: string, id: string) => {
        navigator.clipboard.writeText(linkUrl);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const handleStatusUpdate = async (linkId: string, newStatus: string) => {
        if (!confirm(`Are you sure you want to mark this link as ${newStatus.toLowerCase()}?`)) return;
        
        const res = await api.updatePaymentLinkStatus(linkId, newStatus);
        if (res.success) {
            fetchLinks();
        }
    };

    const filteredLinks = links.filter(link => 
        link.productName.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h2 className="text-2xl font-bold text-[#3d1a7a]">My Payment Links</h2>
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input 
                            type="text" 
                            placeholder="Search links..."
                            className="pl-10 pr-4 py-2 rounded-null-lg border border-gray-200 focus:outline-none focus:border-primary w-full md:w-64"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="flex gap-2 overflow-x-auto pb-2">
                {['ALL', 'ACTIVE', 'SOLD_OUT', 'EXPIRED'].map((f) => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-4 py-2 rounded-null-full text-sm font-semibold whitespace-nowrap transition ${
                            filter === f 
                            ? 'bg-[#3d1a7a] text-white' 
                            : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                        }`}
                    >
                        {f.replace('_', ' ')}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="py-12 text-center text-gray-500">Loading your links...</div>
            ) : filteredLinks.length === 0 ? (
                <div className="bg-white rounded-null-xl border border-gray-200 p-12 text-center">
                    <div className="w-16 h-16 bg-gray-100 rounded-null-full flex items-center justify-center mx-auto mb-4">
                        <ExternalLink className="text-gray-400" size={32} />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900">No links found</h3>
                    <p className="text-gray-500 mt-1">Create your first payment link to start selling.</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {filteredLinks.map((link) => (
                        <div key={link.id} className="bg-white rounded-null-xl border border-gray-200 p-4 md:p-6 hover:shadow-md transition">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="flex items-start gap-4">
                                    {link.images && link.images.length > 0 ? (
                                        <img src={link.images[0]} alt="" className="w-16 h-16 object-cover rounded-null-lg" />
                                    ) : (
                                        <div className="w-16 h-16 bg-gray-100 rounded-null-lg flex items-center justify-center">
                                            <Clock className="text-gray-400" size={24} />
                                        </div>
                                    )}
                                    <div>
                                        <h3 className="font-bold text-gray-900">{link.productName}</h3>
                                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                                            <p className="text-xs text-gray-500">Created {new Date(link.createdAt).toLocaleDateString()}</p>
                                            {link.expiryDate && link.status === 'ACTIVE' && (
                                                <p className="text-xs font-bold text-amber-600 flex items-center gap-1">
                                                    <Clock size={12} />
                                                    Expires {new Date(link.expiryDate).toLocaleString()}
                                                </p>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-3 mt-2">
                                            <span className="text-[#3d1a7a] font-bold">KES {Number(link.price).toLocaleString()}</span>
                                            <StatusBadge status={link.status} size="sm" />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-3">
                                    <div className="flex items-center gap-4 px-4 py-2 bg-gray-50 rounded-null-lg border border-gray-100 mr-2">
                                        <div className="text-center">
                                            <p className="text-[10px] text-gray-500 uppercase font-bold">Clicks</p>
                                            <p className="font-bold text-gray-900">{link.clicks}</p>
                                        </div>
                                        <div className="w-px h-8 bg-gray-200"></div>
                                        <div className="text-center">
                                            <p className="text-[10px] text-gray-500 uppercase font-bold">Sales</p>
                                            <p className="font-bold text-gray-900">{link.purchases}</p>
                                        </div>
                                        <div className="w-px h-8 bg-gray-200"></div>
                                        <div className="text-center">
                                            <p className="text-[10px] text-gray-500 uppercase font-bold">Revenue</p>
                                            <p className="font-bold text-[#3d1a7a]">KES {Number(link.revenue).toLocaleString()}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <button 
                                            onClick={() => handleCopy(`${window.location.origin}/buy/${link.id}`, link.id)}
                                            className={`flex items-center gap-2 px-4 py-2 rounded-null-lg font-bold text-sm transition ${
                                                copiedId === link.id 
                                                ? 'bg-green-500 text-white' 
                                                : 'bg-[#3d1a7a] text-white hover:bg-[#250e52]'
                                            }`}
                                        >
                                            {copiedId === link.id ? <CheckCircle size={16} /> : <Copy size={16} />}
                                            {copiedId === link.id ? 'Copied!' : 'Copy Link'}
                                        </button>
                                        
                                        <div className="relative group">
                                            <button className="p-2 hover:bg-gray-100 rounded-null-lg transition border border-gray-200">
                                                <MoreVertical size={20} />
                                            </button>
                                            <div className="absolute right-0 bottom-full mb-2 w-48 bg-white rounded-null-lg shadow-xl border border-gray-200 py-2 hidden group-hover:block z-10">
                                                <button 
                                                    onClick={() => window.open(`/buy/${link.id}`, '_blank')}
                                                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                                >
                                                    <ExternalLink size={14} /> Preview Link
                                                </button>
                                                {link.status === 'ACTIVE' && (
                                                    <button 
                                                        onClick={() => handleStatusUpdate(link.id, 'DELETED')}
                                                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                                    >
                                                        <Trash2 size={14} /> Deactivate Link
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
