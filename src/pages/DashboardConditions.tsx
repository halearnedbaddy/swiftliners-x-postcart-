import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/hooks/useAccount";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Plus, Trash2, Star } from "lucide-react";

const typeLabels: Record<string, string> = {
  CLIENT_APPROVAL: "Client Approval",
  DELIVERY_CONFIRM: "Delivery Confirmation",
  TIMER: "Timer",
  CUSTOM: "Custom",
};

const typeIcons: Record<string, string> = {
  CLIENT_APPROVAL: "👤",
  DELIVERY_CONFIRM: "📦",
  TIMER: "⏱️",
  CUSTOM: "⚙️",
};

export default function DashboardConditions() {
  const { data: account } = useAccount();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<"CLIENT_APPROVAL" | "DELIVERY_CONFIRM" | "TIMER" | "CUSTOM">("CLIENT_APPROVAL");
  const [isDefault, setIsDefault] = useState(false);

  const { data: conditions = [], isLoading } = useQuery({
    queryKey: ["conditions", account?.id],
    enabled: !!account?.id,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("conditions")
        .select("*")
        .eq("account_id", account!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error("Name is required");
      const { error } = await (supabase as any).from("conditions").insert({
        account_id: account!.id,
        name: name.trim(),
        type,
        is_default: isDefault,
        config: {},
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Condition created" });
      setName("");
      setIsDefault(false);
      setShowForm(false);
      queryClient.invalidateQueries({ queryKey: ["conditions"] });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("conditions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Condition deleted" });
      queryClient.invalidateQueries({ queryKey: ["conditions"] });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="font-display font-bold text-white text-lg">Release Conditions</h2>
          <p className="text-white/40 text-xs mt-0.5">Define rules that control when escrow funds are released</p>
        </div>
        <Button
          size="sm"
          onClick={() => setShowForm(!showForm)}
          className="bg-primary text-primary-foreground text-xs"
        >
          <Plus className="w-3 h-3 mr-1.5" /> New Condition
        </Button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="bg-white/[0.03] border border-white/[0.08] rounded-[10px] p-4 mb-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
            <div className="sm:col-span-1">
              <Label className="text-[11px] text-white/50 mb-1.5 block">Condition Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Buyer Approval"
                className="bg-white/[0.05] border-white/10 text-white text-xs rounded-lg"
              />
            </div>
            <div>
              <Label className="text-[11px] text-white/50 mb-1.5 block">Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
                <SelectTrigger className="bg-white/[0.05] border-white/10 text-white/70 text-xs h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#0d0d1a] border-white/10 text-white">
                  {Object.entries(typeLabels).map(([k, v]) => (
                    <SelectItem key={k} value={k} className="text-xs text-white/70 focus:bg-white/[0.08] focus:text-white">
                      {typeIcons[k]} {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer pb-1">
                <input
                  type="checkbox"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                  className="w-3.5 h-3.5 accent-primary"
                />
                <span className="text-[11px] text-white/50">Set as default</span>
              </label>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => createMutation.mutate()} disabled={createMutation.isPending} className="bg-primary text-primary-foreground text-xs">
              {createMutation.isPending ? "Saving..." : "Save Condition"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowForm(false)} className="text-white/60 text-xs bg-white/[0.05]">
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* List */}
      {isLoading ? (
        <div className="text-center py-16 text-white/30 text-xs">Loading conditions...</div>
      ) : conditions.length === 0 ? (
        <div className="text-center py-16 text-white/30 text-xs">
          <div className="text-3xl mb-3">⚙️</div>
          <div className="font-semibold text-white/50">No conditions yet</div>
          <div className="mt-1 text-white/25">Create conditions to control when escrow funds are released.</div>
        </div>
      ) : (
        <div className="space-y-2.5">
          {conditions.map((cond) => (
            <div key={cond.id} className="bg-white/[0.03] border border-white/[0.07] rounded-[10px] p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-white/[0.06] flex items-center justify-center text-lg shrink-0">
                {typeIcons[cond.type]}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-white/80 font-semibold text-sm">{cond.name}</span>
                  {cond.is_default && (
                    <span className="flex items-center gap-0.5 text-[9px] font-bold text-yellow-400 bg-yellow-400/10 px-1.5 py-0.5 rounded-full">
                      <Star className="w-2.5 h-2.5" /> DEFAULT
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-white/30 mt-0.5">
                  {typeLabels[cond.type]} · Created {new Date(cond.created_at).toLocaleDateString("en-KE")}
                </div>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => deleteMutation.mutate(cond.id)}
                disabled={deleteMutation.isPending}
                className="text-red-400/60 hover:text-red-400 hover:bg-red-400/10 h-7 w-7 p-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
