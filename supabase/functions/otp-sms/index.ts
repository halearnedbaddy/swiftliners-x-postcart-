import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  parsePhoneNumber,
  isValidPhoneNumber,
  CountryCode,
} from "https://esm.sh/libphonenumber-js@1.11.18";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

interface PhoneInfo {
  normalized: string;
  country: CountryCode | undefined;
  nationalNumber: string;
  isValid: boolean;
}

function parsePhone(phone: string): PhoneInfo {
  const raw = (phone ?? "").trim();
  
  // Handle numbers without + prefix
  const withPlus = raw.startsWith("+") ? raw : raw.startsWith("00") ? `+${raw.slice(2)}` : `+${raw}`;
  
  try {
    if (!isValidPhoneNumber(withPlus)) {
      return { normalized: "", country: undefined, nationalNumber: "", isValid: false };
    }
    
    const parsed = parsePhoneNumber(withPlus);
    if (!parsed) {
      return { normalized: "", country: undefined, nationalNumber: "", isValid: false };
    }
    
    return {
      normalized: parsed.number,
      country: parsed.country,
      nationalNumber: parsed.nationalNumber,
      isValid: parsed.isValid(),
    };
  } catch {
    return { normalized: "", country: undefined, nationalNumber: "", isValid: false };
  }
}

// East African countries that BulkSMS Kenya supports
const EAST_AFRICA_COUNTRIES: CountryCode[] = ["KE", "UG", "TZ", "RW", "BI", "SS", "ET"];

function isEastAfricaNumber(country: CountryCode | undefined): boolean {
  return country !== undefined && EAST_AFRICA_COUNTRIES.includes(country);
}

interface SMSResult {
  success: boolean;
  error?: string;
  provider?: string;
}

// Send via BulkSMS Kenya (for East Africa)
async function sendViaBulkSMS(phone: string, message: string): Promise<SMSResult> {
  const apiKey = Deno.env.get("BULK_SMS_API_KEY");
  const senderId = Deno.env.get("BULK_SMS_SENDER_ID") || "XpressKard";

  if (!apiKey) {
    console.log("⚠️ BULK_SMS_API_KEY not configured - logging SMS for development");
    console.log(`📱 [DEV MODE] Would send SMS to ${phone}: ${message}`);
    return { success: true, provider: "dev-mode" };
  }

  // Format: digits only for BulkSMS
  const formattedPhone = phone.replace(/\D/g, "");
  console.log(`📱 [BulkSMS] Sending SMS to ${formattedPhone}...`);

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
    console.log("📱 BulkSMS API Response:", JSON.stringify(data, null, 2));

    if (Array.isArray(data) && data[0]?.status_code === "1000") {
      console.log(`✅ [BulkSMS] SMS sent successfully to ${formattedPhone}`);
      return { success: true, provider: "bulksms" };
    }

    if (data.status_code === "1000") {
      console.log(`✅ [BulkSMS] SMS sent successfully to ${formattedPhone}`);
      return { success: true, provider: "bulksms" };
    }

    const errorDesc = data[0]?.status_desc || data.status_desc || "SMS send failed";
    return { success: false, error: errorDesc, provider: "bulksms" };
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("❌ [BulkSMS] Error sending SMS:", errMsg);
    return { success: false, error: errMsg, provider: "bulksms" };
  }
}

// Send via Twilio (for international numbers)
async function sendViaTwilio(phone: string, message: string): Promise<SMSResult> {
  const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
  const fromNumber = Deno.env.get("TWILIO_PHONE_NUMBER");

  if (!accountSid || !authToken || !fromNumber) {
    console.log("⚠️ Twilio credentials not configured - logging SMS for development");
    console.log(`📱 [DEV MODE - TWILIO] Would send SMS to ${phone}: ${message}`);
    // Return success for development/testing - the OTP is stored in DB
    return { success: true, provider: "dev-mode-twilio" };
  }

  console.log(`📱 [Twilio] Sending SMS to ${phone}...`);

  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const auth = btoa(`${accountSid}:${authToken}`);

    const formData = new URLSearchParams();
    formData.append("From", fromNumber);
    formData.append("To", phone); // Twilio accepts E.164 format with +
    formData.append("Body", message);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });

    const data = await response.json();
    console.log("📱 Twilio API Response:", JSON.stringify(data, null, 2));

    if (data.sid) {
      console.log(`✅ [Twilio] SMS sent successfully to ${phone}, SID: ${data.sid}`);
      return { success: true, provider: "twilio" };
    }

    const errorMsg = data.message || data.error_message || "Twilio SMS failed";
    return { success: false, error: errorMsg, provider: "twilio" };
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("❌ [Twilio] Error sending SMS:", errMsg);
    return { success: false, error: errMsg, provider: "twilio" };
  }
}

// Route SMS to appropriate provider based on country
async function sendSMS(phone: string, message: string, country: CountryCode | undefined): Promise<SMSResult> {
  console.log(`📱 Routing SMS for country: ${country || "unknown"}`);

  if (isEastAfricaNumber(country)) {
    console.log(`📱 Using BulkSMS Kenya for East Africa (${country})`);
    return sendViaBulkSMS(phone, message);
  } else {
    console.log(`📱 Using Twilio for international (${country})`);
    return sendViaTwilio(phone, message);
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

    // Parse and validate phone using libphonenumber-js
    const phoneInfo = parsePhone(phone);
    
    if (!phoneInfo.isValid) {
      console.log(`❌ Invalid phone number: ${phone}`);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Enter a valid phone number with country code (e.g., +1234567890, +442071234567, +254712345678)" 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const normalizedPhone = phoneInfo.normalized;
    const country = phoneInfo.country;
    
    console.log(`📱 Phone parsed: ${normalizedPhone}, Country: ${country}`);

    // ======= SEND OTP =======
    if (action === "send" || !action) {
      // Validate phone is registered (for login)
      if (purpose === "LOGIN") {
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("id, phone, user_id")
          .eq("phone", normalizedPhone)
          .limit(1)
          .maybeSingle();

        if (profileError) {
          console.error("Profile lookup error:", profileError);
        }

        if (!profile) {
          console.log("❌ Phone not registered:", normalizedPhone);
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
        .eq("phone", normalizedPhone)
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
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 minutes

      const { error: insertErr } = await supabase.from("otps").insert({
        phone: normalizedPhone,
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

      // Send SMS with country-based routing
      const message = `Your PayLoom verification code is: ${otp}. Valid for 5 minutes. Do not share this code.`;
      const smsResult = await sendSMS(normalizedPhone, message, country);

      if (!smsResult.success) {
        return new Response(
          JSON.stringify({ success: false, error: smsResult.error || "Failed to send SMS" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`✅ OTP sent to ${normalizedPhone} via ${smsResult.provider}, country: ${country}`);
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "OTP sent successfully",
          country: country,
          provider: smsResult.provider,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ======= VERIFY OTP =======
    if (action === "verify") {
      // Fetch the most recent unused OTP for this phone
      const { data: storedOtp, error: fetchErr } = await supabase
        .from("otps")
        .select("*")
        .eq("phone", normalizedPhone)
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
        .eq("phone", normalizedPhone)
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
