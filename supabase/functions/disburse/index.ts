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
    const { hold_id, splits } = body;

    if (!hold_id) {
      return errorResponse("hold_id is required", 400);
    }
    if (!splits || !Array.isArray(splits) || splits.length === 0) {
      return errorResponse("splits array is required with at least one recipient", 400);
    }

    // Validate splits total to 100%
    const totalPercentage = splits.reduce(
      (sum: number, s: { percentage: number }) => sum + (s.percentage || 0),
      0
    );
    if (Math.abs(totalPercentage - 100) > 0.01) {
      return errorResponse(
        `Split percentages must total 100%. Current total: ${totalPercentage}%`,
        400
      );
    }

    // Verify the hold exists, belongs to account, and is RELEASED
    const { data: hold, error: holdError } = await supabaseAdmin
      .from("escrow_holds")
      .select("*")
      .eq("id", hold_id)
      .eq("account_id", account.id)
      .single();

    if (holdError || !hold) {
      return errorResponse("Hold not found or not owned by this account", 404);
    }

    if (hold.status !== "RELEASED") {
      return errorResponse(
        `Hold must be RELEASED to disburse. Current status: ${hold.status}`,
        400
      );
    }

    // Calculate split amounts
    const disbursementResults = [];

    for (const split of splits) {
      const { phone, percentage, name } = split;
      if (!phone || !percentage) {
        return errorResponse("Each split must have phone and percentage", 400);
      }

      const splitAmount = Math.round(hold.amount * (percentage / 100));
      const disbId = `disb_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;

      // Format phone
      let cleanPhone = phone.replace(/\D/g, "");
      if (cleanPhone.startsWith("0")) cleanPhone = "254" + cleanPhone.slice(1);
      if (!cleanPhone.startsWith("254")) cleanPhone = "254" + cleanPhone;

      const { error: disbError } = await supabaseAdmin
        .from("disbursements")
        .insert({
          id: disbId,
          hold_id,
          account_id: account.id,
          amount: splitAmount,
          currency: hold.currency,
          recipient_phone: cleanPhone,
          recipient_name: name || null,
          payment_method: "MPESA",
          status: mode === "sandbox" ? "QUEUED" : "QUEUED",
          metadata: { mode, percentage },
        });

      if (disbError) {
        console.error("Disbursement insert error:", disbError);
        continue;
      }

      // In sandbox mode, simulate completion after delay
      if (mode === "sandbox") {
        setTimeout(async () => {
          const success = Math.random() > 0.1; // 90% success
          await supabaseAdmin
            .from("disbursements")
            .update({
              status: success ? "COMPLETED" : "FAILED",
              completed_at: success ? new Date().toISOString() : null,
              failed_at: success ? null : new Date().toISOString(),
              failure_reason: success ? null : "Sandbox simulated failure",
              provider_ref: success ? `SANDBOX_B2C_${Date.now()}` : null,
            })
            .eq("id", disbId);
        }, 5000);
      }

      // Mask phone for response
      const maskedPhone = cleanPhone.slice(0, 6) + "***" + cleanPhone.slice(-3);

      disbursementResults.push({
        disbursement_id: disbId,
        phone: maskedPhone,
        name: name || null,
        amount: splitAmount,
        percentage,
        status: "QUEUED",
      });
    }

    // Update hold status
    await supabaseAdmin
      .from("escrow_holds")
      .update({
        status: "DISBURSED",
        metadata: { ...hold.metadata, disbursed_at: new Date().toISOString() },
      })
      .eq("id", hold_id);

    // Dispatch webhook
    await dispatchWebhook({
      event_type: "disburse.success",
      account_id: account.id,
      data: {
        hold_id,
        splits: disbursementResults,
        total_amount: hold.amount,
        currency: hold.currency,
        mode,
      },
    });

    return jsonResponse({
      success: true,
      hold_id,
      status: "DISBURSING",
      total_amount: hold.amount,
      currency: hold.currency,
      splits: disbursementResults,
      mode,
    });
  } catch (error) {
    console.error("Disburse error:", error);
    return errorResponse("Internal server error", 500);
  }
});
