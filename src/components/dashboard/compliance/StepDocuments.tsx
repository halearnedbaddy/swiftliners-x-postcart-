import { Button } from "@/components/ui/button";
import { Loader2, Info, ArrowLeft } from "lucide-react";
import DocumentUploadZone from "./DocumentUploadZone";
import type { ComplianceSubmission } from "@/types/compliance";

interface Props {
  submission: ComplianceSubmission | null;
  onSaveDraft: (data: Record<string, any>) => Promise<void>;
  onNext: (data: Record<string, any>) => Promise<void>;
  onBack: () => void;
  isSaving: boolean;
}

const StepDocuments = ({ submission, onSaveDraft, onNext, onBack, isSaving }: Props) => {
  const docs = {
    national_id_front_url: submission?.national_id_front_url || null,
    national_id_front_name: submission?.national_id_front_name || null,
    national_id_back_url: submission?.national_id_back_url || null,
    national_id_back_name: submission?.national_id_back_name || null,
    business_cert_url: submission?.business_cert_url || null,
    business_cert_name: submission?.business_cert_name || null,
  };

  const allUploaded = docs.national_id_front_url && docs.national_id_back_url && docs.business_cert_url;

  const handleUpload = (urlField: string, nameField: string) => async (url: string, name: string) => {
    await onSaveDraft({ [urlField]: url, [nameField]: name });
  };

  const handleRemove = (urlField: string, nameField: string) => async () => {
    await onSaveDraft({ [urlField]: null, [nameField]: null });
  };

  const handleNext = async () => {
    if (!allUploaded) return;
    await onNext(docs);
  };

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="space-y-4">
        <DocumentUploadZone
          label="National ID / Passport — Front"
          description="Clear photo of the front of your National ID or passport"
          fieldName="national-id-front"
          currentUrl={docs.national_id_front_url}
          currentName={docs.national_id_front_name}
          onUploadComplete={handleUpload("national_id_front_url", "national_id_front_name")}
          onRemove={handleRemove("national_id_front_url", "national_id_front_name")}
        />
        <DocumentUploadZone
          label="National ID / Passport — Back"
          description="Clear photo of the back of your National ID"
          fieldName="national-id-back"
          currentUrl={docs.national_id_back_url}
          currentName={docs.national_id_back_name}
          onUploadComplete={handleUpload("national_id_back_url", "national_id_back_name")}
          onRemove={handleRemove("national_id_back_url", "national_id_back_name")}
        />
        <p className="text-[10px] text-white/30 -mt-2 pl-1">Not required for passport — upload front page twice</p>
        <DocumentUploadZone
          label="Business Registration Certificate"
          description="Certificate of Incorporation or Business Name Registration"
          fieldName="business-cert"
          currentUrl={docs.business_cert_url}
          currentName={docs.business_cert_name}
          onUploadComplete={handleUpload("business_cert_url", "business_cert_name")}
          onRemove={handleRemove("business_cert_url", "business_cert_name")}
        />
      </div>

      <div className="flex items-start gap-2 bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
        <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
        <p className="text-[11px] text-blue-300/80">
          Documents must be original, unedited files. Blurry, cropped, or edited documents will delay your approval. All documents are encrypted and stored securely.
        </p>
      </div>

      <div className="flex gap-3 pt-2">
        <Button variant="ghost" size="sm" onClick={onBack} className="text-white/50 text-xs bg-white/[0.05]">
          <ArrowLeft className="w-3 h-3 mr-1" /> Back
        </Button>
        <Button variant="ghost" size="sm" onClick={() => onSaveDraft(docs)} disabled={isSaving}
          className="text-white/50 text-xs bg-white/[0.05]">
          {isSaving ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null} Save Draft
        </Button>
        <Button size="sm" onClick={handleNext} disabled={!allUploaded || isSaving}
          className="bg-primary text-primary-foreground text-xs"
          title={!allUploaded ? "Please upload all 3 documents to continue" : ""}>
          {isSaving ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null} Save & Continue →
        </Button>
      </div>
    </div>
  );
};

export default StepDocuments;
