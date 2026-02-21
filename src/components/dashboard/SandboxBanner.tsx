import { Link } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import { useAccount } from "@/hooks/useAccount";

export function SandboxBanner() {
  const { data: account } = useAccount();

  // Don't show banner if approved
  if (!account || account.status === "APPROVED") return null;

  const messages: Record<string, { text: string; action?: string; actionLink?: string }> = {
    EMAIL_UNVERIFIED: {
      text: "Please verify your email to access sandbox mode.",
      action: "Resend verification",
    },
    EMAIL_VERIFIED: {
      text: "You're in SANDBOX mode. Complete KYC to unlock LIVE transactions.",
      action: "Complete KYC →",
      actionLink: "/dashboard/compliance",
    },
    PENDING: {
      text: "Your KYC is under review. We'll notify you within 2 business days.",
    },
    REJECTED: {
      text: "Your KYC was rejected. Please review and resubmit your documents.",
      action: "Review KYC →",
      actionLink: "/dashboard/compliance",
    },
    SUSPENDED: {
      text: "Your account has been suspended. Please contact support.",
      action: "Contact Support →",
      actionLink: "/dashboard/support",
    },
  };

  const msg = messages[account.status];
  if (!msg) return null;

  return (
    <div className="bg-yellow-500/10 border-b border-yellow-500/20 px-6 py-2.5 flex items-center justify-center gap-3">
      <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0" />
      <span className="text-xs text-yellow-400/90">{msg.text}</span>
      {msg.action && msg.actionLink && (
        <Link
          to={msg.actionLink}
          className="text-xs font-semibold text-yellow-400 hover:text-yellow-300 underline underline-offset-2"
        >
          {msg.action}
        </Link>
      )}
    </div>
  );
}
