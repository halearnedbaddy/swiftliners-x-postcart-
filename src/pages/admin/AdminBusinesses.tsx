import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, RefreshCw, Building2, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";

const statusConfig: Record<string, { label: string; color: string }> = {
  EMAIL_UNVERIFIED: { label: "Unverified", color: "bg-white/10 text-white/40" },
  EMAIL_VERIFIED: { label: "Verified", color: "bg-blue-500/15 text-blue-400" },
  PENDING: { label: "Pending", color: "bg-yellow-500/15 text-yellow-400" },
  APPROVED: { label: "Live", color: "bg-primary/15 text-primary" },
  REJECTED: { label: "Rejected", color: "bg-red-500/15 text-red-400" },
  SUSPENDED: { label: "Suspended", color: "bg-orange-500/15 text-orange-400" },
};

export default function AdminBusinesses() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const { data: accounts = [], isLoading, refetch } = useQuery({
    queryKey: ["admin-all-accounts", statusFilter],
    queryFn: async () => {
      let q = (supabase as any)
        .from("accounts")
        .select("*, kyc_documents(status)")
        .order("created_at", { ascending: false });
      if (statusFilter !== "ALL") {
        q = q.eq("status", statusFilter as any);
      }
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  const filtered = accounts.filter(
    (a) =>
      a.business_name?.toLowerCase().includes(search.toLowerCase()) ||
      a.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display font-bold text-xl text-white">Businesses</h1>
          <p className="text-white/40 text-sm mt-1">{filtered.length} registered businesses</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => refetch()}
          className="text-white/60 text-xs bg-white/[0.05]"
        >
          <RefreshCw className="w-3 h-3 mr-1.5" /> Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-5 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
          <Input
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-white/[0.05] border-white/10 text-white text-xs rounded-lg h-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40 bg-white/[0.05] border-white/10 text-white/70 text-xs h-9">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent className="bg-[#0d0d1a] border-white/10 text-white">
            <SelectItem value="ALL" className="text-xs text-white/70 focus:bg-white/[0.08] focus:text-white">
              All Statuses
            </SelectItem>
            {Object.entries(statusConfig).map(([key, { label }]) => (
              <SelectItem key={key} value={key} className="text-xs text-white/70 focus:bg-white/[0.08] focus:text-white">
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-white/[0.06]">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-white/[0.06] bg-white/[0.02]">
              {["Business", "Email", "Status", "KYC", "Created", "Actions"].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-[10px] font-bold tracking-wider uppercase text-white/30">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-white/30 text-xs">
                  Loading businesses...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-16 text-white/30 text-xs">
                  <Building2 className="w-8 h-8 mx-auto mb-2 text-white/20" />
                  <div>No businesses found.</div>
                </td>
              </tr>
            ) : (
              filtered.map((account) => {
                const status = statusConfig[account.status] || statusConfig.EMAIL_UNVERIFIED;
                const kycStatus = account.kyc_documents?.[0]?.status;
                return (
                  <tr key={account.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-white/[0.06] flex items-center justify-center text-white/40 font-bold text-[10px]">
                          {account.business_name?.charAt(0)?.toUpperCase() || "?"}
                        </div>
                        <div>
                          <div className="text-white/80 font-medium">{account.business_name || "Unnamed"}</div>
                          <div className="text-[10px] text-white/30 font-mono">{account.id.slice(0, 8)}...</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-white/60">{account.email}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${status.color}`}>
                        {status.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {kycStatus ? (
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          kycStatus === "APPROVED" ? "bg-primary/15 text-primary" :
                          kycStatus === "PENDING" ? "bg-yellow-500/15 text-yellow-400" :
                          kycStatus === "REJECTED" ? "bg-red-500/15 text-red-400" :
                          "bg-white/10 text-white/40"
                        }`}>
                          {kycStatus}
                        </span>
                      ) : (
                        <span className="text-white/25 text-[10px]">Not started</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-white/40 text-[10px]">
                      {new Date(account.created_at).toLocaleDateString("en-KE")}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-[10px] h-7 px-2 text-white/60 hover:text-white hover:bg-white/[0.08]"
                        >
                          View
                        </Button>
                        {kycStatus === "PENDING" && (
                          <Link to={`/admin/compliance?account=${account.id}`}>
                            <Button
                              size="sm"
                              className="text-[10px] h-7 px-2 bg-yellow-400/10 text-yellow-400 hover:bg-yellow-400/20"
                            >
                              Review KYC
                            </Button>
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
