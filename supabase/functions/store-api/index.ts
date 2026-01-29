/**
 * Store API Edge Function
 * Handles store CRUD operations, products, and social accounts
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
    );

    // Verify user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: authData, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !authData.user) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = authData.user.id;
    const url = new URL(req.url);
    const path = url.pathname.replace("/store-api", "");
    const method = req.method;

    // Route handlers
    // GET /store - Get user's store
    if (method === "GET" && (path === "" || path === "/")) {
      const { data: store, error } = await supabase
        .from("stores")
        .select("*, social_accounts(*)")
        .eq("seller_id", userId)
        .maybeSingle();

      if (error) throw error;
      return new Response(JSON.stringify({ success: true, data: store }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // POST /store - Create store
    if (method === "POST" && (path === "" || path === "/")) {
      const { name, slug, bio, logo } = await req.json();
      
      if (!name || !slug) {
        return new Response(JSON.stringify({ success: false, error: "Name and slug are required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check if user already has a store
      const { data: existing } = await supabase
        .from("stores")
        .select("id")
        .eq("seller_id", userId)
        .maybeSingle();

      if (existing) {
        return new Response(JSON.stringify({ success: false, error: "User already has a store" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check if slug is taken
      const { data: slugExists } = await supabase
        .from("stores")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();

      if (slugExists) {
        return new Response(JSON.stringify({ success: false, error: "Slug already taken" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: store, error } = await supabase
        .from("stores")
        .insert({ seller_id: userId, name, slug, bio, logo, status: "inactive", visibility: "PRIVATE" })
        .select()
        .single();

      if (error) throw error;
      return new Response(JSON.stringify({ success: true, data: store }), {
        status: 201,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // PUT /store - Update store
    if (method === "PUT" && (path === "" || path === "/")) {
      const body = await req.json();
      const { name, slug, bio, logo, visibility, status } = body;

      const { data: store, error } = await supabase
        .from("stores")
        .update({ 
          ...(name && { name }),
          ...(slug && { slug }),
          ...(bio !== undefined && { bio }),
          ...(logo !== undefined && { logo }),
          ...(visibility && { visibility }),
          ...(status && { status }),
          updated_at: new Date().toISOString()
        })
        .eq("seller_id", userId)
        .select()
        .single();

      if (error) throw error;
      return new Response(JSON.stringify({ success: true, data: store }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // GET /store/products - Get store products
    if (method === "GET" && path === "/products") {
      const status = url.searchParams.get("status") || "all";
      
      const { data: store } = await supabase
        .from("stores")
        .select("id")
        .eq("seller_id", userId)
        .maybeSingle();

      if (!store) {
        return new Response(JSON.stringify({ success: true, data: [] }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let query = supabase.from("products").select("*").eq("store_id", store.id);
      if (status !== "all") {
        query = query.eq("status", status);
      }
      
      const { data: products, error } = await query.order("updated_at", { ascending: false });
      if (error) throw error;

      return new Response(JSON.stringify({ success: true, data: products }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // POST /store/products - Create product
    if (method === "POST" && path === "/products") {
      const { name, description, price, images } = await req.json();

      if (!name) {
        return new Response(JSON.stringify({ success: false, error: "Product name is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: store } = await supabase
        .from("stores")
        .select("id")
        .eq("seller_id", userId)
        .maybeSingle();

      if (!store) {
        return new Response(JSON.stringify({ success: false, error: "Create a store first" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: product, error } = await supabase
        .from("products")
        .insert({
          store_id: store.id,
          name,
          description,
          price,
          images: images || [],
          status: "DRAFT",
        })
        .select()
        .single();

      if (error) throw error;
      return new Response(JSON.stringify({ success: true, data: product }), {
        status: 201,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // PUT /store/products/:id - Update product
    if (method === "PUT" && path.startsWith("/products/")) {
      const productId = path.replace("/products/", "");
      const { name, description, price, images, status } = await req.json();

      const { data: product, error } = await supabase
        .from("products")
        .update({
          ...(name && { name }),
          ...(description !== undefined && { description }),
          ...(price !== undefined && { price }),
          ...(images !== undefined && { images }),
          ...(status && { status }),
          updated_at: new Date().toISOString()
        })
        .eq("id", productId)
        .select()
        .single();

      if (error) throw error;
      return new Response(JSON.stringify({ success: true, data: product }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // DELETE /store/products/:id - Delete product
    if (method === "DELETE" && path.startsWith("/products/")) {
      const productId = path.replace("/products/", "");

      const { error } = await supabase.from("products").delete().eq("id", productId);
      if (error) throw error;

      return new Response(JSON.stringify({ success: true, message: "Product deleted" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // GET /store/social - Get social accounts
    if (method === "GET" && path === "/social") {
      const { data: store } = await supabase
        .from("stores")
        .select("id")
        .eq("seller_id", userId)
        .maybeSingle();

      if (!store) {
        return new Response(JSON.stringify({ success: true, data: [] }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: accounts, error } = await supabase
        .from("social_accounts")
        .select("*")
        .eq("store_id", store.id);

      if (error) throw error;
      return new Response(JSON.stringify({ success: true, data: accounts }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // POST /store/social - Connect social account
    if (method === "POST" && path === "/social") {
      const { platform, pageUrl, pageId } = await req.json();

      if (!platform || !pageUrl) {
        return new Response(JSON.stringify({ success: false, error: "Platform and pageUrl are required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: store } = await supabase
        .from("stores")
        .select("id")
        .eq("seller_id", userId)
        .maybeSingle();

      if (!store) {
        return new Response(JSON.stringify({ success: false, error: "Create a store first" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: account, error } = await supabase
        .from("social_accounts")
        .insert({ store_id: store.id, platform, page_url: pageUrl, page_id: pageId })
        .select()
        .single();

      if (error) throw error;
      return new Response(JSON.stringify({ success: true, data: account }), {
        status: 201,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // DELETE /store/social/:id - Disconnect social account
    if (method === "DELETE" && path.startsWith("/social/")) {
      const accountId = path.replace("/social/", "");

      const { error } = await supabase.from("social_accounts").delete().eq("id", accountId);
      if (error) throw error;

      return new Response(JSON.stringify({ success: true, message: "Account disconnected" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: false, error: "Not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Store API error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
