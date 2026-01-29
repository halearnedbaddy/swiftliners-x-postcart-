/**
 * Admin API Edge Function
 * Handles admin dashboard, user management, and analytics
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function checkAdminRole(supabase: any, userId: string): Promise<boolean> {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  return !!data;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Create service client for admin operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    // Create client with user's auth for auth checks
    const supabase = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: req.headers.get("Authorization") || "" } },
    });

    const url = new URL(req.url);
    const path = url.pathname.replace("/admin-api", "");
    const method = req.method;

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check admin role
    const isAdmin = await checkAdminRole(supabaseAdmin, user.id);
    if (!isAdmin) {
      return new Response(JSON.stringify({ success: false, error: "Forbidden - Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // GET /dashboard - Dashboard metrics
    if (method === "GET" && (path === "/dashboard" || path === "")) {
      const [profilesRes, transactionsRes, disputesRes, rolesRes] = await Promise.all([
        supabaseAdmin.from("profiles").select("id, user_id, created_at", { count: "exact" }),
        supabaseAdmin.from("transactions").select("id, status, amount"),
        supabaseAdmin.from("disputes").select("id, status"),
        supabaseAdmin.from("user_roles").select("role"),
      ]);

      const profiles = profilesRes.data || [];
      const transactions = transactionsRes.data || [];
      const disputes = disputesRes.data || [];
      const roles = rolesRes.data || [];

      const buyerCount = roles.filter(r => r.role === "buyer").length;
      const sellerCount = roles.filter(r => r.role === "seller").length;

      return new Response(JSON.stringify({
        success: true,
        data: {
          users: {
            total: profiles.length,
            buyers: buyerCount,
            sellers: sellerCount,
          },
          transactions: {
            total: transactions.length,
            pending: transactions.filter(t => t.status === "PENDING").length,
            completed: transactions.filter(t => t.status === "COMPLETED" || t.status === "DELIVERED").length,
          },
          volume: {
            total: transactions.reduce((sum, t) => sum + Number(t.amount || 0), 0),
            currency: "KES",
          },
          disputes: {
            open: disputes.filter(d => d.status === "OPEN" || d.status === "UNDER_REVIEW").length,
          },
        },
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // GET /users - Get all users
    if (method === "GET" && path === "/users") {
      const page = parseInt(url.searchParams.get("page") || "1");
      const limit = parseInt(url.searchParams.get("limit") || "20");

      const { data: profiles, count, error } = await supabaseAdmin
        .from("profiles")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range((page - 1) * limit, page * limit - 1);

      if (error) throw error;

      // Get roles for all users
      const userIds = (profiles || []).map(p => p.user_id);
      const { data: roles } = await supabaseAdmin
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", userIds);

      const roleMap = new Map((roles || []).map(r => [r.user_id, r.role]));
      const usersWithRoles = (profiles || []).map(p => ({
        ...p,
        role: roleMap.get(p.user_id) || "BUYER",
      }));

      return new Response(JSON.stringify({
        success: true,
        data: usersWithRoles,
        pagination: { page, limit, total: count || 0 },
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // POST /users/:id/deactivate - Deactivate user
    if (method === "POST" && path.match(/^\/users\/[a-zA-Z0-9-]+\/deactivate$/)) {
      const userId = path.split("/")[2];

      const { error } = await supabaseAdmin
        .from("profiles")
        .update({ is_active: false, account_status: "SUSPENDED" })
        .eq("user_id", userId);

      if (error) throw error;

      // Log admin action
      await supabaseAdmin.from("admin_logs").insert({
        admin_id: user.id,
        action: "USER_DEACTIVATED",
        target_user_id: userId,
      });

      return new Response(JSON.stringify({ success: true, message: "User deactivated" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // POST /users/:id/activate - Activate user
    if (method === "POST" && path.match(/^\/users\/[a-zA-Z0-9-]+\/activate$/)) {
      const userId = path.split("/")[2];

      const { error } = await supabaseAdmin
        .from("profiles")
        .update({ is_active: true, account_status: "ACTIVE" })
        .eq("user_id", userId);

      if (error) throw error;

      await supabaseAdmin.from("admin_logs").insert({
        admin_id: user.id,
        action: "USER_ACTIVATED",
        target_user_id: userId,
      });

      return new Response(JSON.stringify({ success: true, message: "User activated" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // GET /transactions - Get all transactions
    if (method === "GET" && path === "/transactions") {
      const page = parseInt(url.searchParams.get("page") || "1");
      const limit = parseInt(url.searchParams.get("limit") || "20");
      const status = url.searchParams.get("status");

      let query = supabaseAdmin
        .from("transactions")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false });

      if (status) {
        query = query.eq("status", status);
      }

      const { data, count, error } = await query.range((page - 1) * limit, page * limit - 1);

      if (error) throw error;

      return new Response(JSON.stringify({
        success: true,
        data,
        pagination: { page, limit, total: count || 0 },
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // GET /disputes - Get all disputes
    if (method === "GET" && path === "/disputes") {
      const page = parseInt(url.searchParams.get("page") || "1");
      const limit = parseInt(url.searchParams.get("limit") || "20");
      const status = url.searchParams.get("status");

      let query = supabaseAdmin
        .from("disputes")
        .select("*, transactions(*)", { count: "exact" })
        .order("created_at", { ascending: false });

      if (status) {
        query = query.eq("status", status);
      }

      const { data, count, error } = await query.range((page - 1) * limit, page * limit - 1);

      if (error) throw error;

      return new Response(JSON.stringify({
        success: true,
        data,
        pagination: { page, limit, total: count || 0 },
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // POST /disputes/:id/resolve - Resolve dispute
    if (method === "POST" && path.match(/^\/disputes\/[a-zA-Z0-9-]+\/resolve$/)) {
      const disputeId = path.split("/")[2];
      const { resolution, winner } = await req.json();

      const status = winner === "buyer" ? "RESOLVED_BUYER" : "RESOLVED_SELLER";

      const { error } = await supabaseAdmin
        .from("disputes")
        .update({
          status,
          resolution,
          resolved_by_id: user.id,
          resolved_at: new Date().toISOString(),
        })
        .eq("id", disputeId);

      if (error) throw error;

      await supabaseAdmin.from("admin_logs").insert({
        admin_id: user.id,
        action: "DISPUTE_RESOLVED",
        details: { disputeId, resolution, winner },
      });

      return new Response(JSON.stringify({ success: true, message: "Dispute resolved" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // GET /analytics - Platform analytics
    if (method === "GET" && path === "/analytics") {
      const days = parseInt(url.searchParams.get("days") || "30");
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

      const [transactionsRes, usersRes] = await Promise.all([
        supabaseAdmin
          .from("transactions")
          .select("amount, status, created_at")
          .gte("created_at", startDate),
        supabaseAdmin
          .from("profiles")
          .select("created_at")
          .gte("created_at", startDate),
      ]);

      const transactions = transactionsRes.data || [];
      const newUsers = usersRes.data || [];

      return new Response(JSON.stringify({
        success: true,
        data: {
          period: { days, startDate },
          transactions: {
            count: transactions.length,
            volume: transactions.reduce((sum, t) => sum + Number(t.amount || 0), 0),
            completed: transactions.filter(t => t.status === "COMPLETED").length,
          },
          users: {
            newRegistrations: newUsers.length,
          },
        },
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // GET /stores - Get all stores
    if (method === "GET" && path === "/stores") {
      const page = parseInt(url.searchParams.get("page") || "1");
      const limit = parseInt(url.searchParams.get("limit") || "20");

      const { data, count, error } = await supabaseAdmin
        .from("stores")
        .select("*, profiles!stores_user_id_fkey(name, email, phone)", { count: "exact" })
        .order("created_at", { ascending: false })
        .range((page - 1) * limit, page * limit - 1);

      if (error) throw error;

      return new Response(JSON.stringify({
        success: true,
        data,
        pagination: { page, limit, total: count || 0 },
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: false, error: "Not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Admin API error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
