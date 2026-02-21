import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/hooks/useAccount";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Copy, RefreshCw } from "lucide-react";

const DashboardSettings = () => {
  const { data: account, isLoading } = useAccount();
  const queryClient = useQueryClient();

  const [callbackUrl, setCallbackUrl] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [minPayout, setMinPayout] = useState("100");
  const [payoutPhone, setPayoutPhone] = useState("");

  useEffect(() => {
    if (account) {
      setCallbackUrl(account.webhook_url ?? "");
      setWebhookUrl(account.webhook_url ?? "");
      setMinPayout("100");
      setPayoutPhone("");
    }
  }, [account]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!account) throw new Error("No account");
      const { error } = await supabase
        .from("accounts")
        .update({
          webhook_url: webhookUrl,
        })
        .eq("id", account.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Settings saved" });
      queryClient.invalidateQueries({ queryKey: ["account"] });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const regenSandboxKey = useMutation({
    mutationFn: async () => {
      if (!account) throw new Error("No account");
      const newKey = "sk_test_kzh_" + crypto.randomUUID().replace(/-/g, "").slice(0, 16);
      const { error } = await supabase
        .from("accounts")
        .update({ sandbox_api_key: newKey })
        .eq("id", account.id);
      if (error) throw error;
      return newKey;
    },
    onSuccess: () => {
      toast({ title: "Sandbox key regenerated" });
      queryClient.invalidateQueries({ queryKey: ["account"] });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => toast({ title: `${label} copied` }));
  };

  if (isLoading) {
    return <div className="text-center py-16 text-white/30 text-xs">Loading settings...</div>;
  }

  const sandboxKey = account?.sandbox_api_key || "sk_test_kzh_—not generated—";
  const liveKeyMasked = account?.api_key_last_four
    ? `sk_live_kzh_••••••••••••${account.api_key_last_four}`
    : "sk_live_kzh_••••••••••••••••";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* API Credentials */}
      <div>
        <h3 className="text-[11px] font-bold text-white/30 tracking-[2px] uppercase mb-4">API Credentials</h3>

        {/* Sandbox Key */}
        <div className="bg-white/[0.03] border border-white/[0.08] rounded-[10px] p-4 mb-3">
          <div className="text-[11px] font-semibold text-white/40 tracking-wider uppercase mb-2">Sandbox Key</div>
          <div className="flex items-center justify-between bg-black/30 rounded-md px-3 py-2.5 mb-3 font-mono text-[11px] text-white">
            <span className="truncate mr-2">{sandboxKey}</span>
            <Button variant="ghost" size="sm" onClick={() => copyToClipboard(sandboxKey, "Sandbox key")} className="text-white/60 text-xs bg-white/[0.05] h-auto py-1 shrink-0">
              <Copy className="w-3 h-3 mr-1" /> Copy
            </Button>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => regenSandboxKey.mutate()}
            disabled={regenSandboxKey.isPending}
            className="text-red-400 text-xs bg-red-400/10 border border-red-400/20"
          >
            <RefreshCw className="w-3 h-3 mr-1.5" /> {regenSandboxKey.isPending ? "Regenerating..." : "Regenerate"}
          </Button>
        </div>

        {/* Live Key */}
        <div className="bg-white/[0.03] border border-white/[0.08] rounded-[10px] p-4">
          <div className="text-[11px] font-semibold text-white/40 tracking-wider uppercase mb-2">
            Live Key{" "}
            {account?.status === "APPROVED" ? (
              <span className="text-primary">● Active</span>
            ) : (
              <span className="text-yellow-400">● Pending KYC</span>
            )}
          </div>
          <div className="flex items-center justify-between bg-black/30 rounded-md px-3 py-2.5 mb-3 font-mono text-[13px]">
            <span className="text-white/20 tracking-[3px]">{liveKeyMasked}</span>
            <Button size="sm" className="bg-purple-600 text-white text-[10px] h-auto py-1 px-2 rounded-[5px]">
              🔓 Reveal (2FA)
            </Button>
          </div>
          {account?.status !== "APPROVED" && (
            <p className="text-[10px] text-yellow-400/70">Complete KYC compliance to unlock your live key.</p>
          )}
        </div>
      </div>

      {/* URLs & Configuration */}
      <div>
        <h3 className="text-[11px] font-bold text-white/30 tracking-[2px] uppercase mb-4">URLs &amp; Configuration</h3>

        <div className="space-y-4">
          <div>
            <Label className="text-[11px] font-semibold text-white/50 tracking-[0.5px] mb-1.5 block">Live Callback URL</Label>
            <Input
              value={callbackUrl}
              onChange={(e) => setCallbackUrl(e.target.value)}
              placeholder="https://yourdomain.com/api/payment-confirm"
              className="bg-white/[0.05] border-white/10 text-white text-xs rounded-lg"
            />
          </div>

          <div>
            <Label className="text-[11px] font-semibold text-white/50 tracking-[0.5px] mb-1.5 block">Webhook URL</Label>
            <div className="flex gap-2">
              <Input
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://yourdomain.com/webhooks/paychain"
                className="bg-white/[0.05] border-white/10 text-white text-xs rounded-lg flex-1"
              />
              <Button size="sm" className="bg-yellow-400/20 text-yellow-400 border border-yellow-400/30 text-xs whitespace-nowrap">
                Test Webhook
              </Button>
            </div>
          </div>

          <div>
            <Label className="text-[11px] font-semibold text-white/50 tracking-[0.5px] mb-1.5 block">Minimum Payout Amount (KSh)</Label>
            <Input
              value={minPayout}
              onChange={(e) => setMinPayout(e.target.value)}
              type="number"
              min="1"
              className="bg-white/[0.05] border-white/10 text-white text-xs rounded-lg"
            />
          </div>

          <div>
            <Label className="text-[11px] font-semibold text-white/50 tracking-[0.5px] mb-1.5 block">Payout Account (M-Pesa)</Label>
            <div className="flex gap-2">
              <Input
                value={payoutPhone}
                onChange={(e) => setPayoutPhone(e.target.value)}
                placeholder="0712 345 678"
                className="bg-white/[0.05] border-white/10 text-white text-xs rounded-lg flex-1"
              />
              <Button size="sm" className="bg-primary text-primary-foreground text-xs">
                Change
              </Button>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className="bg-purple-600 text-white text-xs"
            >
              {saveMutation.isPending ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardSettings;
