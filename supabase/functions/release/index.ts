import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { supabaseAdmin, validateApiKey } from "../_shared/supabase.ts";
import { dispatchWebhook } from "../_shared/webhooks.ts";

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }

  try {
    const apiKey =
      req.headers.get("x-api-key") ||
      req.headers.get("authorization")?.replace("Bearer ", "");

    const { account, error: authError, mode } = await validateApiKey(apiKey || "");
    if (authError || !account) {
      return errorResponse(authError || "Invalid API key", 401);
    }

    const body = await req.json();
    const { hold_id } = body;

    if (!hold_id) {
      return errorResponse("hold_id is required", 400);
    }

    // Verify the hold exists and belongs to account
    const { data: hold, error: holdError } = await supabaseAdmin
      .from("escrow_holds")
      .select("*")
      .eq("id", hold_id)
      .eq("account_id", account.id)
      .single();

    if (holdError || !hold) {
      return errorResponse("Hold not found or not owned by this account", 404);
    }

    if (hold.status !== "HELD") {
      return errorResponse(`Hold must be HELD to release. Current status: ${hold.status}`, 400);
    }

    // Release the hold
    await supabaseAdmin
      .from("escrow_holds")
      .update({
        status: "RELEASED",
        released_at: new Date().toISOString(),
        release_method: "api",
      })
      .eq("id", hold_id);

    // Update transaction status
    if (hold.transaction_id) {
      await supabaseAdmin
        .from("transactions")
        .update({ status: "RELEASED" })
        .eq("id", hold.transaction_id);
    }

    // Dispatch webhook
    await dispatchWebhook({
      event_type: "hold.released",
      account_id: account.id,
      data: {
        hold_id,
        transaction_id: hold.transaction_id,
        amount: hold.amount,
        currency: hold.currency,
        released_at: new Date().toISOString(),
        mode,
      },
    });

    return jsonResponse({
      success: true,
      hold_id,
      status: "RELEASED",
      amount: hold.amount,
      currency: hold.currency,
      released_at: new Date().toISOString(),
      mode,
    });
  } catch (error) {
    console.error("Release error:", error);
    return errorResponse("Internal server error", 500);
  }
});
