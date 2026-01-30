import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = "https://pxyyncsnjpuwvnwyfdwx.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

// Create admin client for OTP operations
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
// Create anon client for end-user auth flows (sign-in / sign-up)
const supabaseAnon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Generate 6-digit OTP
function generateOTPCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Normalize phone number to E.164-ish format: +[countrycode][number]
// - Accepts optional formatting: spaces, dashes, parentheses
// - Accepts 00 prefix and converts to +
// - Requires explicit country code
function normalizePhoneNumber(phone: string): string {
  const raw = (phone ?? "").trim();
  if (!raw) return "";

  // Convert 00 prefix to +
  const withPlus = raw.startsWith("00") ? `+${raw.slice(2)}` : raw;
  const stripped = withPlus.replace(/[^\d+]/g, "");

  const digits = stripped.startsWith("+")
    ? `+${stripped.slice(1).replace(/\D/g, "")}`
    : stripped.replace(/\D/g, "");

  return digits;
}

// Format phone for SMS API (digits only, without +)
function formatPhoneForSMS(phone: string): string {
  return (phone ?? "").replace(/\D/g, "");
}

// Send SMS via BulkSMS Kenya (BlessedTexts API)
async function sendSMS(phone: string, message: string): Promise<{ success: boolean; error?: string }> {
  const apiKey = Deno.env.get("BULK_SMS_API_KEY");
  const senderId = Deno.env.get("BULK_SMS_SENDER_ID") || "XpressKard";

  if (!apiKey) {
    console.error("❌ BULK_SMS_API_KEY not configured");
    console.log(`📱 [DEV MODE] Would send SMS to ${phone}: ${message}`);
    return { success: true }; // Return success for dev mode
  }

  const formattedPhone = formatPhoneForSMS(phone);
  console.log(`📱 Sending SMS to ${formattedPhone} via BulkSMS...`);

  try {
    const response = await fetch("https://sms.blessedtexts.com/api/sms/v1/sendsms", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({
        api_key: apiKey,
        sender_id: senderId,
        message: message,
        phone: formattedPhone,
      }),
    });

    const data = await response.json();
    console.log("📱 SMS API Response:", JSON.stringify(data, null, 2));

    // Check for success response
    if (Array.isArray(data) && data[0]?.status_code === "1000") {
      console.log(`✅ SMS sent successfully to ${formattedPhone}`);
      return { success: true };
    }

    if (data.status_code === "1000") {
      console.log(`✅ SMS sent successfully to ${formattedPhone}`);
      return { success: true };
    }

    return { success: false, error: data.status_desc || data[0]?.status_desc || "SMS send failed" };
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("❌ Error sending SMS:", errMsg);
    return { success: false, error: errMsg };
  }
}

// Validate phone number
function validatePhoneNumber(phone: string): boolean {
  const normalized = normalizePhoneNumber(phone);
  return /^\+\d{10,15}$/.test(normalized);
}

