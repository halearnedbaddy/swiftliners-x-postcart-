import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "application/pdf"];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

export function useDocumentUpload() {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const uploadDocument = async (file: File, fieldName: string) => {
    setError(null);
    setProgress(0);

    if (!ALLOWED_TYPES.includes(file.type)) {
      const msg = "Only JPG, PNG, or PDF files are allowed.";
      setError(msg);
      throw new Error(msg);
    }
    if (file.size > MAX_SIZE) {
      const msg = "File size must be less than 5MB.";
      setError(msg);
      throw new Error(msg);
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user!.id}/${fieldName}/${Date.now()}.${ext}`;

      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress((p) => Math.min(p + 15, 90));
      }, 200);

      const { error: uploadError } = await supabase.storage
        .from("kyc-documents")
        .upload(path, file, { cacheControl: "3600", upsert: true });

      clearInterval(progressInterval);

      if (uploadError) throw uploadError;

      setProgress(100);
      return { url: path, name: file.name, size: file.size };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      setError(msg);
      throw new Error(msg);
    } finally {
      setUploading(false);
    }
  };

  const getSignedUrl = async (path: string) => {
    const { data, error } = await supabase.storage
      .from("kyc-documents")
      .createSignedUrl(path, 3600);
    if (error) return null;
    return data.signedUrl;
  };

  const removeDocument = async (path: string) => {
    const { error } = await supabase.storage.from("kyc-documents").remove([path]);
    return !error;
  };

  return { uploadDocument, getSignedUrl, removeDocument, uploading, progress, error, clearError: () => setError(null) };
}
