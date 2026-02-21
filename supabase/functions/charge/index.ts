import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { supabaseAdmin, validateApiKey } from "../_shared/supabase.ts";
import { initiateSTKPush } from "../_shared/daraja.ts";
import { dispatchWebhook } from "../_shared/webhooks.ts";

// Fee calculation: 2.5% + KSh 20 (2000 cents)
const FEE_PERCENTAGE = 0.025;
const FEE_FIXED = 2000; // 20 KSh in cents

function calculateFee(amount: number): number {
  return Math.round(amount * FEE_PERCENTAGE) + FEE_FIXED;
}

// Detect payment provider from phone number prefix
function detectProvider(phone: string): "MPESA" | "AIRTEL" | null {
  const cleanPhone = phone.replace(/\D/g, "");
  const mpesaPrefixes = ["2547", "2541", "01", "07"];
  const airtelPrefixes = ["2548", "2550", "08", "050"];

  for (const prefix of mpesaPrefixes) {
    if (cleanPhone.startsWith(prefix)) return "MPESA";
  }
  for (const prefix of airtelPrefixes) {
    if (cleanPhone.startsWith(prefix)) return "AIRTEL";
  }
  if (cleanPhone.startsWith("254") || cleanPhone.startsWith("0")) {
    return "MPESA";
  }
  return null;
}

// Format phone number to international format
function formatPhone(phone: string): string {
  let cleaned = phone.replace(/\D/g, "");
  if (cleaned.startsWith("0")) {
    cleaned = "254" + cleaned.slice(1);
  }
  if (!cleaned.startsWith("254")) {
    cleaned = "254" + cleaned;
  }
  return cleaned;
}

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
    const { amount, phone, currency = "KES", description, external_ref } = body;

    if (!amount || typeof amount !== "number" || amount < 100) {
      return errorResponse("Amount must be at least 100 cents (KSh 1)", 400);
    }
    if (!phone) {
      return errorResponse("Phone number is required", 400);
    }

    const formattedPhone = formatPhone(phone);
    if (formattedPhone.length < 12) {
      return errorResponse("Invalid phone number format", 400);
    }

    const paymentMethod = detectProvider(formattedPhone);
    if (!paymentMethod) {
      return errorResponse("Unsupported phone number. Use Safaricom or Airtel numbers.", 400);
    }

    const feeAmount = calculateFee(amount);
    const transactionId = `txn_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;

    // Create transaction record
    const { data: transaction, error: txError } = await supabaseAdmin
      .from("transactions")
      .insert({
        id: transactionId,
        account_id: account.id,
        amount,
        currency,
        phone: formattedPhone,
        payment_method: paymentMethod,
        description: description || null,
        status: "PENDING",
        fee_amount: feeAmount,
        fee_percentage: FEE_PERCENTAGE,
        external_ref: external_ref || null,
        metadata: {
          mode,
          ip: req.headers.get("x-forwarded-for") || "unknown",
        },
      })
      .select()
      .single();

    if (txError) {
      console.error("Transaction creation error:", txError);
      return errorResponse("Failed to create transaction", 500);
    }

    // ===== SANDBOX MODE =====
    if (mode === "sandbox") {
      // Simulate async callback after 3 seconds
      setTimeout(async () => {
        const success = Math.random() > 0.2; // 80% success rate
        await supabaseAdmin
          .from("transactions")
          .update({
            status: success ? "SUCCESS" : "FAILED",
            completed_at: new Date().toISOString(),
            provider_ref: success ? `SANDBOX_${Date.now()}` : null,
            metadata: {
              ...transaction.metadata,
              sandbox_simulated: true,
            },
          })
          .eq("id", transactionId);

        // Fire webhook
        await dispatchWebhook({
          event_type: success ? "charge.success" : "charge.failed",
          account_id: account.id,
          data: {
            transaction_id: transactionId,
            amount,
            currency,
            phone: formattedPhone,
            status: success ? "SUCCESS" : "FAILED",
            mode: "sandbox",
          },
        });
      }, 3000);

      return jsonResponse({
        success: true,
        transaction_id: transactionId,
        status: "PENDING",
        message: `[SANDBOX] STK Push simulated to ${formattedPhone}. Check status in ~3 seconds.`,
        mode: "sandbox",
        amount,
        fee: feeAmount,
        net_amount: amount - feeAmount,
      });
    }

    // ===== LIVE MODE - Daraja STK Push =====
    if (paymentMethod !== "MPESA") {
      return errorResponse("Only M-Pesa is currently supported for live payments", 400);
    }

    try {
      const callbackUrl =
        Deno.env.get("DARAJA_CALLBACK_URL") ||
        `${Deno.env.get("SUPABASE_URL")}/functions/v1/mpesa-callback`;

      const stkResult = await initiateSTKPush({
        phone: formattedPhone,
        amount,
        accountRef: transactionId,
        description: description || "Payment",
        callbackUrl,
      });

      // Store the checkout request ID for later status queries
      await supabaseAdmin
        .from("transactions")
        .update({
          metadata: {
            ...transaction.metadata,
            checkout_request_id: stkResult.CheckoutRequestID,
            merchant_request_id: stkResult.MerchantRequestID,
          },
        })
        .eq("id", transactionId);

      return jsonResponse({
        success: true,
        transaction_id: transactionId,
        status: "PENDING",
        message: `STK Push sent to ${formattedPhone}`,
        amount,
        currency,
        fee: feeAmount,
        payment_method: paymentMethod,
        checkout_request_id: stkResult.CheckoutRequestID,
      });
    } catch (darajaError) {
      console.error("Daraja STK Push error:", darajaError);

      await supabaseAdmin
        .from("transactions")
        .update({
          status: "FAILED",
          metadata: {
            ...transaction.metadata,
            daraja_error: String(darajaError),
          },
        })
        .eq("id", transactionId);

      return errorResponse(`STK Push failed: ${(darajaError as Error).message}`, 502);
    }
  } catch (error) {
    console.error("Charge error:", error);
    return errorResponse("Internal server error", 500);
  }
});
