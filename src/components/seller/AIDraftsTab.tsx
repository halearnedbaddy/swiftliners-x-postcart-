import { useState, useEffect } from "react";
import { supabaseApi, Product } from "@/lib/supabase-api";
import { CameraIcon, AlertTriangleIcon } from "@/components/icons";

export function AIDraftsTab() {
  const [drafts, setDrafts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [editingDraft, setEditingDraft] = useState<Product | null>(null);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [generateForm, setGenerateForm] = useState({ description: "", imageUrl: "" });

  useEffect(() => {
    loadDrafts();
  }, []);

  const loadDrafts = async () => {
    setLoading(true);
    const data = await supabaseApi.getDraftProducts();
    setDrafts(data);
    setLoading(false);
  };

  const handleGenerate = async () => {
    if (!generateForm.description && !generateForm.imageUrl) {
      alert("Please provide a description or image URL");
      return;
    }

    setGenerating(true);
    const product = await supabaseApi.generateProductWithAI(
      generateForm.description,
      generateForm.imageUrl || undefined
    );
    setGenerating(false);

    if (product) {
      setShowGenerateModal(false);
      setGenerateForm({ description: "", imageUrl: "" });
      await loadDrafts();
    } else {
      alert("Failed to generate product. Please try again.");
    }
  };

  const handleSaveDraft = async () => {
    if (!editingDraft) return;

    const success = await supabaseApi.updateProduct(editingDraft.id, {
      name: editingDraft.name,
      description: editingDraft.description,
      price: editingDraft.price,
      images: editingDraft.images,
    });

    if (success) {
      setEditingDraft(null);
      await loadDrafts();
    }
  };

  const handlePublish = async (id: string) => {
    if (!confirm("Publish this product? It will be visible on your storefront.")) return;

    const success = await supabaseApi.publishProduct(id);
    if (success) {
      await loadDrafts();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading drafts...</div>
      </div>
    );
  }

  if (editingDraft) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-foreground">✏️ Edit Draft Product</h2>
          <button
            onClick={() => setEditingDraft(null)}
            className="px-4 py-2 rounded-null bg-muted text-muted-foreground hover:bg-muted/80"
          >
            Cancel
          </button>
        </div>
        <div className="bg-card rounded-null border border-border p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Product Name *</label>
            <input
              type="text"
              value={editingDraft.name || ""}
              onChange={(e) => setEditingDraft({ ...editingDraft, name: e.target.value })}
              className="w-full px-4 py-3 rounded-null border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Description</label>
            <textarea
              value={editingDraft.description || ""}
              onChange={(e) => setEditingDraft({ ...editingDraft, description: e.target.value })}
              className="w-full px-4 py-3 rounded-null border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              rows={4}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Price (KES) *</label>
            <input
              type="number"
              value={editingDraft.price || ""}
              onChange={(e) => setEditingDraft({ ...editingDraft, price: parseFloat(e.target.value) || 0 })}
              className="w-full px-4 py-3 rounded-null border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Images (URLs, one per line)</label>
            <textarea
              value={Array.isArray(editingDraft.images) ? editingDraft.images.join("\n") : ""}
              onChange={(e) => setEditingDraft({ ...editingDraft, images: e.target.value.split("\n").filter(Boolean) })}
              className="w-full px-4 py-3 rounded-null border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              rows={3}
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleSaveDraft}
              className="px-4 py-2 rounded-null bg-primary text-primary-foreground hover:bg-primary/90 transition"
            >
              Save Changes
            </button>
            <button
              onClick={() => handlePublish(editingDraft.id)}
              className="px-4 py-2 rounded-null bg-accent text-accent-foreground hover:bg-accent/80 transition"
            >
              Save & Publish
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground">🧠 AI Draft Products</h2>
        <button
          onClick={() => setShowGenerateModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-null bg-primary text-primary-foreground hover:bg-primary/90 transition font-semibold"
        >
          <CameraIcon size={18} />
          Generate with AI
        </button>
      </div>

      {/* Generate Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-null border border-border p-6 max-w-lg w-full space-y-4">
            <h3 className="text-xl font-bold text-foreground">🤖 Generate Product with AI</h3>
            <p className="text-sm text-muted-foreground">
              Describe your product or paste an image URL and let AI create a draft listing for you.
            </p>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Product Description</label>
              <textarea
                value={generateForm.description}
                onChange={(e) => setGenerateForm({ ...generateForm, description: e.target.value })}
                placeholder="e.g., Vintage leather messenger bag, brown, handcrafted, perfect for laptops..."
                className="w-full px-4 py-3 rounded-null border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                rows={4}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Image URL (optional)</label>
              <input
                type="url"
                value={generateForm.imageUrl}
                onChange={(e) => setGenerateForm({ ...generateForm, imageUrl: e.target.value })}
                placeholder="https://example.com/product-image.jpg"
                className="w-full px-4 py-3 rounded-null border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowGenerateModal(false)}
                className="px-4 py-2 rounded-null bg-muted text-muted-foreground hover:bg-muted/80"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="px-4 py-2 rounded-null bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition"
              >
                {generating ? "Generating..." : "Generate Draft"}
              </button>
            </div>
          </div>
        </div>
      )}

      {drafts.length === 0 ? (
        <div className="bg-card rounded-null border border-border p-8 text-center">
          <CameraIcon className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" size={48} />
          <p className="text-muted-foreground mb-2">No drafts yet.</p>
          <p className="text-sm text-muted-foreground">
            Click "Generate with AI" to create product drafts from descriptions or images.
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {drafts.map((draft) => {
            const confidenceScore = draft.ai_confidence_score;
            const hasWarnings = draft.extraction_warnings && draft.extraction_warnings.length > 0;
            const hasMissingFields = draft.missing_fields && draft.missing_fields.length > 0;

            return (
              <div key={draft.id} className="bg-card rounded-null border border-border p-6 relative">
                {/* AI Confidence Badge */}
                {confidenceScore !== undefined && confidenceScore !== null && (
                  <div className="absolute top-2 right-2">
                    <div
                      className={`px-2 py-1 rounded-null-full text-xs font-semibold ${
                        confidenceScore >= 0.8
                          ? "bg-accent/20 text-accent-foreground"
                          : confidenceScore >= 0.5
                          ? "bg-muted text-muted-foreground"
                          : "bg-destructive/20 text-destructive"
                      }`}
                    >
                      AI: {Math.round(confidenceScore * 100)}%
                    </div>
                  </div>
                )}

                {draft.images && draft.images.length > 0 && (
                  <img
                    src={draft.images[0]}
                    alt={draft.name}
                    className="w-full h-48 object-cover rounded-null mb-4"
                  />
                )}
                <h3 className="font-semibold text-lg text-foreground mb-2">{draft.name}</h3>
                {draft.price && (
                  <p className="text-accent font-bold mb-2">KES {draft.price.toLocaleString()}</p>
                )}
                {draft.description && (
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{draft.description}</p>
                )}

                {/* AI Quality Indicators */}
                {(hasWarnings || hasMissingFields) && (
                  <div className="mb-4 space-y-2">
                    {hasWarnings && (
                      <div className="bg-muted/50 border border-border rounded-null p-2">
                        <p className="text-xs font-semibold text-muted-foreground mb-1 flex items-center gap-1">
                          <AlertTriangleIcon size={12} /> Warnings:
                        </p>
                        <ul className="text-xs text-muted-foreground list-disc list-inside">
                          {draft.extraction_warnings.slice(0, 2).map((w, i) => (
                            <li key={i}>{w}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {hasMissingFields && (
                      <div className="bg-muted/50 border border-border rounded-null p-2">
                        <p className="text-xs font-semibold text-muted-foreground mb-1">📋 Missing:</p>
                        <p className="text-xs text-muted-foreground">{draft.missing_fields.join(", ")}</p>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() => setEditingDraft(draft)}
                    className="flex-1 px-3 py-2 rounded-null bg-primary text-primary-foreground text-sm hover:bg-primary/90 transition"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handlePublish(draft.id)}
                    className="flex-1 px-3 py-2 rounded-null bg-accent text-accent-foreground text-sm hover:bg-accent/80 transition"
                  >
                    Publish
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
