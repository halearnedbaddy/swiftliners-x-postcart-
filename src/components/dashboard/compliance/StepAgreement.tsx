import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, ArrowLeft, Download, Check } from "lucide-react";
import type { ComplianceSubmission } from "@/types/compliance";

const AGREEMENT_TEXT = `PAYLOOM INSTANTS — DEVELOPER PLATFORM AGREEMENT

This Agreement is entered into between PayLoom Instants ("Platform") and the Developer entity identified in the KYC submission ("Developer").

1. SERVICES
The Platform provides payment collection via M-Pesa, Airtel Money and cards, escrow holding, conditional release, and automatic disbursement services accessible via REST API. The Developer agrees to use these services only for lawful business purposes in compliance with all applicable Kenyan laws.

2. FEES
The Developer agrees to pay 2.5% + KSh 20 per transaction processed through the Platform. Fees are deducted automatically at disbursement.

3. KYC & COMPLIANCE
The Developer confirms all information and documents submitted during registration are genuine, accurate, and current. Providing false information is grounds for immediate account suspension and may be reported to relevant authorities.

4. PROHIBITED USE
The Developer shall not use the Platform for: money laundering, financing terrorism, processing payments for illegal goods or services, circumventing CBK regulations, or any fraudulent activity.

5. DATA PROTECTION
The Platform handles all data in accordance with the Kenya Data Protection Act 2019. Transaction data is retained for 7 years as required by CBK regulations.

6. ACCOUNT SUSPENSION
The Platform may suspend access immediately if: KYC documents expire, suspicious activity is detected, CBK requests a review, or the Developer breaches these terms.

7. TERMINATION
Either party may terminate with 30 days written notice. Outstanding funds will be disbursed within 5 business days of termination.

8. GOVERNING LAW
This Agreement is governed exclusively by the laws of Kenya. Disputes shall be resolved in the courts of Nairobi, Kenya.

By signing below, the Developer agrees to all terms above.`;

interface Props {
  submission: ComplianceSubmission | null;
  onSaveDraft: (data: Record<string, any>) => Promise<void>;
  onNext: (data: Record<string, any>) => Promise<void>;
  onBack: () => void;
  isSaving: boolean;
}

const StepAgreement = ({ submission, onSaveDraft, onNext, onBack, isSaving }: Props) => {
  const [signatoryName, setSignatoryName] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  useEffect(() => {
    if (submission) {
      setSignatoryName(submission.signatory_name || "");
      setAgreed(submission.agreement_signed || false);
    }
  }, [submission]);

  const canContinue = signatoryName.trim().length >= 3 && agreed;

  const handleNext = async () => {
    if (!canContinue) return;
    await onNext({
      signatory_name: signatoryName.trim(),
      agreement_signed: true,
      signed_at: new Date().toISOString(),
    });
  };

  const handleDownload = () => {
    const html = `<html><head><title>PayLoom Agreement</title><style>body{font-family:serif;max-width:700px;margin:40px auto;padding:20px;line-height:1.6}h1{font-size:18px}pre{white-space:pre-wrap;font-family:serif;font-size:14px}.sig{margin-top:40px;border-top:1px solid #000;padding-top:10px}</style></head><body><pre>${AGREEMENT_TEXT}</pre><div class="sig"><p><strong>Signed by:</strong> ${signatoryName || "[Not yet signed]"}</p><p><strong>Date:</strong> ${new Date().toLocaleString()}</p><p><strong>Ref:</strong> ${submission?.id?.slice(0, 8).toUpperCase() || "N/A"}</p></div></body></html>`;
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "PayLoom-Agreement.html";
    a.click();
    URL.revokeObjectURL(url);
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 3000);
  };

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="border border-white/10 rounded-lg overflow-hidden">
        <div className="max-h-72 overflow-y-auto p-4 bg-white/[0.02]">
          <pre className="text-[11px] text-white/60 whitespace-pre-wrap font-body leading-relaxed">
            {AGREEMENT_TEXT}
          </pre>
        </div>
      </div>

      <div>
        <Label className="text-[11px] font-semibold text-white/50 mb-1.5 block">
          Type your full legal name to electronically sign this agreement *
        </Label>
        <Input value={signatoryName} onChange={e => setSignatoryName(e.target.value)}
          placeholder="e.g. James Kamau Mwangi"
          className="bg-white/[0.05] border-white/10 text-white text-xs" />
        <p className="text-[10px] text-white/25 mt-1">This constitutes your legal electronic signature</p>
      </div>

      <div className="flex items-start gap-2">
        <Checkbox id="agree" checked={agreed} onCheckedChange={(v) => setAgreed(v === true)}
          className="mt-0.5" />
        <label htmlFor="agree" className="text-[11px] text-white/50 leading-relaxed cursor-pointer">
          I have read, understood, and agree to the PayLoom Instants Platform Agreement. I confirm all submitted information is accurate and I am authorized to sign on behalf of my business.
        </label>
      </div>

      <Button variant="outline" size="sm" onClick={handleDownload}
        className="text-xs border-white/10 text-white/60 bg-transparent hover:bg-white/5">
        {downloaded ? <><Check className="w-3 h-3 mr-1" /> Downloaded</> : <><Download className="w-3 h-3 mr-1" /> Download Agreement PDF</>}
      </Button>

      <div className="flex gap-3 pt-2">
        <Button variant="ghost" size="sm" onClick={onBack} className="text-white/50 text-xs bg-white/[0.05]">
          <ArrowLeft className="w-3 h-3 mr-1" /> Back
        </Button>
        <Button variant="ghost" size="sm" onClick={() => onSaveDraft({ signatory_name: signatoryName, agreement_signed: agreed })}
          disabled={isSaving} className="text-white/50 text-xs bg-white/[0.05]">
          {isSaving ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null} Save Draft
        </Button>
        <Button size="sm" onClick={handleNext} disabled={!canContinue || isSaving}
          className="bg-primary text-primary-foreground text-xs">
          {isSaving ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null} Save & Continue →
        </Button>
      </div>
    </div>
  );
};

export default StepAgreement;
