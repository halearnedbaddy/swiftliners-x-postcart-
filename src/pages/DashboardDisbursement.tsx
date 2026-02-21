import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/hooks/useAccount";
import { Button } from "@/components/ui/button";
import { Download, RefreshCw } from "lucide-react";

const formatKSh = (cents: number) =>
  `KSh ${(cents / 100).toLocaleString("en-KE")}`;

const statusClass: Record<string, string> = {
  PENDING: "bg-yellow-500/15 text-yellow-400",
  PROCESSING: "bg-blue-500/15 text-blue-400",
  COMPLETED: "bg-primary/15 text-primary",
  FAILED: "bg-destructive/15 text-red-400",
};

export default function DashboardDisbursement() {
  const { data: account } = useAccount();

  const { data: disbursements = [], isLoading, refetch } = useQuery({
    queryKey: ["disbursements", account?.id],
    enabled: !!account?.id,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("disbursements")
        .select("*")
        .eq("account_id", account!.id)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });

  const totals = {
    completed: disbursements.filter((d) => d.status === "COMPLETED").reduce((s, d) => s + d.amount, 0),
    pending: disbursements.filter((d) => d.status === "PENDING" || d.status === "PROCESSING").reduce((s, d) => s + d.amount, 0),
    failed: disbursements.filter((d) => d.status === "FAILED").length,
  };

  const exportCSV = () => {
    const headers = ["ID", "Amount (KSh)", "Recipient Phone", "Recipient Name", "Status", "Notes", "Date"];
    const rows = disbursements.map((d) => [
      d.id,
      (d.amount / 100).toFixed(2),
      d.recipient_phone,
      d.recipient_name,
      d.status,
      d.notes,
      new Date(d.created_at).toLocaleString("en-KE"),
    ]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `paychain-disbursements-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="font-display font-bold text-white text-lg">Disbursements</h2>
          <p className="text-white/40 text-xs mt-0.5">{disbursements.length} payout records</p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => refetch()} className="text-white/60 text-xs bg-white/[0.05]">
            <RefreshCw className="w-3 h-3 mr-1.5" /> Refresh
          </Button>
          <Button variant="ghost" size="sm" onClick={exportCSV} className="text-white/60 text-xs bg-white/[0.05]">
            <Download className="w-3 h-3 mr-1.5" /> Export CSV
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-white/[0.04] border border-white/[0.07] rounded-[10px] p-4">
          <div className="text-[10px] text-white/40 mb-1">Total Disbursed</div>
          <div className="font-display font-bold text-white text-lg">{formatKSh(totals.completed)}</div>
          <div className="text-[10px] text-primary mt-0.5">Completed payouts</div>
        </div>
        <div className="bg-white/[0.04] border border-white/[0.07] rounded-[10px] p-4">
          <div className="text-[10px] text-white/40 mb-1">Processing</div>
          <div className="font-display font-bold text-white text-lg">{formatKSh(totals.pending)}</div>
          <div className="text-[10px] text-yellow-400 mt-0.5">In queue</div>
        </div>
        <div className="bg-white/[0.04] border border-white/[0.07] rounded-[10px] p-4">
          <div className="text-[10px] text-white/40 mb-1">Failed</div>
          <div className="font-display font-bold text-white text-lg">{totals.failed}</div>
          <div className="text-[10px] text-red-400 mt-0.5">Need attention</div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-[10px] border border-white/[0.06]">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-white/[0.06] bg-white/[0.02]">
              {["ID", "Amount", "Recipient", "Phone", "Status", "Notes", "Date"].map((h) => (
                <th key={h} className="text-left px-3 py-2.5 text-[10px] font-bold tracking-wider uppercase text-white/30">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={7} className="text-center py-12 text-white/30 text-xs">Loading disbursements...</td></tr>
            ) : disbursements.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-16 text-white/30 text-xs">
                  <div className="text-2xl mb-2">💸</div>
                  <div>No disbursements yet.</div>
                  <div className="text-white/20 mt-1">Use the /disburse API to send payouts.</div>
                </td>
              </tr>
            ) : disbursements.map((d) => (
              <tr key={d.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                <td className="px-3 py-2.5 text-white/30 font-mono text-[10px]">{d.id}</td>
                <td className="px-3 py-2.5 text-white/80 font-semibold">{formatKSh(d.amount)}</td>
                <td className="px-3 py-2.5 text-white/60">{d.recipient_name || "—"}</td>
                <td className="px-3 py-2.5 text-white/60">{d.recipient_phone || "—"}</td>
                <td className="px-3 py-2.5">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${statusClass[d.status]}`}>{d.status}</span>
                </td>
                <td className="px-3 py-2.5 text-white/40 max-w-[140px] truncate">{d.notes || "—"}</td>
                <td className="px-3 py-2.5 text-white/40 text-[10px] whitespace-nowrap">{new Date(d.created_at).toLocaleDateString("en-KE")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
