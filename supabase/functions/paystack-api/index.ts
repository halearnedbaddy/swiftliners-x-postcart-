import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Content-Type": "application/json",
};

function getPathAfter(url: URL, name: string): string[] {
  const pathParts = url.pathname.split("/").filter(Boolean);
  const idx = pathParts.indexOf(name);
  return idx >= 0 ? pathParts.slice(idx + 1) : pathParts;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const secretKey = Deno.env.get("PAYSTACK_SECRET_KEY");
  const publicKey = Deno.env.get("PAYSTACK_PUBLIC_KEY") || "";
  const frontendUrl = Deno.env.get("FRONTEND_URL") || "http://localhost:5173";
  const platformFeePercent = parseFloat(Deno.env.get("PLATFORM_FEE_PERCENT") || "5");

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const url = new URL(req.url);
  const pathAfter = getPathAfter(url, "paystack-api");

  try {
    // GET /paystack-api/config - public key for frontend
    if (req.method === "GET" && pathAfter.length === 1 && pathAfter[0] === "config") {
      return new Response(
        JSON.stringify({ success: true, data: { publicKey } }),
        { headers: corsHeaders }
      );
    }

    // POST /paystack-api/initialize - initialize Paystack transaction
    if (req.method === "POST" && pathAfter.length === 1 && pathAfter[0] === "initialize") {
      if (!secretKey) {
        return new Response(
          JSON.stringify({ success: false, error: "Paystack not configured", code: "CONFIG_ERROR" }),
          { status: 500, headers: corsHeaders }
        );
      }
      const body = await req.json();
      const { transactionId, email, metadata } = body;
      if (!transactionId || !email) {
        return new Response(
          JSON.stringify({ success: false, error: "Missing transactionId or email", code: "VALIDATION_ERROR" }),
          { status: 400, headers: corsHeaders }
        );
      }

      const { data: transaction, error: txErr } = await supabase
        .from("transactions")
        .select("id, amount, item_name, seller_id, status")
        .eq("id", transactionId)
        .maybeSingle();

      if (txErr || !transaction) {
        return new Response(
          JSON.stringify({ success: false, error: "Transaction not found", code: "NOT_FOUND" }),
          { status: 404, headers: corsHeaders }
        );
      }
      const status = (transaction as any).status?.toLowerCase?.() || (transaction as any).status;
      if (status !== "pending" && status !== "PENDING") {
        return new Response(
          JSON.stringify({ success: false, error: "Transaction is not available for payment", code: "INVALID_STATUS" }),
          { status: 400, headers: corsHeaders }
        );
      }

      const amountKobo = Math.round(Number(transaction.amount) * 100);
      const reference = `TXN-${transactionId.slice(0, 8)}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
      const linkId = metadata?.linkId;
      const callbackUrl = linkId
        ? `${frontendUrl}/buy/${linkId}?payment=success&reference=${reference}`
        : `${frontendUrl}/payment/callback?reference=${reference}`;

      const initRes = await fetch("https://api.paystack.co/transaction/initialize", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${secretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          amount: amountKobo,
          currency: "KES",
          reference,
          callback_url: callbackUrl,
          metadata: {
            transactionId,
            itemName: transaction.item_name,
            sellerId: transaction.seller_id,
            ...metadata,
          },
        }),
      });

      const initData = await initRes.json();
      if (!initData.status || !initData.data?.authorization_url) {
        return new Response(
          JSON.stringify({ success: false, error: initData.message || "Paystack initialize failed", code: "PAYSTACK_ERROR" }),
          { status: 400, headers: corsHeaders }
        );
      }

      await supabase
        .from("transactions")
        .update({
          payment_reference: reference,
          status: "processing",
          updated_at: new Date().toISOString(),
        })
        .eq("id", transactionId);

      return new Response(
        JSON.stringify({
          success: true,
          data: {
            authorization_url: initData.data.authorization_url,
            authorizationUrl: initData.data.authorization_url,
            access_code: initData.data.access_code,
            reference: initData.data.reference,
          },
        }),
        { headers: corsHeaders }
      );
    }

    // POST /paystack-api/verify - verify by transactionId + reference (frontend sends both)
    if (req.method === "POST" && pathAfter.length === 1 && pathAfter[0] === "verify") {
      if (!secretKey) {
        return new Response(
          JSON.stringify({ success: false, error: "Paystack not configured", code: "CONFIG_ERROR" }),
          { status: 500, headers: corsHeaders }
        );
      }
      const body = await req.json();
      const { transactionId, reference } = body;
      if (!reference) {
        return new Response(
          JSON.stringify({ success: false, error: "Payment reference required", code: "VALIDATION_ERROR" }),
          { status: 400, headers: corsHeaders }
        );
      }

      const verifyRes = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
        headers: { Authorization: `Bearer ${secretKey}` },
      });
      const verifyData = await verifyRes.json();
      if (!verifyData.status || verifyData.data?.status !== "success") {
        return new Response(
          JSON.stringify({ success: false, error: "Payment verification failed", code: "VERIFY_FAILED" }),
          { status: 400, headers: corsHeaders }
        );
      }

      const meta = verifyData.data?.metadata || {};
      const txnId = transactionId || meta.transactionId;
      if (!txnId) {
        return new Response(
          JSON.stringify({ success: false, error: "Transaction not found in payment", code: "NOT_FOUND" }),
          { status: 400, headers: corsHeaders }
        );
      }

      const { data: transaction, error: txErr } = await supabase
        .from("transactions")
        .select("id, amount, seller_id, status")
        .eq("id", txnId)
        .maybeSingle();

      if (txErr || !transaction) {
        return new Response(
          JSON.stringify({ success: false, error: "Transaction not found", code: "NOT_FOUND" }),
          { status: 404, headers: corsHeaders }
        );
      }
      const status = (transaction as any).status?.toLowerCase?.() || (transaction as any).status;
      if (status === "paid" || status === "PAID") {
        return new Response(
          JSON.stringify({ success: true, data: { status: "success", reference, paidAt: verifyData.data?.paid_at } }),
          { headers: corsHeaders }
        );
      }

      const amount = Number(transaction.amount);
      const paidAmount = (verifyData.data?.amount || 0) / 100;
      if (paidAmount < amount) {
        return new Response(
          JSON.stringify({ success: false, error: "Paid amount is less than transaction amount", code: "AMOUNT_MISMATCH" }),
          { status: 400, headers: corsHeaders }
        );
      }

      const platformFee = (amount * platformFeePercent) / 100;
      const sellerPayout = amount - platformFee;
      const linkId = meta.linkId;

      await supabase
        .from("transactions")
        .update({
          status: "paid",
          payment_reference: reference,
          platform_fee: platformFee,
          seller_payout: sellerPayout,
          payment_method: "PAYSTACK",
          paid_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", txnId);

      if (linkId) {
        const { data: link } = await supabase
          .from("payment_links")
          .select("id, purchases, revenue")
          .eq("id", linkId)
          .maybeSingle();
        if (link) {
          await supabase
            .from("payment_links")
            .update({
              purchases: (Number((link as any).purchases) || 0) + 1,
              revenue: (Number((link as any).revenue) || 0) + amount,
              updated_at: new Date().toISOString(),
            })
            .eq("id", linkId);
        }
      }

      const { data: wallet } = await supabase
        .from("wallets")
        .select("pending_balance")
        .eq("user_id", transaction.seller_id)
        .maybeSingle();
      const currentPending = Number((wallet as any)?.pending_balance) || 0;
      if (wallet) {
        await supabase
          .from("wallets")
          .update({
            pending_balance: currentPending + sellerPayout,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", transaction.seller_id);
      } else {
        await supabase.from("wallets").insert({
          user_id: transaction.seller_id,
          pending_balance: sellerPayout,
          available_balance: 0,
          total_earned: 0,
          total_spent: 0,
          updated_at: new Date().toISOString(),
        });
      }

      return new Response(
        JSON.stringify({
          success: true,
          data: {
            status: "success",
            amount: paidAmount,
            reference: verifyData.data?.reference,
            paidAt: verifyData.data?.paid_at,
            channel: verifyData.data?.channel,
          },
        }),
        { headers: corsHeaders }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: "Not found" }),
      { status: 404, headers: corsHeaders }
    );
  } catch (err) {
    console.error("paystack-api error:", err);
    return new Response(
      JSON.stringify({ success: false, error: "Internal server error" }),
      { status: 500, headers: corsHeaders }
    );
  }
});
