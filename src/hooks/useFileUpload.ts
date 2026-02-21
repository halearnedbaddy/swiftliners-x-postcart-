import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface UseFileUploadOptions {
  bucket: string;
  folder?: string;
  maxSizeMB?: number;
  allowedTypes?: string[];
}

interface UploadResult {
  url: string;
  path: string;
}

export function useFileUpload({
  bucket,
  folder = "",
  maxSizeMB = 5,
  allowedTypes = ["image/jpeg", "image/png", "application/pdf"],
}: UseFileUploadOptions) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const upload = async (file: File): Promise<UploadResult | null> => {
    setError(null);
    setProgress(0);

    // Validate file size
    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`File size must be less than ${maxSizeMB}MB`);
      return null;
    }

    // Validate file type
    if (!allowedTypes.includes(file.type)) {
      setError(`File type not allowed. Allowed: ${allowedTypes.join(", ")}`);
      return null;
    }

    setUploading(true);

    try {
      // Generate unique filename
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = folder ? `${folder}/${fileName}` : fileName;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);

      setProgress(100);
      return {
        url: data.publicUrl,
        path: filePath,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upload failed";
      setError(message);
      return null;
    } finally {
      setUploading(false);
    }
  };

  const remove = async (path: string): Promise<boolean> => {
    try {
      const { error } = await supabase.storage.from(bucket).remove([path]);
      if (error) throw error;
      return true;
    } catch {
      return false;
    }
  };

  return {
    upload,
    remove,
    uploading,
    progress,
    error,
    clearError: () => setError(null),
  };
}
