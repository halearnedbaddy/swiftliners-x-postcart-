import { useState } from "react";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000";

interface Props {
  transactionId: string;
  initialStatus: string;
}

export function SellerActions({ transactionId, initialStatus }: Props) {
  const [status, setStatus] = useState(initialStatus);
  const [payoutContact, setPayoutContact] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (status !== "ESCROWED") {
    return null;
  }

  async function handleAccept() {
    setLoading(true);
    setError(null);
    setMessage(null);

    // Demo mode
    if (transactionId === "demo-transaction") {
      setTimeout(() => {
        setStatus("ACTIVE");
        setMessage("Order accepted. Funds remain in escrow until delivery is marked.");
        setLoading(false);
      }, 1000);
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/v1/payments/${transactionId}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          seller_payout_contact: payoutContact || undefined,
        }),
      });

      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(body.error || `Request failed with ${res.status}`);
      }

      setStatus(body.status ?? "ACTIVE");
      setMessage("Order accepted. Funds remain in escrow until delivery is marked.");
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Something went wrong";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-nulllg border border-border bg-card p-4 text-sm">
      <h2 className="mb-2 font-semibold text-card-foreground">Seller actions</h2>
      <p className="mb-3 text-muted-foreground">
        Funds are in escrow. As the seller, confirm you accept this order and
        optionally provide the M-Pesa number to receive payout.
      </p>

      <label className="flex flex-col gap-1 text-xs">
        <span className="text-muted-foreground">Payout contact (M-Pesa phone)</span>
        <input
          type="text"
          value={payoutContact}
          onChange={(e) => setPayoutContact(e.target.value)}
          placeholder="e.g. +2547..."
          className="rounded-nullmd border border-input bg-background px-3 py-2 text-sm text-foreground outline-none ring-ring focus:ring-2"
        />
      </label>

      <button
        type="button"
        onClick={handleAccept}
        disabled={loading}
        className="mt-3 inline-flex items-center justify-center rounded-nullmd bg-primary px-4 py-2 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
      >
        {loading ? "Accepting..." : "Accept order"}
      </button>

      {error && (
        <p className="mt-2 text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="mt-2 text-xs text-green-600" role="status">
          {message}
        </p>
      )}
    </section>
  );
}
