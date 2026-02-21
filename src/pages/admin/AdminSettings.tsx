import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { Settings, Shield, DollarSign, Bell, Database, AlertTriangle } from "lucide-react";

export default function AdminSettings() {
  const queryClient = useQueryClient();

  // Platform stats
  const { data: stats } = useQuery({
    queryKey: ["admin-platform-stats"],
    queryFn: async () => {
      const [accounts, transactions, pendingKyc] = await Promise.all([
        supabase.from("accounts").select("id", { count: "exact", head: true }),
        supabase.from("transactions").select("id", { count: "exact", head: true }),
        supabase.from("compliance_submissions").select("id", { count: "exact", head: true }).eq("status", "pending"),
      ]);
      return {
        totalAccounts: accounts.count ?? 0,
        totalTransactions: transactions.count ?? 0,
        pendingReviews: pendingKyc.count ?? 0,
      };
    },
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display font-bold text-xl text-white">System Settings</h1>
        <p className="text-white/40 text-sm mt-1">Platform configuration and system controls</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Platform Info */}
        <div className="bg-white/[0.03] border border-white/[0.07] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Database className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-white">Platform Overview</h3>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-white/[0.05]">
              <span className="text-xs text-white/40">Total Businesses</span>
              <span className="text-sm font-bold text-white">{stats?.totalAccounts ?? "—"}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-white/[0.05]">
              <span className="text-xs text-white/40">Total Transactions</span>
              <span className="text-sm font-bold text-white">{stats?.totalTransactions ?? "—"}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-white/[0.05]">
              <span className="text-xs text-white/40">Pending KYC Reviews</span>
              <span className="text-sm font-bold text-yellow-400">{stats?.pendingReviews ?? "—"}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-white/[0.05]">
              <span className="text-xs text-white/40">Platform Version</span>
              <span className="text-xs text-white/60 font-mono">v1.0.0-beta</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-xs text-white/40">Environment</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-yellow-400/20 text-yellow-400 border border-yellow-400/30">
                SANDBOX
              </span>
            </div>
          </div>
        </div>

        {/* Fee Configuration */}
        <div className="bg-white/[0.03] border border-white/[0.07] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-white">Revenue & Fees</h3>
          </div>
          <div className="space-y-4">
            <div>
              <Label className="text-[11px] font-semibold text-white/50 tracking-[0.5px] mb-1.5 block">
                Transaction Fee (%)
              </Label>
              <Input
                value="2.5"
                readOnly
                className="bg-white/[0.05] border-white/10 text-white text-xs rounded-lg"
              />
              <p className="text-[10px] text-white/25 mt-1">Fixed at 2.5% per transaction</p>
            </div>
            <div>
              <Label className="text-[11px] font-semibold text-white/50 tracking-[0.5px] mb-1.5 block">
                Flat Fee per Transaction (KSh)
              </Label>
              <Input
                value="20"
                readOnly
                className="bg-white/[0.05] border-white/10 text-white text-xs rounded-lg"
              />
              <p className="text-[10px] text-white/25 mt-1">KSh 20 added per transaction</p>
            </div>
            <div className="pt-2 border-t border-white/[0.05]">
              <p className="text-[10px] text-white/30">
                Fee formula: <span className="font-mono text-primary/60">(amount × 2.5%) + KSh 20</span>
              </p>
            </div>
          </div>
        </div>

        {/* Security Settings */}
        <div className="bg-white/[0.03] border border-white/[0.07] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-white">Security</h3>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-white/70 font-medium">Row Level Security</p>
                <p className="text-[10px] text-white/30">All tables protected by RLS policies</p>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/20 text-primary">ENABLED</span>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-white/70 font-medium">API Key Encryption</p>
                <p className="text-[10px] text-white/30">Live keys hashed before storage</p>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/20 text-primary">ACTIVE</span>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-white/70 font-medium">Admin Role Verification</p>
                <p className="text-[10px] text-white/30">Server-side role checks via user_roles</p>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/20 text-primary">ACTIVE</span>
            </div>
          </div>
        </div>

        {/* Notification Preferences */}
        <div className="bg-white/[0.03] border border-white/[0.07] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Bell className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-white">Notification Triggers</h3>
          </div>
          <div className="space-y-3">
            {[
              { label: "New KYC Submission", desc: "When a developer submits compliance", active: true },
              { label: "Account Status Change", desc: "On approval, rejection, suspension", active: true },
              { label: "High-Value Transaction", desc: "Transactions above KSh 100,000", active: true },
              { label: "Dispute Filed", desc: "When any dispute is raised", active: true },
              { label: "Suspicious Activity", desc: "5x volume spike detection", active: false },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between py-1.5">
                <div>
                  <p className="text-xs text-white/70 font-medium">{item.label}</p>
                  <p className="text-[10px] text-white/30">{item.desc}</p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  item.active
                    ? "bg-primary/20 text-primary"
                    : "bg-white/5 text-white/30"
                }`}>
                  {item.active ? "ON" : "OFF"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
