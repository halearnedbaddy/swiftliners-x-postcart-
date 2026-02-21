import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { handleCors, jsonResponse } from "../_shared/cors.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";
import { dispatchWebhook } from "../_shared/webhooks.ts";

// M-Pesa Daraja STK Push callback handler
serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== "POST") {
    return jsonResponse({ ResultCode: 0, ResultDesc: "Accepted" });
  }

  try {
    const body = await req.json();
    console.log("M-Pesa callback received:", JSON.stringify(body));

    const stkCallback = body?.Body?.stkCallback;
    if (!stkCallback) {
      console.error("Invalid callback body");
      return jsonResponse({ ResultCode: 0, ResultDesc: "Accepted" });
    }

    const {
      MerchantRequestID,
      CheckoutRequestID,
      ResultCode,
      ResultDesc,
      CallbackMetadata,
    } = stkCallback;

    // Find the transaction by checkout_request_id stored in metadata
    const { data: transactions } = await supabaseAdmin
      .from("transactions")
      .select("*")
      .filter("metadata->>checkout_request_id", "eq", CheckoutRequestID);

    if (!transactions || transactions.length === 0) {
      console.error("Transaction not found for CheckoutRequestID:", CheckoutRequestID);
      return jsonResponse({ ResultCode: 0, ResultDesc: "Accepted" });
    }

    const transaction = transactions[0];
    const success = ResultCode === 0;

    // Extract metadata from callback
    let mpesaReceiptNumber = null;
    let transactionDate = null;
    let phoneNumber = null;

    if (success && CallbackMetadata?.Item) {
      for (const item of CallbackMetadata.Item) {
        switch (item.Name) {
          case "MpesaReceiptNumber":
            mpesaReceiptNumber = item.Value;
            break;
          case "TransactionDate":
            transactionDate = item.Value;
            break;
          case "PhoneNumber":
            phoneNumber = item.Value;
            break;
        }
      }
    }

    // Update transaction
    await supabaseAdmin
      .from("transactions")
      .update({
        status: success ? "SUCCESS" : "FAILED",
        completed_at: new Date().toISOString(),
        provider_ref: mpesaReceiptNumber,
        metadata: {
          ...transaction.metadata,
          callback_result_code: ResultCode,
          callback_result_desc: ResultDesc,
          mpesa_receipt: mpesaReceiptNumber,
          mpesa_transaction_date: transactionDate,
          mpesa_phone: phoneNumber,
        },
      })
      .eq("id", transaction.id);

    // Dispatch webhook
    await dispatchWebhook({
      event_type: success ? "charge.success" : "charge.failed",
      account_id: transaction.account_id,
      data: {
        transaction_id: transaction.id,
        amount: transaction.amount,
        currency: transaction.currency,
        phone: transaction.phone,
        status: success ? "SUCCESS" : "FAILED",
        provider_ref: mpesaReceiptNumber,
        result_desc: ResultDesc,
      },
    });

    return jsonResponse({ ResultCode: 0, ResultDesc: "Accepted" });
  } catch (error) {
    console.error("M-Pesa callback error:", error);
    return jsonResponse({ ResultCode: 0, ResultDesc: "Accepted" });
  }
});
