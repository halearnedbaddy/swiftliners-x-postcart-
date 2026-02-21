import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Admin client with service role key - bypasses RLS
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// Create a client with user's JWT for RLS
export function createUserClient(authHeader: string) {
  const jwt = authHeader.replace("Bearer ", "");
  return createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  });
}

// Validate API key and return account
export async function validateApiKey(apiKey: string) {
  if (!apiKey) {
    return { account: null, error: "API key required" };
  }

  const isSandbox = apiKey.startsWith("sk_test_");
  const isLive = apiKey.startsWith("sk_live_");

  if (!isSandbox && !isLive) {
    return { account: null, error: "Invalid API key format" };
  }

  // For sandbox keys, we store them in plaintext for dev convenience
  // For live keys, we would need to hash and compare
  if (isSandbox) {
    const { data: account, error } = await supabaseAdmin
      .from("accounts")
      .select("*")
      .eq("sandbox_api_key", apiKey)
      .single();

    if (error || !account) {
      return { account: null, error: "Invalid API key" };
    }

    return { account, error: null, mode: "sandbox" as const };
  }

  // For live keys, we need to hash and compare
  // This is a simplified version - in production you'd use bcrypt
  const lastFour = apiKey.slice(-4);
  const { data: accounts, error } = await supabaseAdmin
    .from("accounts")
    .select("*")
    .eq("api_key_last_four", lastFour)
    .eq("status", "APPROVED");

  if (error || !accounts || accounts.length === 0) {
    return { account: null, error: "Invalid API key" };
  }

  // In production, iterate through accounts and bcrypt.compare
  // For now, we'll just return the first match
  return { account: accounts[0], error: null, mode: "live" as const };
}
