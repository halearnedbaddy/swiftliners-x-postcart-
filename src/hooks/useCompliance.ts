import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import type { ComplianceSubmission } from "@/types/compliance";

export function useCompliance() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(1);

  const { data: submission, isLoading } = useQuery({
    queryKey: ["compliance", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("compliance_submissions" as any)
        .select("*")
        .eq("developer_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as ComplianceSubmission | null;
    },
  });

  useEffect(() => {
    if (submission) {
      if (["pending", "under_review", "approved"].includes(submission.status)) {
        setCurrentStep(5);
      } else if (submission.status === "rejected") {
        setCurrentStep(1);
      } else {
        setCurrentStep(submission.current_step || 1);
      }
    }
  }, [submission]);

  const createDraft = useCallback(async () => {
    const { data, error } = await supabase
      .from("compliance_submissions" as any)
      .insert({ developer_id: user!.id, status: "draft", current_step: 1 } as any)
      .select()
      .single();
    if (error) throw error;
    queryClient.invalidateQueries({ queryKey: ["compliance"] });
    return data as unknown as ComplianceSubmission;
  }, [user, queryClient]);

  const saveDraftMutation = useMutation({
    mutationFn: async ({ id, data, step }: { id: string; data: Record<string, any>; step?: number }) => {
      const payload: any = { ...data };
      if (step !== undefined) payload.current_step = step;
      const { error } = await supabase
        .from("compliance_submissions" as any)
        .update(payload)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Draft saved ✓" });
      queryClient.invalidateQueries({ queryKey: ["compliance"] });
    },
    onError: () => {
      toast({ title: "Failed to save", description: "Check your connection and try again.", variant: "destructive" });
    },
  });

  const saveAndContinueMutation = useMutation({
    mutationFn: async ({ id, data, nextStep }: { id: string; data: Record<string, any>; nextStep: number }) => {
      const payload: any = { ...data, current_step: nextStep };
      const { error } = await supabase
        .from("compliance_submissions" as any)
        .update(payload)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      toast({ title: "Progress saved ✓" });
      setCurrentStep(variables.nextStep);
      queryClient.invalidateQueries({ queryKey: ["compliance"] });
    },
    onError: () => {
      toast({ title: "Failed to save", description: "Check your connection and try again.", variant: "destructive" });
    },
  });

  const submitMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("compliance_submissions" as any)
        .update({
          status: "pending",
          submitted_at: new Date().toISOString(),
          current_step: 5,
          rejection_reason: null,
        } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Application submitted!" });
      setCurrentStep(5);
      queryClient.invalidateQueries({ queryKey: ["compliance"] });
    },
    onError: () => {
      toast({ title: "Submission failed", description: "Please try again.", variant: "destructive" });
    },
  });

  return {
    submission,
    isLoading,
    currentStep,
    setCurrentStep,
    createDraft,
    saveDraft: saveDraftMutation.mutateAsync,
    saveAndContinue: saveAndContinueMutation.mutateAsync,
    submitCompliance: submitMutation.mutateAsync,
    isSaving: saveDraftMutation.isPending || saveAndContinueMutation.isPending,
    isSubmitting: submitMutation.isPending,
  };
}
