import { Check } from "lucide-react";
import { COMPLIANCE_STEPS } from "@/types/compliance";

interface Props {
  currentStep: number;
}

const ComplianceProgressBar = ({ currentStep }: Props) => {
  return (
    <div className="mb-8">
      <div className="flex items-center">
        {COMPLIANCE_STEPS.map((step, i) => (
          <div key={step.number} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  step.number < currentStep
                    ? "bg-emerald-500 text-white"
                    : step.number === currentStep
                    ? "bg-primary text-primary-foreground ring-4 ring-primary/20 animate-pulse"
                    : "bg-white/10 text-white/30"
                }`}
              >
                {step.number < currentStep ? <Check className="w-4 h-4" /> : step.number}
              </div>
              <span className={`text-[10px] mt-1.5 whitespace-nowrap hidden sm:block ${
                step.number <= currentStep ? "text-white/70" : "text-white/25"
              }`}>
                {step.label}
              </span>
            </div>
            {i < COMPLIANCE_STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 mx-2 ${
                step.number < currentStep ? "bg-emerald-500" : "bg-white/[0.08]"
              }`} />
            )}
          </div>
        ))}
      </div>
      <div className="sm:hidden text-center mt-2 text-xs text-white/50">
        Step {currentStep}: {COMPLIANCE_STEPS.find(s => s.number === currentStep)?.label}
      </div>
    </div>
  );
};

export default ComplianceProgressBar;
