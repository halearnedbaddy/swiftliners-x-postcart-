/**
 * Wallet API Edge Function
 * Handles wallet operations and withdrawals
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
    const path = url.pathname.replace("/wallet-api", "");
    const method = req.method;

    // GET /wallet - Get user's wallet
    if (method === "GET" && (path === "" || path === "/")) {
      let { data: wallet, error } = await supabase
        .from("wallets")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) throw error;

      // Create wallet if it doesn't exist
      if (!wallet) {
        const { data: newWallet, error: createError } = await supabase
          .from("wallets")
          .insert({
            user_id: userId,
            available_balance: 0,
            pending_balance: 0,
            total_earned: 0,
          })
          .select()
          .single();

        if (createError) throw createError;
        wallet = newWallet;
      }

      return new Response(JSON.stringify({ success: true, data: wallet }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // POST /wallet/topup - Top up wallet (for buyers)
    if (method === "POST" && path === "/topup") {
      const { amount, paymentMethod } = await req.json();

      if (!amount || amount <= 0) {
        return new Response(JSON.stringify({ success: false, error: "Invalid amount" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get or create wallet
      let { data: wallet } = await supabase
        .from("wallets")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (!wallet) {
        const { data: newWallet } = await supabase
          .from("wallets")
          .insert({
            user_id: userId,
            available_balance: 0,
            pending_balance: 0,
            total_earned: 0,
          })
          .select()
          .single();
        wallet = newWallet;
      }

      // In production, this would initiate actual payment
      // For now, simulate immediate top-up
      const { data: updated, error } = await supabase
        .from("wallets")
        .update({
          available_balance: (wallet?.available_balance || 0) + amount,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId)
        .select()
        .single();

      if (error) throw error;

      return new Response(JSON.stringify({
        success: true,
        message: "Top-up successful",
        data: updated,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // POST /wallet/withdraw - Request withdrawal
    if (method === "POST" && path === "/withdraw") {
      const { amount, paymentMethod, accountNumber, accountName } = await req.json();

      if (!amount || amount <= 0) {
        return new Response(JSON.stringify({ success: false, error: "Invalid amount" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get wallet
      const { data: wallet } = await supabase
        .from("wallets")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (!wallet || (wallet.available_balance || 0) < amount) {
        return new Response(JSON.stringify({ success: false, error: "Insufficient balance" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Calculate fees
      let platformFee = amount * 0.02; // 2% platform fee
      platformFee = Math.max(10, Math.min(500, platformFee)); // Min 10, Max 500
      
      let providerFee = 0;
      const provider = (paymentMethod || "").toUpperCase();
      if (provider.includes("MPESA") || provider.includes("M-PESA")) {
        providerFee = 27;
      } else if (provider.includes("AIRTEL")) {
        providerFee = 25;
      } else if (provider.includes("BANK")) {
        providerFee = 50;
      }

      const totalFee = platformFee + providerFee;
      const netAmount = amount - totalFee;

      if (netAmount <= 0) {
        return new Response(JSON.stringify({
          success: false,
          error: `Amount too low. Minimum fees are KES ${totalFee.toFixed(2)}`,
        }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Deduct from wallet
      const { error: updateError } = await supabase
        .from("wallets")
        .update({
          available_balance: (wallet.available_balance || 0) - amount,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);

      if (updateError) throw updateError;

      // In production, this would queue the withdrawal for processing
      return new Response(JSON.stringify({
        success: true,
        message: "Withdrawal request submitted",
        data: {
          requestedAmount: amount,
          platformFee,
          providerFee,
          totalFee,
          netAmount,
          status: "PENDING",
        },
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // GET /wallet/history - Get transaction history
    if (method === "GET" && path === "/history") {
      const page = parseInt(url.searchParams.get("page") || "1");
      const limit = parseInt(url.searchParams.get("limit") || "20");

      const { data: transactions, error, count } = await supabase
        .from("transactions")
        .select("*", { count: "exact" })
        .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
        .order("created_at", { ascending: false })
        .range((page - 1) * limit, page * limit - 1);

      if (error) throw error;

      return new Response(JSON.stringify({
        success: true,
        data: transactions,
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
    console.error("Wallet API error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
