import { useEffect, useCallback } from "react";
import { useCompliance } from "@/hooks/useCompliance";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle } from "lucide-react";
import ComplianceProgressBar from "./compliance/ComplianceProgressBar";
import StepContactDetails from "./compliance/StepContactDetails";
import StepDocuments from "./compliance/StepDocuments";
import StepAgreement from "./compliance/StepAgreement";
import StepReview from "./compliance/StepReview";
import StepSubmitted from "./compliance/StepSubmitted";
import type { ComplianceSubmission } from "@/types/compliance";

const ComplianceTab = () => {
  const {
    submission, isLoading, currentStep, setCurrentStep,
    createDraft, saveDraft, saveAndContinue, submitCompliance,
    isSaving, isSubmitting,
  } = useCompliance();

  const ensureSubmission = useCallback(async (): Promise<ComplianceSubmission> => {
    if (submission) return submission;
    return await createDraft();
  }, [submission, createDraft]);

  const handleSaveDraft = useCallback(async (data: Record<string, any>) => {
    const sub = await ensureSubmission();
    await saveDraft({ id: sub.id, data, step: currentStep });
  }, [ensureSubmission, saveDraft, currentStep]);

  const handleNext = useCallback(async (data: Record<string, any>) => {
    const sub = await ensureSubmission();
    await saveAndContinue({ id: sub.id, data, nextStep: currentStep + 1 });
  }, [ensureSubmission, saveAndContinue, currentStep]);

  const handleBack = useCallback(() => {
    setCurrentStep(Math.max(1, currentStep - 1));
  }, [currentStep, setCurrentStep]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full bg-white/[0.05]" />
        <Skeleton className="h-40 w-full bg-white/[0.05]" />
        <Skeleton className="h-20 w-full bg-white/[0.05]" />
      </div>
    );
  }

  const isRejected = submission?.status === "rejected";

  return (
    <div>
      {isRejected && (
        <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-6">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs text-red-400 font-semibold">Your application was rejected</p>
            <p className="text-[11px] text-red-400/70 mt-0.5">
              Reason: {submission.rejection_reason || "No reason provided"}. Please update your information and resubmit.
            </p>
          </div>
        </div>
      )}

      <ComplianceProgressBar currentStep={currentStep} />

      {currentStep === 1 && (
        <StepContactDetails
          submission={submission}
          onSaveDraft={handleSaveDraft}
          onNext={handleNext}
          isSaving={isSaving}
        />
      )}

      {currentStep === 2 && (
        <StepDocuments
          submission={submission}
          onSaveDraft={handleSaveDraft}
          onNext={handleNext}
          onBack={handleBack}
          isSaving={isSaving}
        />
      )}

      {currentStep === 3 && (
        <StepAgreement
          submission={submission}
          onSaveDraft={handleSaveDraft}
          onNext={handleNext}
          onBack={handleBack}
          isSaving={isSaving}
        />
      )}

      {currentStep === 4 && submission && (
        <StepReview
          submission={submission}
          onBack={handleBack}
          onSaveDraft={() => handleSaveDraft({})}
          onSubmit={() => submitCompliance(submission.id)}
          onGoToStep={setCurrentStep}
          isSaving={isSaving}
          isSubmitting={isSubmitting}
          isResubmit={isRejected}
        />
      )}

      {currentStep === 5 && submission && (
        <StepSubmitted submission={submission} />
      )}
    </div>
  );
};

export default ComplianceTab;
