import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/hooks/useAccount";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Plus, MessageSquare } from "lucide-react";

const priorityClass: Record<string, string> = {
  LOW: "bg-white/10 text-white/50",
  MEDIUM: "bg-blue-500/15 text-blue-400",
  HIGH: "bg-yellow-500/15 text-yellow-400",
  URGENT: "bg-destructive/15 text-red-400",
};

const statusClass: Record<string, string> = {
  OPEN: "bg-primary/15 text-primary",
  IN_PROGRESS: "bg-purple-500/15 text-purple-400",
  RESOLVED: "bg-white/10 text-white/40",
  CLOSED: "bg-white/[0.05] text-white/25",
};

export default function DashboardSupport() {
  const { data: account } = useAccount();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"LOW" | "MEDIUM" | "HIGH" | "URGENT">("MEDIUM");

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ["tickets", account?.id],
    enabled: !!account?.id,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("support_tickets")
        .select("*")
        .eq("account_id", account!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!subject.trim()) throw new Error("Subject is required");
      if (!description.trim()) throw new Error("Description is required");
      const { error } = await (supabase as any).from("support_tickets").insert({
        account_id: account!.id,
        subject: subject.trim(),
        description: description.trim(),
        priority,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Ticket submitted", description: "Our team will respond within 24 hours." });
      setSubject("");
      setDescription("");
      setPriority("MEDIUM");
      setShowForm(false);
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const open = tickets.filter((t) => t.status === "OPEN" || t.status === "IN_PROGRESS").length;

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="font-display font-bold text-white text-lg">Support</h2>
          <p className="text-white/40 text-xs mt-0.5">{open} open ticket{open !== 1 ? "s" : ""}</p>
        </div>
        <Button size="sm" onClick={() => setShowForm(!showForm)} className="bg-primary text-primary-foreground text-xs">
          <Plus className="w-3 h-3 mr-1.5" /> New Ticket
        </Button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="bg-white/[0.03] border border-white/[0.08] rounded-[10px] p-4 mb-4 space-y-3">
          <div>
            <Label className="text-[11px] text-white/50 mb-1.5 block">Subject</Label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Brief description of the issue"
              className="bg-white/[0.05] border-white/10 text-white text-xs rounded-lg"
            />
          </div>
          <div>
            <Label className="text-[11px] text-white/50 mb-1.5 block">Description</Label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide as much detail as possible..."
              rows={4}
              className="w-full bg-white/[0.05] border border-white/10 text-white text-xs rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-primary/50 placeholder:text-white/20"
            />
          </div>
          <div className="flex gap-3 items-end">
            <div>
              <Label className="text-[11px] text-white/50 mb-1.5 block">Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as typeof priority)}>
                <SelectTrigger className="w-32 bg-white/[0.05] border-white/10 text-white/70 text-xs h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#0d0d1a] border-white/10 text-white">
                  {["LOW", "MEDIUM", "HIGH", "URGENT"].map((p) => (
                    <SelectItem key={p} value={p} className="text-xs text-white/70 focus:bg-white/[0.08] focus:text-white">{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button size="sm" onClick={() => createMutation.mutate()} disabled={createMutation.isPending} className="bg-primary text-primary-foreground text-xs">
              {createMutation.isPending ? "Submitting..." : "Submit Ticket"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowForm(false)} className="text-white/60 text-xs bg-white/[0.05]">
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Tickets list */}
      {isLoading ? (
        <div className="text-center py-16 text-white/30 text-xs">Loading tickets...</div>
      ) : tickets.length === 0 ? (
        <div className="text-center py-16 text-white/30 text-xs">
          <div className="text-3xl mb-3">💬</div>
          <div className="font-semibold text-white/50">No support tickets</div>
          <div className="mt-1 text-white/25">Open a ticket if you need help with your integration.</div>
        </div>
      ) : (
        <div className="space-y-2.5">
          {tickets.map((ticket) => (
            <div key={ticket.id} className="bg-white/[0.03] border border-white/[0.07] rounded-[10px] p-4 flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-white/[0.06] flex items-center justify-center shrink-0 mt-0.5">
                <MessageSquare className="w-4 h-4 text-white/40" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                  <span className="text-white/80 font-semibold text-sm">{ticket.subject}</span>
                  <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${statusClass[ticket.status]}`}>{ticket.status.replace("_", " ")}</span>
                  <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${priorityClass[ticket.priority]}`}>{ticket.priority}</span>
                </div>
                <p className="text-[11px] text-white/40 line-clamp-2">{ticket.description}</p>
                <div className="text-[10px] text-white/25 mt-1">
                  #{ticket.id.slice(0, 8)} · {new Date(ticket.created_at).toLocaleDateString("en-KE")}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
