import { useState } from "react";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000";

interface Props {
  transactionId: string;
  initialStatus: string;
}

export function SellerDeliveryActions({ transactionId, initialStatus }: Props) {
  const [status, setStatus] = useState(initialStatus);
  const [evidenceUrls, setEvidenceUrls] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (status !== "ACTIVE" && status !== "DELIVERED") {
    return null;
  }

  async function handleMarkDelivered() {
    setLoading(true);
    setError(null);
    setMessage(null);

    // Demo mode
    if (transactionId === "demo-transaction") {
      setTimeout(() => {
        setStatus("DELIVERED");
        setMessage("Marked as delivered. Buyer will be asked to confirm, or funds will auto-release later.");
        setLoading(false);
      }, 1000);
      return;
    }

    try {
      const urls = evidenceUrls
        .split(",")
        .map((u) => u.trim())
        .filter(Boolean);

      const res = await fetch(
        `${API_BASE}/api/v1/payments/${transactionId}/mark-delivered`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ evidence_urls: urls.length ? urls : undefined }),
        }
      );

      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(body.error || `Request failed with ${res.status}`);
      }

      setStatus(body.status ?? "DELIVERED");
      setMessage("Marked as delivered. Buyer will be asked to confirm, or funds will auto-release later.");
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Something went wrong";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-nulllg border border-border bg-card p-4 text-sm">
      <h2 className="mb-2 font-semibold text-card-foreground">Delivery</h2>
      <p className="mb-3 text-muted-foreground">
        Once you have delivered the item/service, mark it as delivered. Optionally,
        provide links to proof (e.g., image URLs).
      </p>

      <label className="flex flex-col gap-1 text-xs">
        <span className="text-muted-foreground">Evidence URLs (comma-separated)</span>
        <textarea
          value={evidenceUrls}
          onChange={(e) => setEvidenceUrls(e.target.value)}
          placeholder="https://... , https://..."
          className="min-h-[60px] rounded-nullmd border border-input bg-background px-3 py-2 text-sm text-foreground outline-none ring-ring focus:ring-2"
        />
      </label>

      <button
        type="button"
        onClick={handleMarkDelivered}
        disabled={loading || status === "DELIVERED"}
        className="mt-3 inline-flex items-center justify-center rounded-nullmd bg-primary px-4 py-2 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
      >
        {status === "DELIVERED"
          ? "Already marked delivered"
          : loading
            ? "Saving..."
            : "Mark delivered"}
      </button>

      {error && (
        <p className="mt-2 text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="mt-2 text-xs text-[#3d1a7a]" role="status">
          {message}
        </p>
      )}
    </section>
  );
}
