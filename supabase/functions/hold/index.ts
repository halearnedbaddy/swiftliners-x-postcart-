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
    const { transaction_id, condition, expiry_hours = 72, description } = body;

    if (!transaction_id) {
      return errorResponse("transaction_id is required", 400);
    }

    // Verify the transaction exists, belongs to account, and is SUCCESS
    const { data: transaction, error: txError } = await supabaseAdmin
      .from("transactions")
      .select("*")
      .eq("id", transaction_id)
      .eq("account_id", account.id)
      .single();

    if (txError || !transaction) {
      return errorResponse("Transaction not found or not owned by this account", 404);
    }

    if (transaction.status !== "SUCCESS") {
      return errorResponse(
        `Transaction must be SUCCESS to hold. Current status: ${transaction.status}`,
        400
      );
    }

    // Check if already held
    const { data: existingHold } = await supabaseAdmin
      .from("escrow_holds")
      .select("id")
      .eq("transaction_id", transaction_id)
      .eq("status", "HELD")
      .single();

    if (existingHold) {
      return errorResponse("Transaction already has an active hold", 409);
    }

    const holdId = `hold_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
    const expiresAt = new Date(Date.now() + expiry_hours * 60 * 60 * 1000).toISOString();

    const { data: hold, error: holdError } = await supabaseAdmin
      .from("escrow_holds")
      .insert({
        id: holdId,
        account_id: account.id,
        transaction_id,
        amount: transaction.amount,
        currency: transaction.currency || "KES",
        phone: transaction.phone,
        payment_method: transaction.payment_method,
        status: "HELD",
        expires_at: expiresAt,
        description: description || null,
        release_method: condition || "manual",
        metadata: { mode },
      })
      .select()
      .single();

    if (holdError) {
      console.error("Hold creation error:", holdError);
      return errorResponse("Failed to create hold", 500);
    }

    // Update transaction status
    await supabaseAdmin
      .from("transactions")
      .update({ status: "HELD" })
      .eq("id", transaction_id);

    // Dispatch webhook
    await dispatchWebhook({
      event_type: "hold.created",
      account_id: account.id,
      data: {
        hold_id: holdId,
        transaction_id,
        amount: transaction.amount,
        currency: transaction.currency || "KES",
        expires_at: expiresAt,
        condition: condition || "manual",
        mode,
      },
    });

    return jsonResponse({
      success: true,
      hold_id: holdId,
      status: "HELD",
      expires_at: expiresAt,
      amount: transaction.amount,
      currency: transaction.currency || "KES",
      mode,
    });
  } catch (error) {
    console.error("Hold error:", error);
    return errorResponse("Internal server error", 500);
  }
});
