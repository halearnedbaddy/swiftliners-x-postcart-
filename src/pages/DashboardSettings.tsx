import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/hooks/useAccount";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Copy, RefreshCw, Eye, EyeOff, Shield, Globe, Server, Plus, X, Check, AlertTriangle } from "lucide-react";

const DashboardSettings = () => {
  const { data: account, isLoading } = useAccount();
  const queryClient = useQueryClient();

  const [callbackUrl, setCallbackUrl] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [minPayout, setMinPayout] = useState("100");
  const [payoutPhone, setPayoutPhone] = useState("");
  const [newIp, setNewIp] = useState("");
  const [ipWhitelist, setIpWhitelist] = useState<string[]>([]);
  const [showSandboxKey, setShowSandboxKey] = useState(false);
  const [newSandboxKey, setNewSandboxKey] = useState<string | null>(null);
  const [newLiveKey, setNewLiveKey] = useState<string | null>(null);
  const [webhookTestResult, setWebhookTestResult] = useState<{ status: string; message: string } | null>(null);

  useEffect(() => {
    if (account) {
      setCallbackUrl(account.callback_url ?? "");
      setWebhookUrl(account.webhook_url ?? "");
      setMinPayout(String(account.min_payout_amount ?? 100));
      setPayoutPhone(account.payout_phone ?? "");
      setIpWhitelist(account.ip_whitelist ?? []);
    }
  }, [account]);

  // Save all settings
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!account) throw new Error("No account");
      const { error } = await supabase
        .from("accounts")
        .update({
          callback_url: callbackUrl,
          webhook_url: webhookUrl,
          min_payout_amount: parseInt(minPayout) || 100,
          payout_phone: payoutPhone,
          ip_whitelist: ipWhitelist,
        })
        .eq("id", account.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Settings saved successfully" });
      queryClient.invalidateQueries({ queryKey: ["account"] });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  // Regenerate Sandbox Key via Edge Function
  const regenSandboxKey = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("generate-api-key", {
        body: { type: "sandbox" },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Failed to generate key");
      return data.api_key;
    },
    onSuccess: (key: string) => {
      setNewSandboxKey(key);
      toast({ title: "Sandbox key regenerated" });
      queryClient.invalidateQueries({ queryKey: ["account"] });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  // Regenerate Live Key via Edge Function
  const regenLiveKey = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("generate-api-key", {
        body: { type: "live" },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Failed to generate key");
      return data.api_key;
    },
    onSuccess: (key: string) => {
      setNewLiveKey(key);
      toast({
        title: "Live key regenerated",
        description: "Store this key securely — it won't be shown again!",
      });
      queryClient.invalidateQueries({ queryKey: ["account"] });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  // Test Webhook
  const testWebhook = useMutation({
    mutationFn: async () => {
      if (!webhookUrl) throw new Error("No webhook URL configured");
      // We'll simulate a test by just validating the URL format
      const url = new URL(webhookUrl);
      if (url.protocol !== "https:") throw new Error("Webhook URL must use HTTPS");
      return { status: "success", message: `Webhook URL format valid: ${url.hostname}` };
    },
    onSuccess: (result) => {
      setWebhookTestResult(result);
      toast({ title: "Webhook URL validated ✓" });
    },
    onError: (e: Error) => {
      setWebhookTestResult({ status: "error", message: e.message });
      toast({ title: "Webhook test failed", description: e.message, variant: "destructive" });
    },
  });

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => toast({ title: `${label} copied` }));
  };

  const addIp = () => {
    const ip = newIp.trim();
    if (!ip) return;
    if (ipWhitelist.includes(ip)) {
      toast({ title: "IP already in whitelist", variant: "destructive" });
      return;
    }
    setIpWhitelist([...ipWhitelist, ip]);
    setNewIp("");
  };

  const removeIp = (ip: string) => {
    setIpWhitelist(ipWhitelist.filter((i) => i !== ip));
  };

  if (isLoading) {
    return <div className="text-center py-16 text-white/30 text-xs">Loading settings...</div>;
  }

  const sandboxKey = newSandboxKey || account?.sandbox_api_key || "";
  const liveKeyMasked = account?.api_key_last_four
    ? `sk_live_kzh_••••••••••••${account.api_key_last_four}`
    : "Not generated — complete KYC to unlock";
  const isApproved = account?.status === "APPROVED";

  return (
    <div className="space-y-6">
      {/* API Credentials Section */}
      <div>
        <h3 className="text-[11px] font-bold text-white/30 tracking-[2px] uppercase mb-4">
          API Credentials
        </h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Sandbox Key */}
          <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full bg-yellow-400" />
              <span className="text-[11px] font-semibold text-white/40 tracking-wider uppercase">Sandbox Key</span>
            </div>
            <div className="bg-black/30 rounded-lg px-3.5 py-3 mb-3 font-mono text-[12px] flex items-center gap-2">
              <span className="flex-1 truncate text-white/80">
                {showSandboxKey ? sandboxKey : sandboxKey ? "sk_test_kzh_••••••••••••••••" : "Not generated"}
              </span>
              <div className="flex gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSandboxKey(!showSandboxKey)}
                  className="h-7 w-7 p-0 text-white/40 hover:text-white/70 hover:bg-white/[0.05]"
                >
                  {showSandboxKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => sandboxKey && copyToClipboard(sandboxKey, "Sandbox key")}
                  className="h-7 w-7 p-0 text-white/40 hover:text-white/70 hover:bg-white/[0.05]"
                >
                  <Copy className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={regenSandboxKey.isPending}
                  className="text-red-400 text-xs bg-red-400/10 border border-red-400/20 hover:bg-red-400/20"
                >
                  <RefreshCw className={`w-3 h-3 mr-1.5 ${regenSandboxKey.isPending ? "animate-spin" : ""}`} />
                  {regenSandboxKey.isPending ? "Regenerating..." : "Regenerate"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-[#0d0d1a] border-white/10">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-white">Regenerate Sandbox Key?</AlertDialogTitle>
                  <AlertDialogDescription className="text-white/50">
                    The current sandbox key will be <strong className="text-red-400">immediately invalidated</strong>. Any integrations using it will stop working.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="bg-white/5 text-white/70 border-white/10">Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => regenSandboxKey.mutate()}
                    className="bg-red-500 text-white hover:bg-red-600"
                  >
                    Regenerate
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            {newSandboxKey && (
              <div className="mt-3 p-2.5 bg-primary/10 border border-primary/20 rounded-lg">
                <p className="text-[10px] text-primary font-semibold mb-1">✓ New key generated</p>
                <p className="text-[10px] text-white/40">Copy it now — navigate away and you'll need to show/copy from above.</p>
              </div>
            )}
          </div>

          {/* Live Key */}
          <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className={`w-2 h-2 rounded-full ${isApproved ? "bg-primary" : "bg-yellow-400"}`} />
              <span className="text-[11px] font-semibold text-white/40 tracking-wider uppercase">Live Key</span>
              <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full ${
                isApproved ? "bg-primary/20 text-primary" : "bg-yellow-400/20 text-yellow-400"
              }`}>
                {isApproved ? "ACTIVE" : "PENDING KYC"}
              </span>
            </div>
            <div className="bg-black/30 rounded-lg px-3.5 py-3 mb-3 font-mono text-[12px] flex items-center gap-2">
              <span className="flex-1 truncate text-white/30 tracking-[2px]">
                {newLiveKey || liveKeyMasked}
              </span>
              {newLiveKey && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(newLiveKey, "Live key")}
                  className="h-7 w-7 p-0 text-white/40 hover:text-white/70 hover:bg-white/[0.05]"
                >
                  <Copy className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
            {isApproved ? (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={regenLiveKey.isPending}
                    className="text-red-400 text-xs bg-red-400/10 border border-red-400/20 hover:bg-red-400/20"
                  >
                    <RefreshCw className={`w-3 h-3 mr-1.5 ${regenLiveKey.isPending ? "animate-spin" : ""}`} />
                    {regenLiveKey.isPending ? "Regenerating..." : "Regenerate Live Key"}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-[#0d0d1a] border-white/10">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-white flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-red-400" />
                      Regenerate Live Key?
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-white/50">
                      <strong className="text-red-400">WARNING:</strong> The current live key will be immediately invalidated. 
                      All production integrations using it will <strong className="text-red-400">stop processing payments</strong>.
                      The new key will only be shown once.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="bg-white/5 text-white/70 border-white/10">Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => regenLiveKey.mutate()}
                      className="bg-red-500 text-white hover:bg-red-600"
                    >
                      I understand — Regenerate
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : (
              <p className="text-[10px] text-yellow-400/70">Complete KYC compliance to unlock your live key.</p>
            )}
            {newLiveKey && (
              <div className="mt-3 p-2.5 bg-red-500/10 border border-red-500/20 rounded-lg">
                <p className="text-[10px] text-red-400 font-semibold mb-1">⚠️ Store this key securely!</p>
                <p className="text-[10px] text-white/40">This is the only time you'll see the full key. Copy it now.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* URLs & Configuration */}
      <div>
        <h3 className="text-[11px] font-bold text-white/30 tracking-[2px] uppercase mb-4">
          URLs & Configuration
        </h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <Globe className="w-4 h-4 text-primary/60" />
              <span className="text-xs font-semibold text-white/60">Endpoints</span>
            </div>
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
                  onChange={(e) => { setWebhookUrl(e.target.value); setWebhookTestResult(null); }}
                  placeholder="https://yourdomain.com/webhooks/paychain"
                  className="bg-white/[0.05] border-white/10 text-white text-xs rounded-lg flex-1"
                />
                <Button
                  size="sm"
                  onClick={() => testWebhook.mutate()}
                  disabled={testWebhook.isPending || !webhookUrl}
                  className="bg-yellow-400/20 text-yellow-400 border border-yellow-400/30 text-xs whitespace-nowrap hover:bg-yellow-400/30"
                >
                  {testWebhook.isPending ? "Testing..." : "Test Webhook"}
                </Button>
              </div>
              {webhookTestResult && (
                <p className={`text-[10px] mt-1.5 ${
                  webhookTestResult.status === "success" ? "text-primary" : "text-red-400"
                }`}>
                  {webhookTestResult.status === "success" ? "✓" : "✗"} {webhookTestResult.message}
                </p>
              )}
            </div>
          </div>

          <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <Server className="w-4 h-4 text-primary/60" />
              <span className="text-xs font-semibold text-white/60">Payout Configuration</span>
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
                {account?.payout_verified && (
                  <span className="flex items-center gap-1 text-[10px] text-primary font-semibold">
                    <Check className="w-3 h-3" /> Verified
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* IP Whitelist */}
      <div>
        <h3 className="text-[11px] font-bold text-white/30 tracking-[2px] uppercase mb-4">
          IP Whitelist
        </h3>
        <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="w-4 h-4 text-primary/60" />
            <span className="text-xs font-semibold text-white/60">Allowed IPs</span>
            <span className="text-[10px] text-white/25 ml-auto">Leave empty to allow all IPs</span>
          </div>
          <div className="flex gap-2 mb-3">
            <Input
              value={newIp}
              onChange={(e) => setNewIp(e.target.value)}
              placeholder="e.g. 192.168.1.1"
              className="bg-white/[0.05] border-white/10 text-white text-xs rounded-lg flex-1"
              onKeyDown={(e) => e.key === "Enter" && addIp()}
            />
            <Button size="sm" onClick={addIp} className="bg-primary/20 text-primary border border-primary/30 text-xs hover:bg-primary/30">
              <Plus className="w-3 h-3 mr-1" /> Add
            </Button>
          </div>
          {ipWhitelist.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {ipWhitelist.map((ip) => (
                <span
                  key={ip}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white/[0.05] border border-white/[0.08] rounded-lg text-xs text-white/60 font-mono"
                >
                  {ip}
                  <button onClick={() => removeIp(ip)} className="text-white/30 hover:text-red-400">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <p className="text-[10px] text-white/25">No IP restrictions — all IPs are allowed.</p>
          )}
        </div>
      </div>

      {/* Save Button */}
      <div className="flex gap-3 pt-2">
        <Button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="bg-purple-600 text-white text-xs hover:bg-purple-700"
        >
          {saveMutation.isPending ? "Saving..." : "Save All Settings"}
        </Button>
      </div>
    </div>
  );
};

export default DashboardSettings;
