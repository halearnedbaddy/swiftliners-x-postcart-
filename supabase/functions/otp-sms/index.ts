import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function formatPhoneNumber(phone: string): string {
  let formatted = phone.trim().replace(/\D/g, '');
  if (formatted.startsWith('0')) {
    formatted = '254' + formatted.substring(1);
  } else if (formatted.startsWith('7') || formatted.startsWith('1')) {
    formatted = '254' + formatted;
  } else if (!formatted.startsWith('254')) {
    formatted = '254' + formatted;
  }
  return formatted;
}

async function sendSMS(phone: string, message: string): Promise<{ success: boolean; error?: string }> {
  const apiKey = Deno.env.get("BULK_SMS_API_KEY");
  const senderId = "XpressKard";

  if (!apiKey) {
    console.error("❌ BULK_SMS_API_KEY not configured");
    // For development, just log and return success
    console.log(`📱 [DEV MODE] Would send SMS to ${phone}: ${message}`);
    return { success: true };
  }

  const formattedPhone = formatPhoneNumber(phone);
  console.log(`📱 Sending SMS to ${formattedPhone}...`);

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

    if (Array.isArray(data) && data[0]?.status_code === "1000") {
      console.log(`✅ SMS sent successfully to ${formattedPhone}`);
      return { success: true };
    }

    if (data.status_code === "1000") {
      console.log(`✅ SMS sent successfully to ${formattedPhone}`);
      return { success: true };
    }

    const errorDesc = data[0]?.status_desc || data.status_desc || "SMS send failed";
    return { success: false, error: errorDesc };
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("❌ Error sending SMS:", errMsg);
    return { success: false, error: errMsg };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action, phone, token, purpose = "LOGIN" } = body;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const formattedPhone = formatPhoneNumber(phone);

    // ======= SEND OTP =======
    if (action === "send" || !action) {
      // Validate phone is registered (for login)
      if (purpose === "LOGIN") {
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("id, phone, user_id")
          .or(`phone.eq.${phone},phone.eq.${formattedPhone},phone.eq.0${formattedPhone.slice(3)},phone.eq.+${formattedPhone}`)
          .limit(1)
          .maybeSingle();

        if (profileError) {
          console.error("Profile lookup error:", profileError);
        }

        if (!profile) {
          console.log("❌ Phone not registered:", phone);
          return new Response(
            JSON.stringify({ success: false, error: "Phone number not registered. Please sign up first." }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      // Rate limiting: 1 OTP per minute
      const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString();
      const { data: recentOtp } = await supabase
        .from("otps")
        .select("id, created_at")
        .eq("phone", formattedPhone)
        .eq("purpose", purpose)
        .eq("is_used", false)
        .gt("created_at", oneMinuteAgo)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (recentOtp) {
        return new Response(
          JSON.stringify({ success: false, error: "Please wait before requesting another OTP" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Generate and store OTP
      const otp = generateOTP();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

      const { error: insertErr } = await supabase.from("otps").insert({
        phone: formattedPhone,
        code: otp,
        purpose,
        attempts: 0,
        max_attempts: 3,
        is_used: false,
        expires_at: expiresAt,
      });

      if (insertErr) {
        console.error("Error inserting OTP:", insertErr);
        return new Response(
          JSON.stringify({ success: false, error: "Failed to generate OTP" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Send SMS
      const message = `Your SWIFTLINE verification code is: ${otp}. Valid for 10 minutes. Do not share this code.`;
      const smsResult = await sendSMS(formattedPhone, message);

      if (!smsResult.success) {
        return new Response(
          JSON.stringify({ success: false, error: smsResult.error || "Failed to send SMS" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`✅ OTP sent to ${formattedPhone}`);
      return new Response(
        JSON.stringify({ success: true, message: "OTP sent successfully" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ======= VERIFY OTP =======
    if (action === "verify") {
      // Fetch the most recent unused OTP for this phone
      const { data: storedOtp, error: fetchErr } = await supabase
        .from("otps")
        .select("*")
        .eq("phone", formattedPhone)
        .eq("purpose", purpose)
        .eq("is_used", false)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fetchErr) {
        console.error("Error fetching OTP:", fetchErr);
      }

      if (!storedOtp) {
        return new Response(
          JSON.stringify({ success: false, error: "No OTP found. Please request a new one." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check expiry
      if (new Date(storedOtp.expires_at) < new Date()) {
        await supabase.from("otps").update({ is_used: true, used_at: new Date().toISOString() }).eq("id", storedOtp.id);
        return new Response(
          JSON.stringify({ success: false, error: "OTP expired. Please request a new one." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check attempts
      if (storedOtp.attempts >= storedOtp.max_attempts) {
        await supabase.from("otps").update({ is_used: true, used_at: new Date().toISOString() }).eq("id", storedOtp.id);
        return new Response(
          JSON.stringify({ success: false, error: "Too many attempts. Please request a new OTP." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Validate code
      if (storedOtp.code !== token) {
        await supabase.from("otps").update({ attempts: storedOtp.attempts + 1 }).eq("id", storedOtp.id);
        return new Response(
          JSON.stringify({ success: false, error: "Invalid OTP code" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // OTP verified – mark as used
      await supabase.from("otps").update({ is_used: true, used_at: new Date().toISOString() }).eq("id", storedOtp.id);

      // Get user profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("user_id, email, name, phone")
        .or(`phone.eq.${phone},phone.eq.${formattedPhone},phone.eq.0${formattedPhone.slice(3)},phone.eq.+${formattedPhone}`)
        .limit(1)
        .maybeSingle();

      if (!profile) {
        return new Response(
          JSON.stringify({ success: false, error: "User not found" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get user role
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", profile.user_id)
        .maybeSingle();

      console.log(`✅ OTP verified for user: ${profile.user_id}`);

      return new Response(
        JSON.stringify({
          success: true,
          message: "OTP verified successfully",
          user: {
            id: profile.user_id,
            email: profile.email,
            name: profile.name,
            phone: profile.phone,
            role: roleData?.role || "BUYER",
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: "Invalid action. Use 'send' or 'verify'" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("❌ Error in OTP function:", errMsg);
    return new Response(
      JSON.stringify({ success: false, error: errMsg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
