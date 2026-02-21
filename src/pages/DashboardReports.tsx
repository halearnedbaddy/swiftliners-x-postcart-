import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/hooks/useAccount";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Legend } from "recharts";
import { format, subDays, startOfDay } from "date-fns";

const formatKSh = (cents: number) => `KSh ${(cents / 100).toLocaleString("en-KE")}`;

const COLORS = ["hsl(155,100%,42%)", "hsl(258,89%,66%)", "hsl(39,96%,57%)", "hsl(0,84%,60%)"];

export default function DashboardReports() {
  const { data: account } = useAccount();

  const { data: transactions = [] } = useQuery({
    queryKey: ["reports-transactions", account?.id],
    enabled: !!account?.id,
    queryFn: async () => {
      const since = subDays(new Date(), 30).toISOString();
      const { data, error } = await (supabase as any)
        .from("transactions")
        .select("amount, status, payment_method, created_at, fee_amount")
        .eq("account_id", account!.id)
        .gte("created_at", since)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: disbursements = [] } = useQuery({
    queryKey: ["reports-disbursements", account?.id],
    enabled: !!account?.id,
    queryFn: async () => {
      const since = subDays(new Date(), 30).toISOString();
      const { data, error } = await (supabase as any)
        .from("disbursements")
        .select("amount, status, created_at")
        .eq("account_id", account!.id)
        .gte("created_at", since);
      if (error) throw error;
      return data ?? [];
    },
  });

  // Daily volume chart (last 14 days)
  const last14 = Array.from({ length: 14 }, (_, i) => {
    const day = startOfDay(subDays(new Date(), 13 - i));
    const label = format(day, "dd MMM");
    const dayTxns = transactions.filter((t) => {
      const d = startOfDay(new Date(t.created_at));
      return d.getTime() === day.getTime() && t.status === "SUCCESS";
    });
    return {
      date: label,
      collected: dayTxns.reduce((s, t) => s + t.amount / 100, 0),
      fees: dayTxns.reduce((s, t) => s + (t.fee_amount ?? 0) / 100, 0),
    };
  });

  // Method breakdown
  const methodBreakdown = ["MPESA", "AIRTEL", "CARD"].map((m) => ({
    name: m,
    value: transactions.filter((t) => t.payment_method === m && t.status === "SUCCESS").reduce((s, t) => s + t.amount / 100, 0),
  })).filter((m) => m.value > 0);

  // Status breakdown
  const statusBreakdown = ["SUCCESS", "FAILED", "HELD", "PENDING"].map((s) => ({
    name: s,
    value: transactions.filter((t) => t.status === s).length,
  })).filter((s) => s.value > 0);

  // Summary stats
  const totalCollected = transactions.filter((t) => t.status === "SUCCESS").reduce((s, t) => s + t.amount, 0);
  const totalFees = transactions.reduce((s, t) => s + (t.fee_amount ?? 0), 0);
  const totalDisbursed = disbursements.filter((d) => d.status === "COMPLETED").reduce((s, d) => s + d.amount, 0);
  const successRate = transactions.length > 0
    ? Math.round((transactions.filter((t) => t.status === "SUCCESS").length / transactions.length) * 100)
    : 0;

  const noData = transactions.length === 0;

  return (
    <div>
      <div className="mb-5">
        <h2 className="font-display font-bold text-white text-lg">Reports & Analytics</h2>
        <p className="text-white/40 text-xs mt-0.5">Last 30 days</p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Total Collected", value: formatKSh(totalCollected), sub: `${transactions.filter((t) => t.status === "SUCCESS").length} transactions`, color: "text-primary" },
          { label: "Fees Earned", value: formatKSh(totalFees), sub: "2.5% + KSh 20/txn", color: "text-yellow-400" },
          { label: "Total Disbursed", value: formatKSh(totalDisbursed), sub: `${disbursements.filter((d) => d.status === "COMPLETED").length} payouts`, color: "text-blue-400" },
          { label: "Success Rate", value: `${successRate}%`, sub: `${transactions.length} total txns`, color: successRate >= 80 ? "text-primary" : "text-red-400" },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-white/[0.04] border border-white/[0.07] rounded-[10px] p-4">
            <div className="text-[10px] text-white/40 mb-1">{kpi.label}</div>
            <div className={`font-display font-bold text-xl ${kpi.color}`}>{kpi.value}</div>
            <div className="text-[10px] text-white/30 mt-0.5">{kpi.sub}</div>
          </div>
        ))}
      </div>

      {noData ? (
        <div className="text-center py-16 text-white/30 text-xs bg-white/[0.02] rounded-[10px] border border-white/[0.06]">
          <div className="text-3xl mb-3">📊</div>
          <div className="font-semibold text-white/50">No data yet</div>
          <div className="mt-1 text-white/25">Charts will appear once you start processing transactions.</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Volume chart */}
          <div className="lg:col-span-2 bg-white/[0.03] border border-white/[0.07] rounded-[10px] p-4">
            <div className="text-[11px] font-semibold text-white/50 mb-4 uppercase tracking-wider">Daily Collection Volume (KSh)</div>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={last14}>
                <defs>
                  <linearGradient id="collGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(155,100%,42%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(155,100%,42%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fontSize: 9, fill: "rgba(255,255,255,0.3)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: "rgba(255,255,255,0.3)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v / 1000}K`} />
                <Tooltip
                  contentStyle={{ background: "#0d0d1a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 11 }}
                  formatter={(v: number) => [`KSh ${v.toLocaleString()}`, "Collected"]}
                />
                <Area type="monotone" dataKey="collected" stroke="hsl(155,100%,42%)" strokeWidth={2} fill="url(#collGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Method pie */}
          <div className="bg-white/[0.03] border border-white/[0.07] rounded-[10px] p-4">
            <div className="text-[11px] font-semibold text-white/50 mb-4 uppercase tracking-wider">By Payment Method</div>
            {methodBreakdown.length === 0 ? (
              <div className="text-center py-12 text-white/20 text-xs">No data</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={methodBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} labelLine={false}>
                    {methodBreakdown.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend iconSize={8} wrapperStyle={{ fontSize: 10, color: "rgba(255,255,255,0.5)" }} />
                  <Tooltip
                    contentStyle={{ background: "#0d0d1a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 11 }}
                    formatter={(v: number) => [`KSh ${v.toLocaleString()}`, ""]}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Status bar chart */}
          <div className="lg:col-span-3 bg-white/[0.03] border border-white/[0.07] rounded-[10px] p-4">
            <div className="text-[11px] font-semibold text-white/50 mb-4 uppercase tracking-wider">Transaction Status Breakdown</div>
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={statusBreakdown} layout="vertical">
                <XAxis type="number" tick={{ fontSize: 9, fill: "rgba(255,255,255,0.3)" }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fill: "rgba(255,255,255,0.4)" }} axisLine={false} tickLine={false} width={70} />
                <Tooltip
                  contentStyle={{ background: "#0d0d1a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 11 }}
                />
                <Bar dataKey="value" fill="hsl(155,100%,42%)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
