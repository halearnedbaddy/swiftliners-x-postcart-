import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Building2, CreditCard, DollarSign, Clock, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";

const formatKSh = (cents: number) =>
  `KSh ${(cents / 100).toLocaleString("en-KE")}`;

export default function AdminOverview() {
  // Fetch all accounts for stats
  const { data: accounts = [] } = useQuery({
    queryKey: ["admin-accounts"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("accounts")
        .select("id, status, business_name, created_at");
      if (error) throw error;
      return data ?? [];
    },
  });

  // Fetch pending KYC
  const { data: pendingKyc = [] } = useQuery({
    queryKey: ["admin-pending-kyc"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("kyc_documents")
        .select("*, accounts(business_name, email)")
        .eq("status", "PENDING")
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data ?? [];
    },
  });

  // Fetch all transactions for revenue
  const { data: transactions = [] } = useQuery({
    queryKey: ["admin-transactions"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("transactions")
        .select("amount, fee_amount, status, created_at")
        .eq("status", "SUCCESS");
      if (error) throw error;
      return data ?? [];
    },
  });

  // Fetch recent activity
  const { data: recentTxns = [] } = useQuery({
    queryKey: ["admin-recent-transactions"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("transactions")
        .select("*, accounts(business_name)")
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data ?? [];
    },
  });

  // Calculate stats
  const totalBusinesses = accounts.length;
  const approvedBusinesses = accounts.filter((a) => a.status === "APPROVED").length;
  const pendingReviews = pendingKyc.length;
  const totalVolume = transactions.reduce((s, t) => s + t.amount, 0);
  const totalFees = transactions.reduce((s, t) => s + (t.fee_amount ?? 0), 0);

  const stats = [
    { label: "Total Businesses", value: totalBusinesses, sub: `${approvedBusinesses} approved`, icon: Building2, color: "text-blue-400", bg: "bg-blue-500/10" },
    { label: "Pending Reviews", value: pendingReviews, sub: "KYC submissions", icon: Clock, color: "text-yellow-400", bg: "bg-yellow-500/10" },
    { label: "Total Volume", value: formatKSh(totalVolume), sub: `${transactions.length} transactions`, icon: CreditCard, color: "text-primary", bg: "bg-primary/10" },
    { label: "Revenue (Fees)", value: formatKSh(totalFees), sub: "2.5% + KSh 20/txn", icon: DollarSign, color: "text-green-400", bg: "bg-green-500/10" },
  ];

  const statusClass: Record<string, string> = {
    PENDING: "bg-yellow-500/15 text-yellow-400",
    SUCCESS: "bg-primary/15 text-primary",
    FAILED: "bg-destructive/15 text-red-400",
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display font-bold text-xl text-white">Platform Overview</h1>
        <p className="text-white/40 text-sm mt-1">Monitor PayChain platform health and activity</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white/[0.03] border border-white/[0.07] rounded-xl p-5">
            <div className="flex items-start justify-between mb-3">
              <div className={`w-10 h-10 rounded-lg ${stat.bg} flex items-center justify-center`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
            </div>
            <div className="font-display font-bold text-2xl text-white">{stat.value}</div>
            <div className="text-xs text-white/40 mt-1">{stat.sub}</div>
            <div className="text-[10px] text-white/30 mt-0.5">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending KYC Reviews */}
        <div className="bg-white/[0.03] border border-white/[0.07] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-white text-sm">Pending KYC Reviews</h3>
            <Link to="/admin/compliance" className="text-xs text-primary hover:underline">
              View all →
            </Link>
          </div>
          {pendingKyc.length === 0 ? (
            <div className="text-center py-8 text-white/30 text-xs">
              <CheckCircle className="w-8 h-8 mx-auto mb-2 text-primary/40" />
              <div>All caught up! No pending reviews.</div>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingKyc.map((kyc) => (
                <div key={kyc.id} className="flex items-center gap-3 p-3 bg-white/[0.02] rounded-lg">
                  <div className="w-8 h-8 rounded-full bg-yellow-500/10 flex items-center justify-center">
                    <Clock className="w-4 h-4 text-yellow-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white/80 font-medium truncate">
                      {kyc.accounts?.business_name || "Unnamed Business"}
                    </div>
                    <div className="text-[11px] text-white/40">{kyc.accounts?.email}</div>
                  </div>
                  <Link
                    to={`/admin/compliance?review=${kyc.id}`}
                    className="text-[10px] px-2.5 py-1 bg-yellow-400/10 text-yellow-400 rounded-md font-medium hover:bg-yellow-400/20 transition-colors"
                  >
                    Review
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Transactions */}
        <div className="bg-white/[0.03] border border-white/[0.07] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-white text-sm">Recent Transactions</h3>
            <Link to="/admin/transactions" className="text-xs text-primary hover:underline">
              View all →
            </Link>
          </div>
          {recentTxns.length === 0 ? (
            <div className="text-center py-8 text-white/30 text-xs">
              <CreditCard className="w-8 h-8 mx-auto mb-2 text-white/20" />
              <div>No transactions yet.</div>
            </div>
          ) : (
            <div className="space-y-2">
              {recentTxns.slice(0, 6).map((txn) => (
                <div key={txn.id} className="flex items-center gap-3 p-2.5 hover:bg-white/[0.02] rounded-lg transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-white/70 font-medium">{formatKSh(txn.amount)}</span>
                      <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${statusClass[txn.status]}`}>
                        {txn.status}
                      </span>
                    </div>
                    <div className="text-[10px] text-white/30 truncate">
                      {txn.accounts?.business_name} · {txn.phone || "—"}
                    </div>
                  </div>
                  <div className="text-[10px] text-white/25 whitespace-nowrap">
                    {new Date(txn.created_at).toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Account Status Breakdown */}
      <div className="mt-6 bg-white/[0.03] border border-white/[0.07] rounded-xl p-5">
        <h3 className="font-semibold text-white text-sm mb-4">Business Status Breakdown</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { status: "EMAIL_UNVERIFIED", label: "Unverified", color: "text-white/40", bg: "bg-white/5" },
            { status: "EMAIL_VERIFIED", label: "Verified", color: "text-blue-400", bg: "bg-blue-500/10" },
            { status: "PENDING", label: "Pending", color: "text-yellow-400", bg: "bg-yellow-500/10" },
            { status: "APPROVED", label: "Approved", color: "text-primary", bg: "bg-primary/10" },
            { status: "REJECTED", label: "Rejected", color: "text-red-400", bg: "bg-red-500/10" },
            { status: "SUSPENDED", label: "Suspended", color: "text-orange-400", bg: "bg-orange-500/10" },
          ].map((s) => {
            const count = accounts.filter((a) => a.status === s.status).length;
            return (
              <div key={s.status} className={`${s.bg} rounded-lg p-3 text-center`}>
                <div className={`font-display font-bold text-xl ${s.color}`}>{count}</div>
                <div className="text-[10px] text-white/40">{s.label}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
