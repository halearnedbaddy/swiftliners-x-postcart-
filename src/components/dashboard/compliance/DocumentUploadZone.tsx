import { useRef, useState, useCallback, useEffect } from "react";
import { Upload, X, FileCheck, FileText, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDocumentUpload } from "@/hooks/useDocumentUpload";

interface Props {
  label: string;
  description: string;
  fieldName: string;
  currentUrl: string | null;
  currentName: string | null;
  onUploadComplete: (url: string, name: string) => void;
  onRemove: () => void;
}

const DocumentUploadZone = ({ label, description, fieldName, currentUrl, currentName, onUploadComplete, onRemove }: Props) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const { uploadDocument, getSignedUrl, uploading, progress, error, clearError } = useDocumentUpload();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    if (currentUrl) {
      getSignedUrl(currentUrl).then(url => setPreviewUrl(url));
    } else {
      setPreviewUrl(null);
    }
  }, [currentUrl]);

  const handleFile = useCallback(async (file: File) => {
    try {
      clearError();
      const result = await uploadDocument(file, fieldName);
      onUploadComplete(result.url, result.name);
    } catch {
      // error state handled in hook
    }
  }, [fieldName, onUploadComplete, uploadDocument, clearError]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const isImage = currentName?.match(/\.(jpg|jpeg|png)$/i);

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  // Error state
  if (error && !currentUrl) {
    return (
      <div className="border-2 border-red-500/40 rounded-xl p-5 bg-red-500/5">
        <div className="flex items-center gap-2 text-red-400 mb-2">
          <AlertCircle className="w-4 h-4" />
          <span className="text-xs font-semibold">{label}</span>
        </div>
        <p className="text-xs text-red-400/80 mb-3">{error}</p>
        <Button size="sm" variant="outline" onClick={() => { clearError(); inputRef.current?.click(); }}
          className="text-xs border-red-500/30 text-red-400 hover:bg-red-500/10">
          Try Again
        </Button>
        <input ref={inputRef} type="file" accept="image/jpeg,image/png,application/pdf" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
      </div>
    );
  }

  // Uploading state
  if (uploading) {
    return (
      <div className="border-2 border-primary/30 rounded-xl p-5 bg-primary/5">
        <div className="flex items-center gap-2 mb-3">
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
          <span className="text-xs text-white/70">{label}</span>
        </div>
        <div className="w-full bg-white/10 rounded-full h-2 mb-1">
          <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
        </div>
        <span className="text-[10px] text-white/40">Uploading... {progress}%</span>
      </div>
    );
  }

  // Success state
  if (currentUrl && currentName) {
    return (
      <div className="border-2 border-emerald-500/30 rounded-xl p-4 bg-emerald-500/5 relative">
        <button onClick={onRemove} className="absolute top-2 right-2 text-white/30 hover:text-red-400 transition-colors">
          <X className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-3">
          {isImage && previewUrl ? (
            <img src={previewUrl} alt={label} className="w-12 h-12 rounded-lg object-cover border border-white/10" />
          ) : (
            <div className="w-12 h-12 rounded-lg bg-white/5 flex items-center justify-center">
              <FileText className="w-5 h-5 text-primary" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <FileCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="text-xs text-white/70 font-medium truncate">{currentName}</span>
            </div>
            <span className="text-[10px] text-white/30">{label}</span>
          </div>
        </div>
      </div>
    );
  }

  // Empty state
  return (
    <div
      className={`border-2 border-dashed rounded-xl p-5 text-center transition-colors cursor-pointer ${
        dragOver ? "border-primary/50 bg-primary/5" : "border-white/10 hover:border-white/20"
      }`}
      onClick={() => inputRef.current?.click()}
      onDragOver={e => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,application/pdf" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
      <Upload className="w-6 h-6 text-white/20 mx-auto mb-2" />
      <p className="text-xs font-medium text-white/50 mb-0.5">{label}</p>
      <p className="text-[10px] text-white/30 mb-1">{description}</p>
      <p className="text-[10px] text-white/20">JPG, PNG or PDF · Max 5MB</p>
    </div>
  );
};

export default DocumentUploadZone;
