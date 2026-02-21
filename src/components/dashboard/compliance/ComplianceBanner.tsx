import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import type { ComplianceStatus } from "@/types/compliance";

const ComplianceBanner = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState<ComplianceStatus | null>(null);
  const [reason, setReason] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("compliance_submissions" as any)
      .select("status, rejection_reason")
      .eq("developer_id", user.id)
      .maybeSingle()
      .then(({ data }: any) => {
        if (data) {
          setStatus(data.status);
          setReason(data.rejection_reason);
        } else {
          setStatus("draft");
        }
      });
  }, [user]);

  if (dismissed || !status) return null;

  if (status === "approved") {
    return (
      <div className="bg-emerald-500/10 border-b border-emerald-500/20 px-6 py-2.5 flex items-center justify-between">
        <span className="text-xs text-emerald-400">✅ Your account is verified! LIVE mode is now active.</span>
        <button onClick={() => setDismissed(true)} className="text-emerald-400/50 hover:text-emerald-400"><X className="w-4 h-4" /></button>
      </div>
    );
  }

  if (status === "pending" || status === "under_review") {
    return (
      <div className="bg-blue-500/10 border-b border-blue-500/20 px-6 py-2.5">
        <span className="text-xs text-blue-400">🔍 Your compliance application is under review. We'll notify you within 24–48 hours.</span>
      </div>
    );
  }

  if (status === "rejected") {
    return (
      <div className="bg-red-500/10 border-b border-red-500/20 px-6 py-2.5 flex items-center justify-between">
        <span className="text-xs text-red-400">❌ Your compliance was rejected: {reason || "Please contact support."}
        </span>
        <Button size="sm" onClick={() => navigate("/dashboard/compliance")}
          className="bg-red-500/20 text-red-400 border border-red-500/30 text-[10px] h-6">Fix & Resubmit →</Button>
      </div>
    );
  }

  // draft or no submission
  return (
    <div className="bg-amber-500/10 border-b border-amber-500/20 px-6 py-2.5 flex items-center justify-between">
      <span className="text-xs text-amber-400">⚠️ Complete your compliance to unlock LIVE mode and start accepting real payments.</span>
      <Button size="sm" onClick={() => navigate("/dashboard/compliance")}
        className="bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] h-6">Complete Compliance →</Button>
    </div>
  );
};

export default ComplianceBanner;
