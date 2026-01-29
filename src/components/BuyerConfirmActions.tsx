import { useState } from "react";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000";

interface Props {
  transactionId: string;
  initialStatus: string;
}

export function BuyerConfirmActions({ transactionId, initialStatus }: Props) {
  const [status, setStatus] = useState<string>(initialStatus);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (status !== "DELIVERED" && status !== "COMPLETED") {
    return null;
  }

  async function handleConfirm() {
    setLoading(true);
    setError(null);
    setMessage(null);

    // Demo mode
    if (transactionId === "demo-transaction") {
      setTimeout(() => {
        setStatus("COMPLETED");
        setMessage("Thanks! We've marked this as received and queued payout to the seller.");
        setLoading(false);
      }, 1000);
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/v1/payments/${transactionId}/confirm`, {
        method: "POST",
      });

      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(body.error || `Request failed with ${res.status}`);
      }

      setStatus(body.status ?? "COMPLETED");
      setMessage("Thanks! We've marked this as received and queued payout to the seller.");
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Something went wrong";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-nulllg border border-border bg-card p-4 text-sm">
      <h2 className="mb-2 font-semibold text-card-foreground">Buyer confirmation</h2>
      <p className="mb-3 text-muted-foreground">
        If you have received the item or service as expected, confirm below so we can
        release funds from escrow to the seller.
      </p>

      <button
        type="button"
        onClick={handleConfirm}
        disabled={loading || status === "COMPLETED"}
        className="inline-flex items-center justify-center rounded-nullmd bg-primary px-4 py-2 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
      >
        {status === "COMPLETED"
          ? "Already confirmed"
          : loading
            ? "Confirming..."
            : "I have received the item"}
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
