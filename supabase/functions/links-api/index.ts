import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Content-Type": "application/json",
};

function generateLinkId(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "PL-";
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function getUserId(req: Request): string | null {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.sub ?? null;
  } catch {
    return null;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const url = new URL(req.url);
  const pathParts = url.pathname.split("/").filter(Boolean);
  const fnIndex = pathParts.indexOf("links-api");
  const pathAfter = fnIndex >= 0 ? pathParts.slice(fnIndex + 1) : pathParts;

  try {
    // POST /links-api (create payment link) - auth required
    if (req.method === "POST" && pathAfter.length === 0) {
      const userId = getUserId(req);
      if (!userId) {
        return new Response(
          JSON.stringify({ success: false, error: "Authentication required", code: "NO_AUTH" }),
          { status: 401, headers: corsHeaders }
        );
      }
      const body = await req.json();
      const {
        productName,
        productDescription,
        price,
        originalPrice,
        images,
        customerPhone,
        currency = "KES",
        quantity = 1,
        expiryHours,
      } = body;
      if (!productName || price == null) {
        return new Response(
          JSON.stringify({ success: false, error: "Product name and price are required", code: "VALIDATION_ERROR" }),
          { status: 400, headers: corsHeaders }
        );
      }
      const linkId = generateLinkId();
      const expiryDate = expiryHours
        ? new Date(Date.now() + expiryHours * 60 * 60 * 1000).toISOString()
        : null;
      const frontendUrl = Deno.env.get("FRONTEND_URL") || "http://localhost:5173";

      const { data: link, error } = await supabase
        .from("payment_links")
        .insert({
          id: linkId,
          seller_id: userId,
          product_name: productName,
          product_description: productDescription || null,
          price: Number(price),
          original_price: originalPrice ? Number(originalPrice) : null,
          currency,
          images: images || [],
          customer_phone: customerPhone || null,
          quantity: Number(quantity) || 1,
          expiry_date: expiryDate,
          status: "ACTIVE",
        })
        .select()
        .single();

      if (error) {
        console.error("Create link error:", error);
        return new Response(
          JSON.stringify({ success: false, error: error.message, code: "SERVER_ERROR" }),
          { status: 500, headers: corsHeaders }
        );
      }
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            ...link,
            productName: link.product_name,
            productDescription: link.product_description,
            originalPrice: link.original_price,
            customerPhone: link.customer_phone,
            expiryDate: link.expiry_date,
            linkUrl: `${frontendUrl}/buy/${linkId}`,
          },
        }),
        { status: 201, headers: corsHeaders }
      );
    }

    // GET /links-api/:linkId - get payment link (public)
    if (req.method === "GET" && pathAfter.length === 1) {
      const linkId = pathAfter[0];
      const { data: link, error } = await supabase
        .from("payment_links")
        .select("*")
        .eq("id", linkId)
        .maybeSingle();

      if (error || !link) {
        return new Response(
          JSON.stringify({ success: false, error: "Payment link not found", code: "NOT_FOUND" }),
          { status: 404, headers: corsHeaders }
        );
      }
      if (link.expiry_date && new Date() > new Date(link.expiry_date)) {
        await supabase.from("payment_links").update({ status: "EXPIRED" }).eq("id", linkId);
        return new Response(
          JSON.stringify({ success: false, error: "Payment link has expired", code: "EXPIRED" }),
          { status: 400, headers: corsHeaders }
        );
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("name")
        .eq("user_id", link.seller_id)
        .maybeSingle();
      const { data: sellerProfile } = await supabase
        .from("profiles")
        .select("rating, total_reviews, is_verified")
        .eq("user_id", link.seller_id)
        .maybeSingle();
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            id: link.id,
            productName: link.product_name,
            productDescription: link.product_description,
            price: link.price,
            originalPrice: link.original_price,
            currency: link.currency,
            images: link.images || [],
            status: link.status,
            seller: {
              name: profile?.name || "Seller",
              sellerProfile: sellerProfile ? { rating: sellerProfile.rating, totalReviews: sellerProfile.total_reviews, isVerified: sellerProfile.is_verified } : undefined,
            },
          },
        }),
        { headers: corsHeaders }
      );
    }

    // GET /links-api/seller/my-links - my links (auth)
    if (req.method === "GET" && pathAfter[0] === "seller" && pathAfter[1] === "my-links") {
      const userId = getUserId(req);
      if (!userId) {
        return new Response(
          JSON.stringify({ success: false, error: "Authentication required", code: "NO_AUTH" }),
          { status: 401, headers: corsHeaders }
        );
      }
      const status = url.searchParams.get("status");
      let query = supabase
        .from("payment_links")
        .select("*")
        .eq("seller_id", userId)
        .order("created_at", { ascending: false });
      if (status && status !== "ALL") query = query.eq("status", status);
      const { data: links, error } = await query;
      if (error) {
        return new Response(
          JSON.stringify({ success: false, error: error.message }),
          { status: 500, headers: corsHeaders }
        );
      }
      const formatted = (links || []).map((l: any) => ({
        id: l.id,
        productName: l.product_name,
        productDescription: l.product_description,
        price: l.price,
        originalPrice: l.original_price,
        currency: l.currency,
        images: l.images || [],
        status: l.status,
        clicks: l.clicks,
        purchases: l.purchases,
        revenue: l.revenue,
        createdAt: l.created_at,
        expiryDate: l.expiry_date,
      }));
      return new Response(JSON.stringify({ success: true, data: formatted }), { headers: corsHeaders });
    }

    // PATCH /links-api/:linkId/status - update status (auth, seller)
    if (req.method === "PATCH" && pathAfter.length === 2 && pathAfter[1] === "status") {
      const userId = getUserId(req);
      if (!userId) {
        return new Response(
          JSON.stringify({ success: false, error: "Authentication required", code: "NO_AUTH" }),
          { status: 401, headers: corsHeaders }
        );
      }
      const linkId = pathAfter[0];
      const body = await req.json();
      const { status } = body;
      const { error } = await supabase
        .from("payment_links")
        .update({ status: status || "DELETED", updated_at: new Date().toISOString() })
        .eq("id", linkId)
        .eq("seller_id", userId);
      if (error) {
        return new Response(
          JSON.stringify({ success: false, error: error.message }),
          { status: 500, headers: corsHeaders }
        );
      }
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }

    // POST /links-api/:linkId/purchase - create order (transaction) for Paystack
    if (req.method === "POST" && pathAfter.length === 2 && pathAfter[1] === "purchase") {
      const linkId = pathAfter[0];
      const body = await req.json();
      const {
        buyerPhone,
        buyerEmail,
        deliveryAddress,
        paymentMethod = "PAYSTACK",
        buyerCurrency = "KES",
        quantity = 1,
        buyerName,
      } = body;

      const { data: link, error: linkErr } = await supabase
        .from("payment_links")
        .select("*")
        .eq("id", linkId)
        .maybeSingle();

      if (linkErr || !link) {
        return new Response(
          JSON.stringify({ success: false, error: "Payment link not found", code: "NOT_FOUND" }),
          { status: 404, headers: corsHeaders }
        );
      }
      if (link.status !== "ACTIVE") {
        return new Response(
          JSON.stringify({ success: false, error: `Link is ${link.status.toLowerCase()}`, code: "INVALID_STATUS" }),
          { status: 400, headers: corsHeaders }
        );
      }
      if (link.expiry_date && new Date() > new Date(link.expiry_date)) {
        return new Response(
          JSON.stringify({ success: false, error: "Link has expired", code: "EXPIRED" }),
          { status: 400, headers: corsHeaders }
        );
      }

      const amount = Number(link.price) * (quantity || 1);
      const platformFeePercent = parseFloat(Deno.env.get("PLATFORM_FEE_PERCENT") || "5");
      const platformFee = (amount * platformFeePercent) / 100;
      const sellerPayout = amount - platformFee;
      const transactionId = `ORD-${Date.now().toString(36).toUpperCase()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;

      const { data: tx, error: txErr } = await supabase
        .from("transactions")
        .insert({
          id: transactionId,
          seller_id: link.seller_id,
          item_name: link.product_name,
          item_description: link.product_description,
          item_images: link.images || [],
          amount,
          quantity: quantity || 1,
          currency: link.currency,
          buyer_phone: buyerPhone,
          buyer_name: buyerName || "Buyer",
          buyer_email: buyerEmail || null,
          buyer_address: deliveryAddress || null,
          payment_method: paymentMethod,
          platform_fee: platformFee,
          seller_payout: sellerPayout,
          status: "pending",
        })
        .select()
        .single();

      if (txErr) {
        console.error("Create transaction error:", txErr);
        return new Response(
          JSON.stringify({ success: false, error: txErr.message }),
          { status: 500, headers: corsHeaders }
        );
      }
      return new Response(
        JSON.stringify({ success: true, data: { id: tx.id, transactionId: tx.id } }),
        { status: 201, headers: corsHeaders }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: "Not found" }),
      { status: 404, headers: corsHeaders }
    );
  } catch (err) {
    console.error("links-api error:", err);
    return new Response(
      JSON.stringify({ success: false, error: "Internal server error" }),
      { status: 500, headers: corsHeaders }
    );
  }
});
