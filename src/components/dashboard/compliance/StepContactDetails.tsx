import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Check } from "lucide-react";
import type { ComplianceSubmission, Step1Data } from "@/types/compliance";
import { MONTHLY_VOLUME_OPTIONS } from "@/types/compliance";

interface Props {
  submission: ComplianceSubmission | null;
  onSaveDraft: (data: Partial<Step1Data>) => Promise<void>;
  onNext: (data: Step1Data) => Promise<void>;
  isSaving: boolean;
}

const StepContactDetails = ({ submission, onSaveDraft, onNext, isSaving }: Props) => {
  const [form, setForm] = useState<Step1Data>({
    director_full_name: "",
    phone_number: "",
    physical_address: "",
    kra_pin: "",
    expected_monthly_volume: "",
    use_case_description: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (submission) {
      setForm({
        director_full_name: submission.director_full_name || "",
        phone_number: submission.phone_number || "",
        physical_address: submission.physical_address || "",
        kra_pin: submission.kra_pin || "",
        expected_monthly_volume: submission.expected_monthly_volume || "",
        use_case_description: submission.use_case_description || "",
      });
    }
  }, [submission]);

  const validate = (): Record<string, string> => {
    const e: Record<string, string> = {};
    if (!form.director_full_name || form.director_full_name.length < 3) e.director_full_name = "Full name is required (min 3 characters)";
    if (!form.phone_number || !/^(\+254|0)[17]\d{8}$/.test(form.phone_number.replace(/\s/g, "")))
      e.phone_number = "Enter a valid Kenyan phone number";
    if (!form.physical_address || form.physical_address.length < 10) e.physical_address = "Address is required (min 10 characters)";
    if (!form.kra_pin || !/^[A-Z]\d{9}[A-Z]$/i.test(form.kra_pin)) e.kra_pin = "Invalid KRA PIN format (e.g. A012345678B)";
    if (!form.expected_monthly_volume) e.expected_monthly_volume = "Please select expected volume";
    if (!form.use_case_description || form.use_case_description.length < 50) e.use_case_description = "Min 50 characters required";
    return e;
  };

  const handleSaveDraft = async () => {
    await onSaveDraft(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleNext = async () => {
    const validationErrors = validate();
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;
    await onNext(form);
  };

  const update = (key: keyof Step1Data, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors(prev => { const n = { ...prev }; delete n[key]; return n; });
  };

  const charCount = form.use_case_description.length;

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label className="text-[11px] font-semibold text-white/50 mb-1.5 block">Director Full Name *</Label>
          <Input value={form.director_full_name} onChange={e => update("director_full_name", e.target.value)}
            placeholder="James Kamau Mwangi" className="bg-white/[0.05] border-white/10 text-white text-xs" />
          {errors.director_full_name && <p className="text-[10px] text-red-400 mt-1">{errors.director_full_name}</p>}
        </div>
        <div>
          <Label className="text-[11px] font-semibold text-white/50 mb-1.5 block">Phone Number *</Label>
          <Input value={form.phone_number} onChange={e => update("phone_number", e.target.value)}
            placeholder="+254712345678" className="bg-white/[0.05] border-white/10 text-white text-xs" />
          {errors.phone_number && <p className="text-[10px] text-red-400 mt-1">{errors.phone_number}</p>}
        </div>
      </div>

      <div>
        <Label className="text-[11px] font-semibold text-white/50 mb-1.5 block">Physical Business Address *</Label>
        <Textarea value={form.physical_address} onChange={e => update("physical_address", e.target.value)}
          placeholder="Westlands, Nairobi, Kenya" className="bg-white/[0.05] border-white/10 text-white text-xs min-h-[60px]" />
        {errors.physical_address && <p className="text-[10px] text-red-400 mt-1">{errors.physical_address}</p>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label className="text-[11px] font-semibold text-white/50 mb-1.5 block">KRA PIN *</Label>
          <Input value={form.kra_pin} onChange={e => update("kra_pin", e.target.value.toUpperCase())}
            placeholder="A012345678B" className="bg-white/[0.05] border-white/10 text-white text-xs" />
          {errors.kra_pin && <p className="text-[10px] text-red-400 mt-1">{errors.kra_pin}</p>}
        </div>
        <div>
          <Label className="text-[11px] font-semibold text-white/50 mb-1.5 block">Expected Monthly Volume *</Label>
          <Select value={form.expected_monthly_volume} onValueChange={v => update("expected_monthly_volume", v)}>
            <SelectTrigger className="bg-white/[0.05] border-white/10 text-white text-xs">
              <SelectValue placeholder="Select volume" />
            </SelectTrigger>
            <SelectContent className="bg-[#0d0d1a] border-white/10">
              {MONTHLY_VOLUME_OPTIONS.map(opt => (
                <SelectItem key={opt} value={opt} className="text-xs text-white/70">{opt}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.expected_monthly_volume && <p className="text-[10px] text-red-400 mt-1">{errors.expected_monthly_volume}</p>}
        </div>
      </div>

      <div>
        <Label className="text-[11px] font-semibold text-white/50 mb-1.5 block">Use Case Description *</Label>
        <Textarea value={form.use_case_description} onChange={e => update("use_case_description", e.target.value)}
          placeholder="Describe how you'll use PayChain for your business..."
          className="bg-white/[0.05] border-white/10 text-white text-xs min-h-[80px]" />
        <p className={`text-[10px] mt-1 ${charCount >= 50 ? "text-emerald-400" : "text-white/30"}`}>
          {charCount} / 50 minimum
        </p>
        {errors.use_case_description && <p className="text-[10px] text-red-400 mt-0.5">{errors.use_case_description}</p>}
      </div>

      <div className="flex gap-3 pt-2">
        <Button variant="ghost" size="sm" onClick={handleSaveDraft} disabled={isSaving}
          className="text-white/50 text-xs bg-white/[0.05]">
          {isSaving ? <><Loader2 className="w-3 h-3 animate-spin mr-1" /> Saving...</> : saved ? <><Check className="w-3 h-3 mr-1" /> Saved ✓</> : "Save Draft"}
        </Button>
        <Button size="sm" onClick={handleNext} disabled={isSaving}
          className="bg-primary text-primary-foreground text-xs">
          {isSaving ? <><Loader2 className="w-3 h-3 animate-spin mr-1" /> Saving...</> : "Save & Continue →"}
        </Button>
      </div>
    </div>
  );
};

export default StepContactDetails;
