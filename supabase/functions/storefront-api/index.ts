/**
 * Storefront API Edge Function
 * Public-facing API for viewing stores and products
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!
    );

    const url = new URL(req.url);
    const pathParts = url.pathname.split("/").filter(Boolean);
    const idx = pathParts.indexOf("storefront-api");
    const path = idx >= 0 ? "/" + (pathParts.slice(idx + 1).join("/") || "") : url.pathname;
    const method = req.method;

    // GET /store/:slug - Get public store by slug
    if (method === "GET" && path.match(/^\/store\/[a-zA-Z0-9-_]+$/)) {
      const slug = path.replace("/store/", "");

      const { data: store, error } = await supabase
        .from("stores")
        .select(`
          *,
          products!inner(*)
        `)
        .eq("slug", slug)
        .eq("status", "active")
        .eq("visibility", "PUBLIC")
        .eq("products.status", "published")
        .maybeSingle();

      if (error && !error.message.includes("rows")) throw error;

      // If no products match, try getting store without inner join
      if (!store) {
        const { data: storeOnly, error: storeError } = await supabase
          .from("stores")
          .select("*")
          .eq("slug", slug)
          .eq("status", "active")
          .eq("visibility", "PUBLIC")
          .maybeSingle();

        if (storeError) throw storeError;

        if (!storeOnly) {
          return new Response(JSON.stringify({ success: false, error: "Store not found" }), {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Get products separately
        const { data: products } = await supabase
          .from("products")
          .select("*")
          .eq("store_id", storeOnly.id)
          .eq("status", "published")
          .order("updated_at", { ascending: false });

        return new Response(JSON.stringify({
          success: true,
          data: { ...storeOnly, products: products || [] },
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true, data: store }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // GET /product/:slug/:id - Get public product
    if (method === "GET" && path.match(/^\/product\/[a-zA-Z0-9-_]+\/[a-zA-Z0-9-]+$/)) {
      const parts = path.replace("/product/", "").split("/");
      const storeSlug = parts[0];
      const productId = parts[1];

      // Get store first
      const { data: store } = await supabase
        .from("stores")
        .select("id")
        .eq("slug", storeSlug)
        .eq("status", "active")
        .maybeSingle();

      if (!store) {
        return new Response(JSON.stringify({ success: false, error: "Store not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: product, error } = await supabase
        .from("products")
        .select("*")
        .eq("id", productId)
        .eq("store_id", store.id)
        .eq("status", "published")
        .maybeSingle();

      if (error) throw error;

      if (!product) {
        return new Response(JSON.stringify({ success: false, error: "Product not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true, data: product }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // POST /checkout/:slug/:productId - Create transaction from product
    if (method === "POST" && path.match(/^\/checkout\/[a-zA-Z0-9-_]+\/[a-zA-Z0-9-]+$/)) {
      const parts = path.replace("/checkout/", "").split("/");
      const storeSlug = parts[0];
      const productId = parts[1];
      const { buyerName, buyerPhone, buyerEmail, paymentMethod } = await req.json();

      if (!buyerName || !buyerPhone) {
        return new Response(JSON.stringify({ success: false, error: "Buyer name and phone required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get store
      const { data: store } = await supabase
        .from("stores")
        .select("id, seller_id")
        .eq("slug", storeSlug)
        .eq("status", "active")
        .maybeSingle();

      if (!store) {
        return new Response(JSON.stringify({ success: false, error: "Store not available" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get product
      const { data: product } = await supabase
        .from("products")
        .select("*")
        .eq("id", productId)
        .eq("store_id", store.id)
        .eq("status", "published")
        .maybeSingle();

      if (!product) {
        return new Response(JSON.stringify({ success: false, error: "Product not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!product.price) {
        return new Response(JSON.stringify({ success: false, error: "Product price not set" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Create transaction with unique ID
      const transactionId = `ORD-${Date.now().toString(36).toUpperCase()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
      const platformFeePercent = parseFloat(Deno.env.get("PLATFORM_FEE_PERCENT") || "5");
      const platformFee = (product.price * platformFeePercent) / 100;
      const sellerPayout = product.price - platformFee;

      const { data: transaction, error } = await supabase
        .from("transactions")
        .insert({
          id: transactionId,
          seller_id: store.seller_id,
          product_id: productId,
          item_name: product.name,
          item_description: product.description,
          item_images: product.images || [],
          amount: product.price,
          currency: product.currency || "KES",
          buyer_name: buyerName,
          buyer_phone: buyerPhone,
          buyer_email: buyerEmail,
          payment_method: paymentMethod || "PAYSTACK",
          platform_fee: platformFee,
          seller_payout: sellerPayout,
          status: "pending",
        })
        .select()
        .single();

      if (error) throw error;

      return new Response(JSON.stringify({
        success: true,
        data: {
          ...transaction,
          paymentLink: `/pay/${transaction.id}`,
        },
      }), {
        status: 201,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // GET /stores - List all public stores
    if (method === "GET" && (path === "/stores" || path === "/stores/")) {
      const page = parseInt(url.searchParams.get("page") || "1");
      const limit = parseInt(url.searchParams.get("limit") || "20");

      const { data: stores, error, count } = await supabase
        .from("stores")
        .select("id, name, slug, bio, logo", { count: "exact" })
        .eq("status", "active")
        .eq("visibility", "PUBLIC")
        .order("created_at", { ascending: false })
        .range((page - 1) * limit, page * limit - 1);

      if (error) throw error;

      return new Response(JSON.stringify({
        success: true,
        data: stores,
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit),
        },
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: false, error: "Not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Storefront API error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
