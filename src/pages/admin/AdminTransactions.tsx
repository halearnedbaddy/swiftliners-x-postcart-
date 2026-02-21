import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, RefreshCw, CreditCard, Download } from "lucide-react";

const formatKSh = (cents: number) =>
  `KSh ${(cents / 100).toLocaleString("en-KE")}`;

const statusClass: Record<string, string> = {
  PENDING: "bg-yellow-500/15 text-yellow-400",
  SUCCESS: "bg-primary/15 text-primary",
  FAILED: "bg-destructive/15 text-red-400",
  HELD: "bg-purple-500/15 text-purple-400",
  RELEASED: "bg-blue-500/15 text-blue-400",
  REFUNDED: "bg-orange-500/15 text-orange-400",
};

export default function AdminTransactions() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [methodFilter, setMethodFilter] = useState("ALL");

  const { data: transactions = [], isLoading, refetch } = useQuery({
    queryKey: ["admin-all-transactions", statusFilter, methodFilter],
    queryFn: async () => {
      let q = (supabase as any)
        .from("transactions")
        .select("*, accounts(business_name, email)")
        .order("created_at", { ascending: false })
        .limit(500);
      if (statusFilter !== "ALL") q = q.eq("status", statusFilter as any);
      if (methodFilter !== "ALL") q = q.eq("payment_method", methodFilter as any);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  const filtered = transactions.filter(
    (t) =>
      t.id.toLowerCase().includes(search.toLowerCase()) ||
      t.phone?.includes(search) ||
      t.accounts?.business_name?.toLowerCase().includes(search.toLowerCase())
  );

  // Calculate totals
  const totalVolume = filtered.filter((t) => t.status === "SUCCESS").reduce((s, t) => s + t.amount, 0);
  const totalFees = filtered.reduce((s, t) => s + (t.fee_amount ?? 0), 0);
  const successCount = filtered.filter((t) => t.status === "SUCCESS").length;
  const failedCount = filtered.filter((t) => t.status === "FAILED").length;

  const exportCSV = () => {
    const headers = ["ID", "Business", "Amount (KSh)", "Phone", "Method", "Status", "Fee", "Date"];
    const rows = filtered.map((t) => [
      t.id,
      t.accounts?.business_name || "—",
      (t.amount / 100).toFixed(2),
      t.phone || "—",
      t.payment_method,
      t.status,
      ((t.fee_amount ?? 0) / 100).toFixed(2),
      new Date(t.created_at).toLocaleString("en-KE"),
    ]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `paychain-admin-transactions-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display font-bold text-xl text-white">All Transactions</h1>
          <p className="text-white/40 text-sm mt-1">{filtered.length} transactions</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            className="text-white/60 text-xs bg-white/[0.05]"
          >
            <RefreshCw className="w-3 h-3 mr-1.5" /> Refresh
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={exportCSV}
            className="text-white/60 text-xs bg-white/[0.05]"
          >
            <Download className="w-3 h-3 mr-1.5" /> Export
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        <div className="bg-white/[0.03] border border-white/[0.07] rounded-lg p-3">
          <div className="text-[10px] text-white/40 uppercase">Total Volume</div>
          <div className="font-display font-bold text-lg text-primary">{formatKSh(totalVolume)}</div>
        </div>
        <div className="bg-white/[0.03] border border-white/[0.07] rounded-lg p-3">
          <div className="text-[10px] text-white/40 uppercase">Fees Collected</div>
          <div className="font-display font-bold text-lg text-green-400">{formatKSh(totalFees)}</div>
        </div>
        <div className="bg-white/[0.03] border border-white/[0.07] rounded-lg p-3">
          <div className="text-[10px] text-white/40 uppercase">Successful</div>
          <div className="font-display font-bold text-lg text-white">{successCount}</div>
        </div>
        <div className="bg-white/[0.03] border border-white/[0.07] rounded-lg p-3">
          <div className="text-[10px] text-white/40 uppercase">Failed</div>
          <div className="font-display font-bold text-lg text-red-400">{failedCount}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-5 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
          <Input
            placeholder="Search by ID, phone, business..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-white/[0.05] border-white/10 text-white text-xs rounded-lg h-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36 bg-white/[0.05] border-white/10 text-white/70 text-xs h-9">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent className="bg-[#0d0d1a] border-white/10 text-white">
            {["ALL", "PENDING", "SUCCESS", "FAILED", "HELD", "RELEASED", "REFUNDED"].map((s) => (
              <SelectItem key={s} value={s} className="text-xs text-white/70 focus:bg-white/[0.08] focus:text-white">
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={methodFilter} onValueChange={setMethodFilter}>
          <SelectTrigger className="w-32 bg-white/[0.05] border-white/10 text-white/70 text-xs h-9">
            <SelectValue placeholder="Method" />
          </SelectTrigger>
          <SelectContent className="bg-[#0d0d1a] border-white/10 text-white">
            {["ALL", "MPESA", "AIRTEL", "CARD"].map((m) => (
              <SelectItem key={m} value={m} className="text-xs text-white/70 focus:bg-white/[0.08] focus:text-white">
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-white/[0.06]">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-white/[0.06] bg-white/[0.02]">
              {["ID", "Business", "Amount", "Phone", "Method", "Status", "Fee", "Date"].map((h) => (
                <th key={h} className="text-left px-3 py-2.5 text-[10px] font-bold tracking-wider uppercase text-white/30">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={8} className="text-center py-12 text-white/30 text-xs">
                  Loading transactions...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-16 text-white/30 text-xs">
                  <CreditCard className="w-8 h-8 mx-auto mb-2 text-white/20" />
                  <div>No transactions found.</div>
                </td>
              </tr>
            ) : (
              filtered.map((txn) => (
                <tr key={txn.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                  <td className="px-3 py-2.5 text-white/30 font-mono text-[10px]">{txn.id}</td>
                  <td className="px-3 py-2.5">
                    <div className="text-white/70 text-[11px]">{txn.accounts?.business_name || "—"}</div>
                  </td>
                  <td className="px-3 py-2.5 text-white/80 font-semibold">{formatKSh(txn.amount)}</td>
                  <td className="px-3 py-2.5 text-white/60">{txn.phone || "—"}</td>
                  <td className="px-3 py-2.5 text-white/60">{txn.payment_method}</td>
                  <td className="px-3 py-2.5">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${statusClass[txn.status]}`}>
                      {txn.status}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-white/40 text-[10px]">
                    {formatKSh(txn.fee_amount ?? 0)}
                  </td>
                  <td className="px-3 py-2.5 text-white/40 text-[10px] whitespace-nowrap">
                    {new Date(txn.created_at).toLocaleDateString("en-KE")}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
