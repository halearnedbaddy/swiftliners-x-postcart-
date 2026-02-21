import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Bell, CheckCircle, Clock, AlertTriangle, FileCheck, CreditCard, Shield, Trash2, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

const typeConfig: Record<string, { icon: typeof Bell; color: string; bg: string }> = {
  compliance_submitted: { icon: FileCheck, color: "text-yellow-400", bg: "bg-yellow-500/10" },
  account_approved: { icon: CheckCircle, color: "text-primary", bg: "bg-primary/10" },
  account_rejected: { icon: AlertTriangle, color: "text-red-400", bg: "bg-red-500/10" },
  transaction_alert: { icon: CreditCard, color: "text-blue-400", bg: "bg-blue-500/10" },
  dispute_raised: { icon: AlertTriangle, color: "text-red-400", bg: "bg-red-500/10" },
  security_alert: { icon: Shield, color: "text-orange-400", bg: "bg-orange-500/10" },
};

const defaultIcon = { icon: Bell, color: "text-white/50", bg: "bg-white/5" };

export default function AdminNotifications() {
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["admin-notifications"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("admin_notifications")
        .update({ read: true })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-notifications"] }),
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("admin_notifications")
        .update({ read: true })
        .eq("read", false);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-notifications"] });
      toast({ title: "All notifications marked as read" });
    },
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  if (isLoading) {
    return <div className="text-center py-16 text-white/30 text-xs">Loading notifications...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display font-bold text-xl text-white">Notifications</h1>
          <p className="text-white/40 text-sm mt-1">
            {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => markAllRead.mutate()}
            disabled={markAllRead.isPending}
            className="text-xs text-primary hover:text-primary/80 hover:bg-primary/10"
          >
            <CheckCheck className="w-3.5 h-3.5 mr-1.5" />
            Mark all read
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="text-center py-20">
          <Bell className="w-12 h-12 mx-auto mb-3 text-white/10" />
          <p className="text-white/30 text-sm">No notifications yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((notif) => {
            const config = typeConfig[notif.type] || defaultIcon;
            const Icon = config.icon;
            return (
              <div
                key={notif.id}
                className={`flex items-start gap-4 p-4 rounded-xl border transition-colors cursor-pointer ${
                  notif.read
                    ? "bg-white/[0.02] border-white/[0.05]"
                    : "bg-white/[0.04] border-white/[0.08]"
                }`}
                onClick={() => !notif.read && markRead.mutate(notif.id)}
              >
                <div className={`w-10 h-10 rounded-lg ${config.bg} flex items-center justify-center shrink-0`}>
                  <Icon className={`w-5 h-5 ${config.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className={`text-sm font-semibold ${notif.read ? "text-white/60" : "text-white"}`}>
                        {notif.title}
                      </p>
                      {notif.message && (
                        <p className="text-xs text-white/40 mt-1 line-clamp-2">{notif.message}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {!notif.read && (
                        <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
                      )}
                      <span className="text-[10px] text-white/25 whitespace-nowrap">
                        {notif.created_at
                          ? formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })
                          : ""}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
