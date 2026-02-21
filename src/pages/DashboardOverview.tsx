import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/hooks/useAccount";
import { ArrowUp, ArrowDown, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

const formatKSh = (cents: number) =>
  `KSh ${(cents / 100).toLocaleString("en-KE")}`;

const DashboardOverview = () => {
  const { data: account } = useAccount();
  const queryClient = useQueryClient();

  const { data: transactions = [], isLoading: txLoading, refetch } = useQuery({
    queryKey: ["overview-transactions", account?.id],
    enabled: !!account?.id,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("transactions")
        .select("*")
        .eq("account_id", account!.id)
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: holds = [] } = useQuery({
    queryKey: ["overview-holds", account?.id],
    enabled: !!account?.id,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("holds")
        .select("amount, status")
        .eq("account_id", account!.id)
        .eq("status", "ACTIVE");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: disbursements = [] } = useQuery({
    queryKey: ["overview-disbursements", account?.id],
    enabled: !!account?.id,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("disbursements")
        .select("amount, status")
        .eq("account_id", account!.id)
        .eq("status", "COMPLETED");
      if (error) throw error;
      return data ?? [];
    },
  });

  const totalCollected = transactions.filter((t) => t.status === "SUCCESS").reduce((s, t) => s + t.amount, 0);
  const totalEscrow = holds.reduce((s, h) => s + h.amount, 0);
  const totalDisbursed = disbursements.reduce((s, d) => s + d.amount, 0);
  const failedCount = transactions.filter((t) => t.status === "FAILED").length;

  const metrics = [
    { label: "Total Collected", value: formatKSh(totalCollected), sub: `${transactions.filter((t) => t.status === "SUCCESS").length} transactions`, up: true },
    { label: "Funds in Escrow", value: formatKSh(totalEscrow), sub: `${holds.length} active holds`, color: "text-purple-400" },
    { label: "Disbursed", value: formatKSh(totalDisbursed), sub: `${disbursements.length} payouts`, up: true },
    { label: "Failed Txns", value: String(failedCount), sub: "Review needed", up: false },
  ];

  const retryMutation = useMutation({
    mutationFn: async (txnId: string) => {
      // In production this would trigger re-processing via API
      await (supabase as any).from("transactions").update({ status: "PENDING" }).eq("id", txnId);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["overview-transactions"] }),
  });

  const statusClass: Record<string, string> = {
    PENDING: "bg-yellow-500/15 text-yellow-400",
    SUCCESS: "bg-primary/15 text-primary",
    FAILED: "bg-destructive/15 text-red-400",
    HELD: "bg-purple-500/15 text-purple-400",
    RELEASED: "bg-blue-500/15 text-blue-400",
    REFUNDED: "bg-orange-500/15 text-orange-400",
  };

  return (
    <div>
      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {metrics.map((m) => (
          <div key={m.label} className="bg-white/[0.04] border border-white/[0.07] rounded-[10px] p-4">
            <div className="text-[10px] text-white/40 mb-1.5 font-medium">{m.label}</div>
            <div className="font-display text-xl font-extrabold text-white">{m.value}</div>
            <div className={`text-[10px] mt-1 ${m.color || (m.up ? "text-primary" : "text-red-400")}`}>
              {m.sub}
            </div>
          </div>
        ))}
      </div>

      {/* Table Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-bold text-white/60 uppercase tracking-wider">Recent Transactions</span>
        <Button variant="ghost" size="sm" onClick={() => refetch()} className="text-white/60 text-xs bg-white/[0.05] hover:bg-white/[0.08]">
          <RefreshCw className="w-3 h-3 mr-1.5" /> Refresh
        </Button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-white/[0.06]">
              {["ID", "Amount", "Phone", "Method", "Status", "Action"].map((h) => (
                <th key={h} className="text-left px-3 py-2 text-[10px] font-bold tracking-wider uppercase text-white/30">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {txLoading ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-white/30 text-xs">Loading transactions...</td>
              </tr>
            ) : transactions.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-16 text-white/30 text-xs">
                  <div className="text-2xl mb-2">📭</div>
                  <div>No transactions yet.</div>
                  <div className="text-white/20 mt-1">Use the Collections API to start accepting payments.</div>
                </td>
              </tr>
            ) : transactions.map((txn) => (
              <tr key={txn.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                <td className="px-3 py-2.5 text-white/30 font-mono text-[10px]">{txn.id}</td>
                <td className="px-3 py-2.5 text-white/70">{formatKSh(txn.amount)}</td>
                <td className="px-3 py-2.5 text-white/70">{txn.phone || "—"}</td>
                <td className="px-3 py-2.5 text-white/70">{txn.payment_method}</td>
                <td className="px-3 py-2.5">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${statusClass[txn.status] ?? "bg-white/10 text-white/50"}`}>
                    {txn.status}
                  </span>
                </td>
                <td className="px-3 py-2.5">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => txn.status === "FAILED" ? retryMutation.mutate(txn.id) : undefined}
                    className={`text-[11px] px-2.5 py-1 h-auto border-white/15 text-white/70 bg-transparent hover:bg-white/[0.05] ${
                      txn.status === "FAILED" ? "border-yellow-400/30 text-yellow-400 bg-yellow-400/10" : ""
                    }`}
                  >
                    {txn.status === "FAILED" ? "Retry" : "View"}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DashboardOverview;
