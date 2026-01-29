import { useState, useEffect } from 'react';
import { Search, RefreshCw, ExternalLink, Loader, CheckCircle, XCircle, Clock, Instagram, Facebook, Linkedin } from 'lucide-react';
import { api } from '@/services/api';

interface SocialAccount {
  id: string;
  platform: 'INSTAGRAM' | 'FACEBOOK' | 'LINKEDIN';
  pageUrl: string;
  pageId?: string;
  status: 'PENDING' | 'ACTIVE' | 'ERROR' | 'DISCONNECTED';
  lastSyncAt?: string;
  syncError?: string;
  store: {
    id: string;
    name: string;
    slug: string;
  };
  productCount: number;
  createdAt: string;
}

interface SyncLog {
  id: string;
  socialAccountId: string;
  status: 'SUCCESS' | 'FAILED' | 'PARTIAL';
  productsFound: number;
  productsImported: number;
  error?: string;
  startedAt: string;
  completedAt?: string;
}

export function AdminSocial() {
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'accounts' | 'logs'>('accounts');
  const [rescanLoading, setRescanLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [accountsRes, logsRes] = await Promise.all([
        api.adminListSocialAccounts(),
        api.adminListSyncLogs()
      ]);

      if (accountsRes.success && accountsRes.data) {
        setAccounts(accountsRes.data as SocialAccount[]);
      }
      if (logsRes.success && logsRes.data) {
        setSyncLogs(logsRes.data as SyncLog[]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleRescan = async (accountId: string) => {
    setRescanLoading(accountId);
    try {
      await api.request(`/api/v1/admin/social/${accountId}/rescan`, { method: 'POST' });
      await fetchData();
    } catch (err) {
      console.error('Failed to rescan:', err);
    } finally {
      setRescanLoading(null);
    }
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'INSTAGRAM': return <Instagram className="text-pink-600" size={20} />;
      case 'FACEBOOK': return <Facebook className="text-blue-600" size={20} />;
      case 'LINKEDIN': return <Linkedin className="text-blue-700" size={20} />;
      default: return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <span className="flex items-center gap-1 px-2 py-1 bg-[#5d2ba3]/10 text-[#5d2ba3] rounded-null-full text-xs font-bold"><CheckCircle size={12} /> Active</span>;
      case 'PENDING':
        return <span className="flex items-center gap-1 px-2 py-1 bg-[#4F4A41]/10 text-[#4F4A41] rounded-null-full text-xs font-bold"><Clock size={12} /> Pending</span>;
      case 'ERROR':
        return <span className="flex items-center gap-1 px-2 py-1 bg-[#4F4A41]/10 text-[#4F4A41] rounded-null-full text-xs font-bold"><XCircle size={12} /> Error</span>;
      case 'DISCONNECTED':
        return <span className="flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded-null-full text-xs font-bold"><XCircle size={12} /> Disconnected</span>;
      default:
        return <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-null-full text-xs font-bold">{status}</span>;
    }
  };

  const filteredAccounts = accounts.filter(account =>
    account.pageUrl.toLowerCase().includes(searchTerm.toLowerCase()) ||
    account.store.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    account.platform.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader size={32} className="animate-spin text-[#5d2ba3]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-null p-6 text-red-700">
        <p className="font-bold">Failed to load social accounts</p>
        <p className="text-sm">{error}</p>
        <button
          onClick={fetchData}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-null text-sm font-semibold hover:bg-red-700 transition"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-[#3d1a7a]">Social Pages Management</h2>
          <p className="text-sm text-gray-500">Monitor connected social accounts and sync logs</p>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-null text-sm font-semibold hover:bg-gray-200 transition"
        >
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-null border border-gray-200 shadow-sm overflow-hidden">
        <div className="border-b border-gray-200">
          <nav className="flex gap-6 px-6">
            <button
              onClick={() => setActiveTab('accounts')}
              className={`py-4 text-sm font-bold border-b-2 transition ${activeTab === 'accounts' ? 'border-[#5d2ba3] text-[#5d2ba3]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              Connected Accounts ({accounts.length})
            </button>
            <button
              onClick={() => setActiveTab('logs')}
              className={`py-4 text-sm font-bold border-b-2 transition ${activeTab === 'logs' ? 'border-[#5d2ba3] text-[#5d2ba3]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              Sync Logs ({syncLogs.length})
            </button>
          </nav>
        </div>

        {activeTab === 'accounts' && (
          <>
            {/* Search */}
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="Search by URL, store, or platform..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-null focus:outline-none focus:border-[#3d1a7a] text-sm"
                />
              </div>
            </div>

            {/* Accounts Table */}
            <table className="w-full text-left">
              <thead className="bg-white text-gray-500 text-xs uppercase font-semibold border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4">Platform</th>
                  <th className="px-6 py-4">Store</th>
                  <th className="px-6 py-4">Page URL</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Products</th>
                  <th className="px-6 py-4">Last Sync</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredAccounts.length > 0 ? (
                  filteredAccounts.map((account) => (
                    <tr key={account.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {getPlatformIcon(account.platform)}
                          <span className="font-medium text-gray-900">{account.platform}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-semibold text-gray-900">{account.store.name}</p>
                          <p className="text-xs text-gray-500">/{account.store.slug}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <a
                          href={account.pageUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline text-sm flex items-center gap-1"
                        >
                          {account.pageUrl.length > 30 ? account.pageUrl.substring(0, 30) + '...' : account.pageUrl}
                          <ExternalLink size={12} />
                        </a>
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(account.status)}
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                        {account.productCount}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {account.lastSyncAt ? new Date(account.lastSyncAt).toLocaleString() : 'Never'}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleRescan(account.id)}
                          disabled={rescanLoading === account.id}
                          className="px-3 py-2 bg-gray-100 text-gray-700 rounded-null text-sm font-medium hover:bg-gray-200 transition disabled:opacity-50 flex items-center gap-1 ml-auto"
                        >
                          {rescanLoading === account.id ? (
                            <Loader size={14} className="animate-spin" />
                          ) : (
                            <RefreshCw size={14} />
                          )}
                          Rescan
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                      No social accounts found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </>
        )}

        {activeTab === 'logs' && (
          <div className="p-6">
            {syncLogs.length > 0 ? (
              <div className="space-y-4">
                {syncLogs.map((log) => (
                  <div
                    key={log.id}
                    className={`p-4 rounded-null border ${
                      log.status === 'SUCCESS' ? 'bg-[#5d2ba3]/10 border-[#5d2ba3]/20' :
                      log.status === 'FAILED' ? 'bg-[#4F4A41]/10 border-[#4F4A41]/20' :
                      'bg-[#4F4A41]/10 border-[#4F4A41]/20'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {log.status === 'SUCCESS' && <CheckCircle className="text-[#5d2ba3]" size={20} />}
                        {log.status === 'FAILED' && <XCircle className="text-[#4F4A41]" size={20} />}
                        {log.status === 'PARTIAL' && <Clock className="text-[#4F4A41]" size={20} />}
                        <div>
                          <p className="font-semibold text-gray-900">
                            Sync {log.status.toLowerCase()}
                          </p>
                          <p className="text-sm text-gray-600">
                            Found {log.productsFound} products, imported {log.productsImported}
                          </p>
                        </div>
                      </div>
                      <div className="text-right text-sm text-gray-500">
                        <p>{new Date(log.startedAt).toLocaleString()}</p>
                        {log.completedAt && (
                          <p className="text-xs">
                            Duration: {Math.round((new Date(log.completedAt).getTime() - new Date(log.startedAt).getTime()) / 1000)}s
                          </p>
                        )}
                      </div>
                    </div>
                    {log.error && (
                      <p className="mt-2 text-sm text-red-600 bg-red-100 p-2 rounded-null">{log.error}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <Clock className="mx-auto mb-4 text-gray-300" size={48} />
                <p className="font-semibold">No sync logs yet</p>
                <p className="text-sm">Sync logs will appear here when social pages are scanned</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
