import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CheckCircle, XCircle, Eye, Clock, FileText, Building2, Phone, MapPin, ExternalLink } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function AdminCompliance() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedKyc, setSelectedKyc] = useState<any>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectDialog, setShowRejectDialog] = useState(false);

  const { data: kycList = [], isLoading } = useQuery({
    queryKey: ["admin-kyc-list"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("kyc_documents")
        .select("*, accounts(id, business_name, email, status)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (kycId: string) => {
      const kyc = kycList.find((k) => k.id === kycId);
      if (!kyc) throw new Error("KYC not found");

      // Update KYC status
      const { error: kycError } = await (supabase as any)
        .from("kyc_documents")
        .update({
          status: "APPROVED",
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", kycId);
      if (kycError) throw kycError;

      // Update account status to APPROVED
      const { error: accountError } = await (supabase as any)
        .from("accounts")
        .update({ status: "APPROVED" })
        .eq("id", kyc.account_id);
      if (accountError) throw accountError;
    },
    onSuccess: () => {
      toast({ title: "KYC Approved", description: "Business is now live!" });
      setSelectedKyc(null);
      queryClient.invalidateQueries({ queryKey: ["admin-kyc-list"] });
      queryClient.invalidateQueries({ queryKey: ["admin-accounts"] });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ kycId, reason }: { kycId: string; reason: string }) => {
      const kyc = kycList.find((k) => k.id === kycId);
      if (!kyc) throw new Error("KYC not found");

      // Update KYC status
      const { error: kycError } = await (supabase as any)
        .from("kyc_documents")
        .update({
          status: "REJECTED",
          rejection_reason: reason,
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", kycId);
      if (kycError) throw kycError;

      // Update account status to REJECTED
      const { error: accountError } = await (supabase as any)
        .from("accounts")
        .update({ status: "REJECTED" })
        .eq("id", kyc.account_id);
      if (accountError) throw accountError;
    },
    onSuccess: () => {
      toast({ title: "KYC Rejected", description: "Business has been notified." });
      setSelectedKyc(null);
      setShowRejectDialog(false);
      setRejectReason("");
      queryClient.invalidateQueries({ queryKey: ["admin-kyc-list"] });
      queryClient.invalidateQueries({ queryKey: ["admin-accounts"] });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const pendingCount = kycList.filter((k) => k.status === "PENDING").length;

  const statusConfig: Record<string, { color: string; icon: any }> = {
    DRAFT: { color: "bg-white/10 text-white/40", icon: FileText },
    PENDING: { color: "bg-yellow-500/15 text-yellow-400", icon: Clock },
    APPROVED: { color: "bg-primary/15 text-primary", icon: CheckCircle },
    REJECTED: { color: "bg-red-500/15 text-red-400", icon: XCircle },
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display font-bold text-xl text-white">KYC Compliance Review</h1>
        <p className="text-white/40 text-sm mt-1">
          {pendingCount} pending review{pendingCount !== 1 ? "s" : ""}
        </p>
      </div>

      {/* KYC List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="text-center py-16 text-white/30 text-xs">Loading submissions...</div>
        ) : kycList.length === 0 ? (
          <div className="text-center py-16 text-white/30 text-xs">
            <FileText className="w-8 h-8 mx-auto mb-2 text-white/20" />
            <div>No KYC submissions yet.</div>
          </div>
        ) : (
          kycList.map((kyc) => {
            const config = statusConfig[kyc.status] || statusConfig.DRAFT;
            const StatusIcon = config.icon;
            return (
              <div
                key={kyc.id}
                className="bg-white/[0.03] border border-white/[0.07] rounded-xl p-4 flex items-center gap-4"
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${config.color.split(" ")[0]}`}>
                  <StatusIcon className={`w-5 h-5 ${config.color.split(" ")[1]}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-white/80 font-semibold text-sm">
                      {kyc.accounts?.business_name || "Unnamed Business"}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${config.color}`}>
                      {kyc.status}
                    </span>
                  </div>
                  <div className="text-[11px] text-white/40">
                    {kyc.accounts?.email} · Submitted {new Date(kyc.created_at).toLocaleDateString("en-KE")}
                  </div>
                  {kyc.status === "REJECTED" && kyc.rejection_reason && (
                    <div className="text-[11px] text-red-400/80 mt-1">
                      Reason: {kyc.rejection_reason}
                    </div>
                  )}
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setSelectedKyc(kyc)}
                    className="text-[10px] h-7 px-2.5 text-white/60 hover:text-white hover:bg-white/[0.08]"
                  >
                    <Eye className="w-3 h-3 mr-1" /> View
                  </Button>
                  {kyc.status === "PENDING" && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => approveMutation.mutate(kyc.id)}
                        disabled={approveMutation.isPending}
                        className="text-[10px] h-7 px-2.5 bg-primary/20 text-primary hover:bg-primary/30"
                      >
                        <CheckCircle className="w-3 h-3 mr-1" /> Approve
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedKyc(kyc);
                          setShowRejectDialog(true);
                        }}
                        className="text-[10px] h-7 px-2.5 bg-red-500/20 text-red-400 hover:bg-red-500/30"
                      >
                        <XCircle className="w-3 h-3 mr-1" /> Reject
                      </Button>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Detail Modal */}
      {selectedKyc && !showRejectDialog && (
        <Dialog open={!!selectedKyc} onOpenChange={() => setSelectedKyc(null)}>
          <DialogContent className="bg-[#0d0d1a] border-white/10 text-white max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-primary" />
                {selectedKyc.accounts?.business_name || "Unnamed Business"}
              </DialogTitle>
              <DialogDescription className="text-white/50">
                KYC submission details
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-4 py-4">
              <div>
                <Label className="text-[10px] text-white/40 uppercase tracking-wider">Director Name</Label>
                <div className="text-sm text-white/80 mt-1">{selectedKyc.director_name || "—"}</div>
              </div>
              <div>
                <Label className="text-[10px] text-white/40 uppercase tracking-wider">Phone</Label>
                <div className="text-sm text-white/80 mt-1 flex items-center gap-1">
                  <Phone className="w-3 h-3" /> {selectedKyc.phone || "—"}
                </div>
              </div>
              <div>
                <Label className="text-[10px] text-white/40 uppercase tracking-wider">Address</Label>
                <div className="text-sm text-white/80 mt-1 flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> {selectedKyc.address || "—"}
                </div>
              </div>
              <div>
                <Label className="text-[10px] text-white/40 uppercase tracking-wider">KRA PIN</Label>
                <div className="text-sm text-white/80 mt-1 font-mono">{selectedKyc.kra_pin || "—"}</div>
              </div>
              <div>
                <Label className="text-[10px] text-white/40 uppercase tracking-wider">Expected Volume</Label>
                <div className="text-sm text-white/80 mt-1">{selectedKyc.expected_volume || "—"}</div>
              </div>
              <div>
                <Label className="text-[10px] text-white/40 uppercase tracking-wider">Submitted</Label>
                <div className="text-sm text-white/80 mt-1">
                  {new Date(selectedKyc.created_at).toLocaleString("en-KE")}
                </div>
              </div>
            </div>

            {/* Documents */}
            <div className="border-t border-white/[0.08] pt-4">
              <Label className="text-[10px] text-white/40 uppercase tracking-wider mb-3 block">Documents</Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/[0.03] rounded-lg p-3">
                  <div className="text-xs text-white/60 mb-1">ID Document</div>
                  {selectedKyc.id_document_url ? (
                    <a
                      href={selectedKyc.id_document_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline flex items-center gap-1"
                    >
                      View Document <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <span className="text-xs text-white/30">Not uploaded</span>
                  )}
                </div>
                <div className="bg-white/[0.03] rounded-lg p-3">
                  <div className="text-xs text-white/60 mb-1">Business Certificate</div>
                  {selectedKyc.business_cert_url ? (
                    <a
                      href={selectedKyc.business_cert_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline flex items-center gap-1"
                    >
                      View Document <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <span className="text-xs text-white/30">Not uploaded</span>
                  )}
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="ghost" onClick={() => setSelectedKyc(null)} className="text-white/60">
                Close
              </Button>
              {selectedKyc.status === "PENDING" && (
                <>
                  <Button
                    onClick={() => {
                      setShowRejectDialog(true);
                    }}
                    className="bg-red-500/20 text-red-400 hover:bg-red-500/30"
                  >
                    <XCircle className="w-4 h-4 mr-1" /> Reject
                  </Button>
                  <Button
                    onClick={() => approveMutation.mutate(selectedKyc.id)}
                    disabled={approveMutation.isPending}
                    className="bg-primary text-white"
                  >
                    <CheckCircle className="w-4 h-4 mr-1" /> Approve
                  </Button>
                </>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent className="bg-[#0d0d1a] border-white/10 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-400">Reject KYC Submission</DialogTitle>
            <DialogDescription className="text-white/50">
              Please provide a reason for rejection. The business will be notified.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label className="text-xs text-white/60 mb-2 block">Rejection Reason</Label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. ID document is blurry, please resubmit a clearer copy..."
              rows={4}
              className="w-full bg-white/[0.05] border border-white/10 text-white text-sm rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-red-500/50 placeholder:text-white/20"
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowRejectDialog(false)} className="text-white/60">
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!rejectReason.trim()) {
                  toast({ title: "Error", description: "Please provide a rejection reason", variant: "destructive" });
                  return;
                }
                rejectMutation.mutate({ kycId: selectedKyc.id, reason: rejectReason });
              }}
              disabled={rejectMutation.isPending}
              className="bg-red-500 text-white hover:bg-red-600"
            >
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
