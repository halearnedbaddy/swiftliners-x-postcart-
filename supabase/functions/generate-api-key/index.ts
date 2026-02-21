import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { supabaseAdmin, createUserClient } from "../_shared/supabase.ts";

serve(async (req) => {
  // Handle CORS
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    // Get authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return errorResponse("Authorization required", 401);
    }

    // Create user client and get user
    const supabase = createUserClient(authHeader);
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return errorResponse("Invalid token", 401);
    }

    // Parse request body
    const { type } = await req.json().catch(() => ({ type: "sandbox" }));

    // Get user's account
    const { data: account, error: accountError } = await supabaseAdmin
      .from("accounts")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (accountError || !account) {
      return errorResponse("Account not found", 404);
    }

    if (type === "sandbox") {
      // Generate sandbox API key
      const sandboxKey = `sk_test_kzh_${crypto.randomUUID().replace(/-/g, "").slice(0, 24)}`;

      // Update account with new sandbox key
      const { error: updateError } = await supabaseAdmin
        .from("accounts")
        .update({ sandbox_api_key: sandboxKey })
        .eq("id", account.id);

      if (updateError) {
        return errorResponse("Failed to generate key", 500);
      }

      return jsonResponse({
        success: true,
        api_key: sandboxKey,
        type: "sandbox",
        message: "Sandbox API key generated successfully",
      });
    }

    if (type === "live") {
      // Check if account is approved
      if (account.status !== "APPROVED") {
        return errorResponse("Account must be approved to generate live keys", 403);
      }

      // Generate live API key
      const liveKey = `sk_live_kzh_${crypto.randomUUID().replace(/-/g, "").slice(0, 24)}`;
      const lastFour = liveKey.slice(-4);

      // In production, you'd hash the key with bcrypt before storing
      // For now, we just store the hash placeholder and last 4 digits
      const { error: updateError } = await supabaseAdmin
        .from("accounts")
        .update({
          live_api_key_hash: `hashed_${liveKey}`, // Replace with actual bcrypt hash
          api_key_last_four: lastFour,
        })
        .eq("id", account.id);

      if (updateError) {
        return errorResponse("Failed to generate key", 500);
      }

      return jsonResponse({
        success: true,
        api_key: liveKey,
        type: "live",
        last_four: lastFour,
        message: "Live API key generated. Store this securely - it won't be shown again!",
      });
    }

    return errorResponse("Invalid key type. Use 'sandbox' or 'live'", 400);
  } catch (error) {
    console.error("Error:", error);
    return errorResponse("Internal server error", 500);
  }
});
