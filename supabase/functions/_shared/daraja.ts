// Daraja (M-Pesa) API integration
// Supports both sandbox and production environments

const SANDBOX_URL = "https://sandbox.safaricom.co.ke";
const PRODUCTION_URL = "https://api.safaricom.co.ke";

// Default sandbox credentials
const DEFAULT_SANDBOX_SHORTCODE = "174379";
const DEFAULT_SANDBOX_PASSKEY =
  "bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919";

function getBaseUrl(): string {
  const env = Deno.env.get("DARAJA_ENVIRONMENT") || "sandbox";
  return env === "production" ? PRODUCTION_URL : SANDBOX_URL;
}

function getShortcode(): string {
  return Deno.env.get("DARAJA_SHORTCODE") || DEFAULT_SANDBOX_SHORTCODE;
}

function getPasskey(): string {
  return Deno.env.get("DARAJA_PASSKEY") || DEFAULT_SANDBOX_PASSKEY;
}

// Get OAuth access token from Daraja
export async function getDarajaToken(): Promise<string> {
  const consumerKey = Deno.env.get("DARAJA_CONSUMER_KEY");
  const consumerSecret = Deno.env.get("DARAJA_CONSUMER_SECRET");

  if (!consumerKey || !consumerSecret) {
    throw new Error("Daraja credentials not configured");
  }

  const credentials = btoa(`${consumerKey}:${consumerSecret}`);
  const baseUrl = getBaseUrl();

  const res = await fetch(
    `${baseUrl}/oauth/v1/generate?grant_type=client_credentials`,
    {
      method: "GET",
      headers: { Authorization: `Basic ${credentials}` },
    }
  );

  if (!res.ok) {
    const body = await res.text();
    console.error("Daraja token error:", body);
    throw new Error(`Failed to get Daraja token: ${res.status}`);
  }

  const data = await res.json();
  return data.access_token;
}

// Generate STK Push password (Base64 of Shortcode + Passkey + Timestamp)
function generatePassword(timestamp: string): string {
  const shortcode = getShortcode();
  const passkey = getPasskey();
  return btoa(`${shortcode}${passkey}${timestamp}`);
}

// Format timestamp for Daraja (YYYYMMDDHHmmss)
function getTimestamp(): string {
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, "0");
  return (
    now.getFullYear().toString() +
    pad(now.getMonth() + 1) +
    pad(now.getDate()) +
    pad(now.getHours()) +
    pad(now.getMinutes()) +
    pad(now.getSeconds())
  );
}

export interface StkPushRequest {
  phone: string; // International format e.g. 254712345678
  amount: number; // Amount in KES (whole number)
  accountRef: string; // Account reference (e.g. transaction ID)
  description: string;
  callbackUrl: string;
}

export interface StkPushResponse {
  MerchantRequestID: string;
  CheckoutRequestID: string;
  ResponseCode: string;
  ResponseDescription: string;
  CustomerMessage: string;
}

// Initiate STK Push (Lipa Na M-Pesa Online)
export async function initiateSTKPush(
  req: StkPushRequest
): Promise<StkPushResponse> {
  const token = await getDarajaToken();
  const baseUrl = getBaseUrl();
  const shortcode = getShortcode();
  const timestamp = getTimestamp();
  const password = generatePassword(timestamp);

  // Amount must be at least 1 KES
  const amountKES = Math.max(1, Math.round(req.amount / 100)); // Convert cents to KES

  const payload = {
    BusinessShortCode: shortcode,
    Password: password,
    Timestamp: timestamp,
    TransactionType: "CustomerPayBillOnline",
    Amount: amountKES,
    PartyA: req.phone,
    PartyB: shortcode,
    PhoneNumber: req.phone,
    CallBackURL: req.callbackUrl,
    AccountReference: req.accountRef.slice(0, 12),
    TransactionDesc: (req.description || "Payment").slice(0, 13),
  };

  console.log("STK Push payload:", JSON.stringify(payload));

  const res = await fetch(
    `${baseUrl}/mpesa/stkpush/v1/processrequest`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  );

  const data = await res.json();

  if (!res.ok || data.ResponseCode !== "0") {
    console.error("STK Push error:", JSON.stringify(data));
    throw new Error(
      data.errorMessage || data.ResponseDescription || "STK Push failed"
    );
  }

  return data;
}

// Query STK Push status
export async function querySTKPushStatus(checkoutRequestId: string) {
  const token = await getDarajaToken();
  const baseUrl = getBaseUrl();
  const shortcode = getShortcode();
  const timestamp = getTimestamp();
  const password = generatePassword(timestamp);

  const res = await fetch(
    `${baseUrl}/mpesa/stkpushquery/v1/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        BusinessShortCode: shortcode,
        Password: password,
        Timestamp: timestamp,
        CheckoutRequestID: checkoutRequestId,
      }),
    }
  );

  return await res.json();
}
