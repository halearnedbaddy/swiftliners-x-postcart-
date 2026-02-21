import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/hooks/useAccount";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Search, RefreshCw } from "lucide-react";

const statusClass: Record<string, string> = {
  PENDING: "bg-yellow-500/15 text-yellow-400",
  SUCCESS: "bg-primary/15 text-primary",
  FAILED: "bg-destructive/15 text-red-400",
  HELD: "bg-purple-500/15 text-purple-400",
  RELEASED: "bg-blue-500/15 text-blue-400",
  REFUNDED: "bg-orange-500/15 text-orange-400",
};

const formatKSh = (cents: number) =>
  `KSh ${(cents / 100).toLocaleString("en-KE", { minimumFractionDigits: 0 })}`;

export default function DashboardCollections() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [methodFilter, setMethodFilter] = useState("ALL");
  const { data: account } = useAccount();

  const { data: transactions = [], isLoading, refetch } = useQuery({
    queryKey: ["transactions", account?.id, statusFilter, methodFilter],
    enabled: !!account?.id,
    queryFn: async () => {
      let q = (supabase as any)
        .from("transactions")
        .select("*")
        .eq("account_id", account!.id)
        .order("created_at", { ascending: false })
        .limit(100);
      if (statusFilter !== "ALL") q = q.eq("status", statusFilter);
      if (methodFilter !== "ALL") q = q.eq("payment_method", methodFilter);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  const filtered = transactions.filter(
    (t) =>
      t.id.toLowerCase().includes(search.toLowerCase()) ||
      t.phone.includes(search) ||
      t.description?.toLowerCase().includes(search.toLowerCase())
  );

  const exportCSV = () => {
    const headers = ["ID", "Amount (KSh)", "Phone", "Method", "Status", "Description", "Date"];
    const rows = filtered.map((t) => [
      t.id,
      (t.amount / 100).toFixed(2),
      t.phone,
      t.payment_method,
      t.status,
      t.description,
      new Date(t.created_at).toLocaleString("en-KE"),
    ]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `paychain-collections-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="font-display font-bold text-white text-lg">Collections</h2>
          <p className="text-white/40 text-xs mt-0.5">{filtered.length} transactions</p>
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
            <Download className="w-3 h-3 mr-1.5" /> Export CSV
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
          <Input
            placeholder="Search ID, phone, description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 bg-white/[0.05] border-white/10 text-white text-xs rounded-lg h-9"
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
      <div className="overflow-x-auto rounded-[10px] border border-white/[0.06]">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-white/[0.06] bg-white/[0.02]">
              {["ID", "Amount", "Phone", "Method", "Status", "Description", "Date", "Action"].map((h) => (
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
                  <div className="text-2xl mb-2">📭</div>
                  <div>No transactions yet.</div>
                  <div className="text-white/20 mt-1">Transactions will appear here once you start collecting payments via the API.</div>
                </td>
              </tr>
            ) : (
              filtered.map((txn) => (
                <tr key={txn.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                  <td className="px-3 py-2.5 text-white/30 font-mono text-[10px]">{txn.id}</td>
                  <td className="px-3 py-2.5 text-white/80 font-semibold">{formatKSh(txn.amount)}</td>
                  <td className="px-3 py-2.5 text-white/60">{txn.phone || "—"}</td>
                  <td className="px-3 py-2.5 text-white/60">{txn.payment_method}</td>
                  <td className="px-3 py-2.5">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${statusClass[txn.status] ?? "bg-white/10 text-white/50"}`}>
                      {txn.status}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-white/50 max-w-[160px] truncate">{txn.description || "—"}</td>
                  <td className="px-3 py-2.5 text-white/40 text-[10px] whitespace-nowrap">
                    {new Date(txn.created_at).toLocaleDateString("en-KE")}
                  </td>
                  <td className="px-3 py-2.5">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-[10px] px-2 py-1 h-auto border-white/15 text-white/60 bg-transparent hover:bg-white/[0.05]"
                    >
                      View
                    </Button>
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
