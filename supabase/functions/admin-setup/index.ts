import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const expectedToken = Deno.env.get("ADMIN_SETUP_TOKEN") || "";

    if (!expectedToken) {
      return json(500, { success: false, error: "ADMIN_SETUP_TOKEN is not configured" });
    }

    const { token } = (await req.json().catch(() => ({}))) as { token?: string };
    if (!token || token.trim() !== expectedToken) {
      return json(401, { success: false, error: "Invalid setup token" });
    }

    // Authenticated user (JWT required, validated by Supabase when invoking functions)
    const supabaseUser = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: req.headers.get("Authorization") || "" } },
    });

    const {
      data: { user },
    } = await supabaseUser.auth.getUser();

    if (!user) {
      return json(401, { success: false, error: "Unauthorized" });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    // Ensure a single role: remove existing roles then set admin
    const delRes = await supabaseAdmin.from("user_roles").delete().eq("user_id", user.id);
    if (delRes.error) {
      return json(500, { success: false, error: delRes.error.message });
    }

    const insRes = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: user.id, role: "admin" });

    if (insRes.error) {
      return json(500, { success: false, error: insRes.error.message });
    }

    return json(200, { success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("admin-setup error:", message);
    return json(500, { success: false, error: message });
  }
});
