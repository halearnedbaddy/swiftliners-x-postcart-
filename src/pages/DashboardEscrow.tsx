import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/hooks/useAccount";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { RefreshCw, Lock, Unlock, X } from "lucide-react";

const formatKSh = (cents: number) =>
  `KSh ${(cents / 100).toLocaleString("en-KE")}`;

const holdStatusClass: Record<string, string> = {
  ACTIVE: "bg-purple-500/15 text-purple-400",
  RELEASED: "bg-primary/15 text-primary",
  CANCELLED: "bg-destructive/15 text-red-400",
  EXPIRED: "bg-white/10 text-white/40",
};

export default function DashboardEscrow() {
  const { data: account } = useAccount();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<"ALL" | "ACTIVE" | "RELEASED" | "CANCELLED">("ACTIVE");

  const { data: holds = [], isLoading, refetch } = useQuery({
    queryKey: ["holds", account?.id, filter],
    enabled: !!account?.id,
    queryFn: async () => {
      let q = (supabase as any)
        .from("holds")
        .select("*, transactions(phone, payment_method, description)")
        .eq("account_id", account!.id)
        .order("created_at", { ascending: false });
      if (filter !== "ALL") q = q.eq("status", filter);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  const releaseMutation = useMutation({
    mutationFn: async (holdId: string) => {
      const { error } = await (supabase as any)
        .from("holds")
        .update({ status: "RELEASED", released_at: new Date().toISOString() })
        .eq("id", holdId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Hold Released", description: "Funds have been released successfully." });
      queryClient.invalidateQueries({ queryKey: ["holds"] });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const cancelMutation = useMutation({
    mutationFn: async (holdId: string) => {
      const { error } = await (supabase as any)
        .from("holds")
        .update({ status: "CANCELLED", cancelled_at: new Date().toISOString(), cancel_reason: "Manual cancellation" })
        .eq("id", holdId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Hold Cancelled", description: "The hold has been cancelled." });
      queryClient.invalidateQueries({ queryKey: ["holds"] });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const totalHeld = holds.filter((h) => h.status === "ACTIVE").reduce((s, h) => s + h.amount, 0);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="font-display font-bold text-white text-lg">Escrow / Hold</h2>
          <p className="text-white/40 text-xs mt-0.5">
            {holds.filter((h) => h.status === "ACTIVE").length} active holds · {formatKSh(totalHeld)} locked
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => refetch()} className="text-white/60 text-xs bg-white/[0.05]">
          <RefreshCw className="w-3 h-3 mr-1.5" /> Refresh
        </Button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1.5 mb-4">
        {(["ALL", "ACTIVE", "RELEASED", "CANCELLED"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-colors ${
              filter === s ? "bg-[rgba(108,71,255,0.25)] text-[#a78bfa]" : "bg-white/[0.04] text-white/40 hover:text-white/60"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Cards */}
      {isLoading ? (
        <div className="text-center py-16 text-white/30 text-xs">Loading holds...</div>
      ) : holds.length === 0 ? (
        <div className="text-center py-16 text-white/30 text-xs">
          <div className="text-3xl mb-3">🔒</div>
          <div className="font-semibold text-white/50">No holds found</div>
          <div className="mt-1 text-white/25">Use the /hold API to place funds in escrow.</div>
        </div>
      ) : (
        <div className="space-y-3">
          {holds.map((hold) => (
            <div key={hold.id} className="bg-white/[0.03] border border-white/[0.07] rounded-[10px] p-4 flex items-center gap-4">
              <div className="w-9 h-9 rounded-full bg-purple-500/20 flex items-center justify-center shrink-0">
                <Lock className="w-4 h-4 text-purple-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-mono text-[11px] text-white/40">{hold.id}</span>
                  <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${holdStatusClass[hold.status]}`}>
                    {hold.status}
                  </span>
                </div>
                <div className="font-display font-bold text-white text-base">{formatKSh(hold.amount)}</div>
                <div className="flex items-center gap-3 mt-0.5 text-[10px] text-white/30">
                  <span>{hold.condition_type?.replace("_", " ")}</span>
                  {hold.expiry_at && (
                    <span>Expires {new Date(hold.expiry_at).toLocaleDateString("en-KE")}</span>
                  )}
                  <span>Created {new Date(hold.created_at).toLocaleDateString("en-KE")}</span>
                </div>
              </div>
              {hold.status === "ACTIVE" && (
                <div className="flex gap-2 shrink-0">
                  <Button
                    size="sm"
                    onClick={() => releaseMutation.mutate(hold.id)}
                    disabled={releaseMutation.isPending}
                    className="bg-primary/20 text-primary border border-primary/30 text-[10px] h-7 px-2.5 hover:bg-primary/30"
                  >
                    <Unlock className="w-3 h-3 mr-1" /> Release
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => cancelMutation.mutate(hold.id)}
                    disabled={cancelMutation.isPending}
                    className="bg-destructive/20 text-red-400 border border-destructive/30 text-[10px] h-7 px-2.5 hover:bg-destructive/30"
                  >
                    <X className="w-3 h-3 mr-1" /> Cancel
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
