import { motion } from "framer-motion";
import { CheckCircle2, Mail, Search, Rocket } from "lucide-react";
import type { ComplianceSubmission } from "@/types/compliance";

interface Props {
  submission: ComplianceSubmission;
}

const StepSubmitted = ({ submission }: Props) => {
  const ref = submission.id.slice(0, 8).toUpperCase();
  const submittedDate = submission.submitted_at
    ? new Date(submission.submitted_at).toLocaleString("en-KE", {
        day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
      })
    : "—";

  const statusLabel = submission.status === "approved" ? "Approved" : "Under Review";
  const statusColor = submission.status === "approved" ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400";

  return (
    <div className="max-w-lg mx-auto text-center py-8">
      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", duration: 0.6 }}>
        <CheckCircle2 className="w-16 h-16 text-emerald-400 mx-auto" />
      </motion.div>

      <motion.h2 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        className="text-xl font-display font-bold text-white mt-4">
        Application Submitted! 🎉
      </motion.h2>
      <p className="text-sm text-white/40 mt-1">Your compliance documents are now with our team.</p>

      {/* Timeline */}
      <div className="mt-8 space-y-4 text-left">
        {[
          { icon: Mail, label: "Confirmation Email", desc: "Check your inbox for a confirmation email" },
          { icon: Search, label: "Under Review", desc: "Our team reviews your documents (24–48 hours)" },
          { icon: Rocket, label: "Go Live", desc: "Approved? Your account upgrades to LIVE mode automatically" },
        ].map((item, i) => (
          <motion.div key={item.label} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 + i * 0.15 }}
            className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center shrink-0 mt-0.5">
              <item.icon className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-xs font-semibold text-white/70">{item.label}</p>
              <p className="text-[11px] text-white/35">{item.desc}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Status Card */}
      <div className="mt-8 border border-white/[0.08] rounded-lg p-4 text-left space-y-2">
        <div className="flex justify-between">
          <span className="text-[10px] text-white/25">Reference</span>
          <span className="text-xs text-white/60 font-mono">{ref}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[10px] text-white/25">Submitted</span>
          <span className="text-xs text-white/60">{submittedDate}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[10px] text-white/25">Status</span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${statusColor}`}>{statusLabel}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[10px] text-white/25">Est. Review</span>
          <span className="text-xs text-white/60">24–48 business hours</span>
        </div>
      </div>

      <p className="text-[11px] text-white/25 mt-6">
        Questions? Email support@paychain.co.ke or open a support ticket
      </p>
    </div>
  );
};

export default StepSubmitted;
