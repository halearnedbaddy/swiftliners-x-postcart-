import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Check, AlertTriangle, Pencil, Loader2 } from "lucide-react";
import SubmitConfirmModal from "./SubmitConfirmModal";
import type { ComplianceSubmission } from "@/types/compliance";

interface Props {
  submission: ComplianceSubmission;
  onBack: () => void;
  onSaveDraft: () => Promise<void>;
  onSubmit: () => Promise<void>;
  onGoToStep: (step: number) => void;
  isSaving: boolean;
  isSubmitting: boolean;
  isResubmit?: boolean;
}

const StepReview = ({ submission, onBack, onSaveDraft, onSubmit, onGoToStep, isSaving, isSubmitting, isResubmit }: Props) => {
  const [showModal, setShowModal] = useState(false);

  const val = (v: string | null | undefined, max?: number) => {
    if (!v) return <span className="text-white/20">—</span>;
    if (max && v.length > max) return v.slice(0, max) + "...";
    return v;
  };

  const docRow = (label: string, name: string | null) => (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-[11px] text-white/40">{label}</span>
      {name ? (
        <span className="flex items-center gap-1 text-[11px] text-emerald-400">
          <Check className="w-3 h-3" /> {name.length > 25 ? name.slice(0, 25) + "..." : name}
        </span>
      ) : (
        <span className="text-[11px] text-red-400">Missing</span>
      )}
    </div>
  );

  return (
    <div className="space-y-5 max-w-2xl">
      {/* Business Details */}
      <div className="border border-white/[0.08] rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold text-white/70">Business Details</h3>
          <Button variant="ghost" size="sm" onClick={() => onGoToStep(1)} className="text-[10px] text-primary h-6 px-2">
            <Pencil className="w-3 h-3 mr-1" /> Edit
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-2">
          {[
            ["Director Name", submission.director_full_name],
            ["Phone", submission.phone_number],
            ["Address", submission.physical_address],
            ["KRA PIN", submission.kra_pin],
            ["Monthly Volume", submission.expected_monthly_volume],
          ].map(([label, value]) => (
            <div key={label as string} className="flex flex-col">
              <span className="text-[10px] text-white/25">{label}</span>
              <span className="text-xs text-white/70">{val(value as string | null)}</span>
            </div>
          ))}
          <div className="col-span-2">
            <span className="text-[10px] text-white/25">Use Case</span>
            <p className="text-xs text-white/70">{val(submission.use_case_description, 100)}</p>
          </div>
        </div>
      </div>

      {/* Documents */}
      <div className="border border-white/[0.08] rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold text-white/70">KYC Documents</h3>
          <Button variant="ghost" size="sm" onClick={() => onGoToStep(2)} className="text-[10px] text-primary h-6 px-2">
            <Pencil className="w-3 h-3 mr-1" /> Edit
          </Button>
        </div>
        {docRow("National ID Front", submission.national_id_front_name)}
        {docRow("National ID Back", submission.national_id_back_name)}
        {docRow("Business Certificate", submission.business_cert_name)}
      </div>

      {/* Agreement */}
      <div className="border border-white/[0.08] rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold text-white/70">Agreement</h3>
          <Button variant="ghost" size="sm" onClick={() => onGoToStep(3)} className="text-[10px] text-primary h-6 px-2">
            <Pencil className="w-3 h-3 mr-1" /> Edit
          </Button>
        </div>
        <div className="space-y-1.5">
          <div className="flex justify-between">
            <span className="text-[10px] text-white/25">Signed by</span>
            <span className="text-xs text-white/70">{val(submission.signatory_name)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[10px] text-white/25">Date signed</span>
            <span className="text-xs text-white/70">{submission.signed_at ? new Date(submission.signed_at).toLocaleString() : "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[10px] text-white/25">Status</span>
            {submission.agreement_signed ? (
              <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">✓ Electronically Signed</span>
            ) : (
              <span className="text-[10px] text-red-400">Not signed</span>
            )}
          </div>
        </div>
      </div>

      {/* Warning */}
      <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <p className="text-[11px] text-amber-300/80">
          Once submitted, your application will be locked and cannot be edited until the review is complete. Our compliance team will review your application within 24–48 business hours.
        </p>
      </div>

      <div className="flex gap-3 pt-2">
        <Button variant="ghost" size="sm" onClick={onBack} className="text-white/50 text-xs bg-white/[0.05]">
          <ArrowLeft className="w-3 h-3 mr-1" /> Back
        </Button>
        <Button variant="ghost" size="sm" onClick={onSaveDraft} disabled={isSaving}
          className="text-white/50 text-xs bg-white/[0.05]">
          {isSaving ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null} Save Draft
        </Button>
      </div>

      <Button size="default" onClick={() => setShowModal(true)} className="w-full bg-primary text-primary-foreground text-sm font-semibold">
        {isResubmit ? "Resubmit Application →" : "Submit Application for Review →"}
      </Button>

      <SubmitConfirmModal open={showModal} onClose={() => setShowModal(false)}
        onConfirm={async () => { await onSubmit(); setShowModal(false); }} isSubmitting={isSubmitting} />
    </div>
  );
};

export default StepReview;