function normalizeRole(input: string | undefined | null): "buyer" | "seller" | "admin" {
  const raw = (input ?? "buyer").toString().trim().toLowerCase();
  if (raw === "admin") return "admin";
  if (raw === "seller" || raw === "sell" || raw === "merchant") return "seller";
  if (raw === "buyer" || raw === "buy" || raw === "customer") return "buyer";
  // Also accept uppercase legacy values
  if (raw === "seller" || raw === "seller") return "seller";
  if (raw === "buyer" || raw === "buyer") return "buyer";
  return "buyer";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname.split("/").pop();

    switch (path) {
      case "request-otp":
        return await handleRequestOTP(req);
      case "verify-otp":
        return await handleVerifyOTP(req);
      case "register":
        return await handleRegister(req);
      case "login":
        return await handleLogin(req);
      case "register-email":
        return await handleRegisterEmail(req);
      case "login-email":
        return await handleLoginEmail(req);
      case "profile":
        return await handleGetProfile(req);
      default:
        return new Response(
          JSON.stringify({ success: false, error: "Not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
  } catch (error) {
    console.error("Auth API error:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function handleRequestOTP(req: Request): Promise<Response> {
  const { phone, purpose } = await req.json();

  if (!validatePhoneNumber(phone)) {
    return new Response(
      JSON.stringify({ success: false, error: "Enter a valid phone number with country code (e.g., +1234567890)" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const normalizedPhone = normalizePhoneNumber(phone);
  const validPurposes = ["LOGIN", "REGISTRATION", "PASSWORD_RESET", "VERIFICATION"];
  
  if (!validPurposes.includes(purpose)) {
    return new Response(
      JSON.stringify({ success: false, error: "Invalid OTP purpose" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Check if phone exists for login/registration validation
  const { data: existingProfile } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("phone", normalizedPhone)
    .single();

  if (purpose === "REGISTRATION" && existingProfile) {
    return new Response(
      JSON.stringify({ success: false, error: "Phone number already registered" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  if (purpose === "LOGIN" && !existingProfile) {
    // Return success to prevent phone enumeration
    return new Response(
      JSON.stringify({ success: true, message: "OTP sent successfully" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Rate limiting check
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const { count } = await supabaseAdmin
    .from("otps")
    .select("*", { count: "exact", head: true })
    .eq("phone", normalizedPhone)
    .gte("created_at", fiveMinutesAgo);

  if (count && count >= 3) {
    return new Response(
      JSON.stringify({ success: false, error: "Too many OTP requests. Please try again later." }),
      { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Generate and store OTP
  const code = generateOTPCode();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

  await supabaseAdmin.from("otps").insert({
    phone: normalizedPhone,
    code,
    purpose,
    expires_at: expiresAt,
  });

  // Send SMS with OTP
  const message = `Your SWIFTLINE verification code is: ${code}. Valid for 10 minutes. Do not share this code.`;
  const smsResult = await sendSMS(normalizedPhone, message);

  if (!smsResult.success) {
    console.error("SMS send failed:", smsResult.error);
    // Still return success but log the error - OTP is stored for testing
  }

  console.log(`OTP for ${normalizedPhone}: ${code}`);

  return new Response(
    JSON.stringify({ 
      success: true, 
      message: "OTP sent successfully",
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

async function handleVerifyOTP(req: Request): Promise<Response> {
  const { phone, code, purpose } = await req.json();

  const normalizedPhone = normalizePhoneNumber(phone);
  if (!/^\+\d{10,15}$/.test(normalizedPhone)) {
    return new Response(
      JSON.stringify({ success: false, error: "Enter a valid phone number with country code (e.g., +1234567890)" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Find valid OTP
  const { data: otp } = await supabaseAdmin
    .from("otps")
    .select("*")
    .eq("phone", normalizedPhone)
    .eq("purpose", purpose)
    .eq("is_used", false)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!otp) {
    return new Response(
      JSON.stringify({ success: false, error: "OTP expired or not found" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  if (otp.attempts >= otp.max_attempts) {
    return new Response(
      JSON.stringify({ success: false, error: "Maximum verification attempts exceeded" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  if (otp.code !== code) {
    // Increment attempts
    await supabaseAdmin
      .from("otps")
      .update({ attempts: otp.attempts + 1 })
      .eq("id", otp.id);

    const remaining = otp.max_attempts - otp.attempts - 1;
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: remaining > 0 
          ? `Invalid OTP. ${remaining} attempts remaining.`
          : "Maximum attempts exceeded. Please request a new OTP."
      }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Mark OTP as used
  await supabaseAdmin
    .from("otps")
    .update({ is_used: true, used_at: new Date().toISOString() })
    .eq("id", otp.id);

  return new Response(
    JSON.stringify({ success: true, message: "OTP verified successfully" }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

async function handleRegister(req: Request): Promise<Response> {
  const { phone, name, email, role, otp } = await req.json();

  if (!phone || !name || !otp) {
    return new Response(
      JSON.stringify({ success: false, error: "Phone, name, and OTP are required" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  if (!validatePhoneNumber(phone)) {
    return new Response(
      JSON.stringify({ success: false, error: "Enter a valid phone number with country code (e.g., +1234567890)" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const normalizedPhone = normalizePhoneNumber(phone);
  const userRole = normalizeRole(role);

  // Verify OTP first
  const { data: otpRecord } = await supabaseAdmin
    .from("otps")
    .select("*")
    .eq("phone", normalizedPhone)
    .eq("purpose", "REGISTRATION")
    .eq("is_used", false)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!otpRecord || otpRecord.code !== otp) {
    return new Response(
      JSON.stringify({ success: false, error: "Invalid or expired OTP" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Mark OTP as used
  await supabaseAdmin
    .from("otps")
    .update({ is_used: true, used_at: new Date().toISOString() })
    .eq("id", otpRecord.id);

  // Create Supabase auth user
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    phone: normalizedPhone,
    phone_confirm: true,
    user_metadata: { name, role: userRole },
  });

  if (authError) {
    console.error("Auth error:", authError);
    return new Response(
      JSON.stringify({ success: false, error: authError.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Update profile with additional info
  if (email) {
    await supabaseAdmin
      .from("profiles")
      .update({ email, name })
      .eq("user_id", authData.user.id);
  }

  // Ensure auth user has email so we can generate magic link (for Supabase session)
  const phantomEmail = `${normalizedPhone.replace(/\D/g, "")}@phone.payloom.local`;
  await supabaseAdmin.auth.admin.updateUserById(authData.user.id, { email: phantomEmail });

  const { data: linkData } = await supabaseAdmin.auth.admin.generateLink({
    type: "magiclink",
    email: phantomEmail,
  });
  const actionLink = linkData?.properties?.action_link ?? null;

  const { data: userRoleData } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", authData.user.id)
    .single();

  return new Response(
    JSON.stringify({
      success: true,
      message: "Registration successful",
      data: {
        user: {
          id: authData.user.id,
          phone: normalizedPhone,
          name,
          email: email ?? undefined,
          role: userRoleData?.role || userRole,
        },
        actionLink,
      },
    }),
    { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

async function handleLogin(req: Request): Promise<Response> {
  const { phone, otp } = await req.json();

  if (!phone || !otp) {
    return new Response(
      JSON.stringify({ success: false, error: "Phone and OTP are required" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  if (!validatePhoneNumber(phone)) {
    return new Response(
      JSON.stringify({ success: false, error: "Enter a valid phone number with country code (e.g., +1234567890)" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const normalizedPhone = normalizePhoneNumber(phone);

  // Verify OTP
  const { data: otpRecord } = await supabaseAdmin
    .from("otps")
    .select("*")
    .eq("phone", normalizedPhone)
    .eq("purpose", "LOGIN")
    .eq("is_used", false)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!otpRecord || otpRecord.code !== otp) {
    return new Response(
      JSON.stringify({ success: false, error: "Invalid or expired OTP" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Mark OTP as used
  await supabaseAdmin
    .from("otps")
    .update({ is_used: true, used_at: new Date().toISOString() })
    .eq("id", otpRecord.id);

  // Find user by phone
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("*, user_id")
    .eq("phone", normalizedPhone)
    .single();

  if (!profile) {
    return new Response(
      JSON.stringify({ success: false, error: "User not found" }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Get user role
  const { data: userRole } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", profile.user_id)
    .single();

  // Update last login
  await supabaseAdmin
    .from("profiles")
    .update({ last_login: new Date().toISOString() })
    .eq("user_id", profile.user_id);

  // Generate magic link so frontend gets Supabase session (for create link, etc.)
  const phantomEmail = `${normalizedPhone.replace(/\D/g, "")}@phone.payloom.local`;
  const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(profile.user_id);
  const emailToUse = authUser?.user?.email || phantomEmail;
  if (!authUser?.user?.email) {
    await supabaseAdmin.auth.admin.updateUserById(profile.user_id, { email: phantomEmail });
  }
  const { data: linkData } = await supabaseAdmin.auth.admin.generateLink({
    type: "magiclink",
    email: emailToUse,
  });
  const actionLink = linkData?.properties?.action_link ?? null;

  return new Response(
    JSON.stringify({
      success: true,
      message: "Login successful",
      data: {
        user: {
          id: profile.user_id,
          phone: profile.phone,
          name: profile.name,
          email: profile.email,
          role: userRole?.role || "buyer",
        },
        actionLink,
      },
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

async function handleRegisterEmail(req: Request): Promise<Response> {
  const { email, password, name, role, phone } = await req.json();

  if (!email || !password || !name) {
    return new Response(
      JSON.stringify({ success: false, error: "Email, password, and name are required" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  if (password.length < 8) {
    return new Response(
      JSON.stringify({ success: false, error: "Password must be at least 8 characters" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const userRole = normalizeRole(role);

  const normalizedPhone = phone ? normalizePhoneNumber(phone) : null;
  if (normalizedPhone && !/^\+\d{10,15}$/.test(normalizedPhone)) {
    return new Response(
      JSON.stringify({ success: false, error: "Enter a valid phone number with country code (e.g., +1234567890)" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Create user with Supabase Auth
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: email.toLowerCase(),
    password,
    email_confirm: true,
    user_metadata: { name, role: userRole },
  });

  if (authError) {
    console.error("Auth error:", authError);
    if (authError.message.includes("already")) {
      return new Response(
        JSON.stringify({ success: false, error: "Email already registered" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    return new Response(
      JSON.stringify({ success: false, error: authError.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // If the user provided a phone (optional), persist it into the public profile.
  // This avoids privilege escalation (role remains in user_roles), and helps OTP login.
  if (normalizedPhone) {
    const { data: existingProfile, error: profileFetchError } = await supabaseAdmin
      .from("profiles")
      .select("user_id")
      .eq("user_id", authData.user.id)
      .maybeSingle();

    if (profileFetchError) {
      console.error("Profile fetch error:", profileFetchError);
    }

    if (existingProfile) {
      const { error: profileUpdateError } = await supabaseAdmin
        .from("profiles")
        .update({ phone: normalizedPhone })
        .eq("user_id", authData.user.id);
      if (profileUpdateError) console.error("Profile update error:", profileUpdateError);
    }
  }

  // Get user role
  const { data: userRoleData } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", authData.user.id)
    .single();

  return new Response(
    JSON.stringify({
      success: true,
      message: "Registration successful",
      data: {
        user: {
          id: authData.user.id,
          email: email.toLowerCase(),
          name,
          role: userRoleData?.role || userRole,
        },
      },
    }),
    { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

async function handleLoginEmail(req: Request): Promise<Response> {
  const { email, password } = await req.json();

  if (!email || !password) {
    return new Response(
      JSON.stringify({ success: false, error: "Email and password are required" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Sign in with Supabase Auth (use anon client for user auth)
  const { data: authData, error: authError } = await supabaseAnon.auth.signInWithPassword({
    email: email.toLowerCase(),
    password,
  });

  if (authError) {
    // Preserve useful auth errors (e.g. email confirmation) instead of masking everything
    const msg = (authError.message || "").toLowerCase();
    if (msg.includes("email") && msg.includes("confirm")) {
      return new Response(
        JSON.stringify({ success: false, error: "Email not confirmed. Please check your inbox." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    return new Response(
      JSON.stringify({ success: false, error: "Invalid credentials" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Get profile and role
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("*")
    .eq("user_id", authData.user.id)
    .single();

  // Get all user roles and prioritize admin role
  const { data: userRoles } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", authData.user.id);
  
  // Priority: admin > seller > buyer
  const rolePriority = ['admin', 'seller', 'buyer'];
  const userRole = userRoles?.sort((a, b) => 
    rolePriority.indexOf(a.role) - rolePriority.indexOf(b.role)
  )[0];

  // Update last login
  await supabaseAdmin
    .from("profiles")
    .update({ last_login: new Date().toISOString() })
    .eq("user_id", authData.user.id);

  return new Response(
    JSON.stringify({
      success: true,
      message: "Login successful",
      data: {
        user: {
          id: authData.user.id,
          phone: profile?.phone,
          name: profile?.name,
          email: authData.user.email,
          role: userRole?.role || "buyer",
        },
        session: authData.session,
      },
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

async function handleGetProfile(req: Request): Promise<Response> {
  const authHeader = req.headers.get("Authorization");
  
  if (!authHeader) {
    return new Response(
      JSON.stringify({ success: false, error: "Unauthorized" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const token = authHeader.replace("Bearer ", "");
  
  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
  
  if (userError || !userData.user) {
    return new Response(
      JSON.stringify({ success: false, error: "Invalid token" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("*")
    .eq("user_id", userData.user.id)
    .single();

  const { data: userRole } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userData.user.id)
    .single();

  return new Response(
    JSON.stringify({
      success: true,
      data: {
        user: {
          id: userData.user.id,
          phone: profile?.phone,
          name: profile?.name,
          email: profile?.email || userData.user.email,
          role: userRole?.role || "buyer",
          profilePicture: profile?.profile_picture,
          memberSince: profile?.member_since,
        },
      },
    }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}
