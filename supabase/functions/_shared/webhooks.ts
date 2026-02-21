// Webhook dispatcher - signs and delivers events to configured endpoints
import { supabaseAdmin } from "./supabase.ts";

// HMAC-SHA256 signing
async function signPayload(payload: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export interface WebhookEvent {
  event_type: string;
  data: Record<string, unknown>;
  account_id: string;
}

// Dispatch a webhook event to all active endpoints for an account
export async function dispatchWebhook(event: WebhookEvent) {
  try {
    // Find active webhook endpoints for this account that subscribe to this event
    const { data: endpoints, error } = await supabaseAdmin
      .from("webhook_endpoints")
      .select("*")
      .eq("account_id", event.account_id)
      .eq("is_active", true);

    if (error || !endpoints || endpoints.length === 0) {
      console.log("No webhook endpoints for account:", event.account_id);
      return;
    }

    const timestamp = Math.floor(Date.now() / 1000).toString();

    for (const endpoint of endpoints) {
      // Check if this endpoint subscribes to this event type
      if (!endpoint.events.includes(event.event_type)) {
        continue;
      }

      const payload = JSON.stringify({
        event: event.event_type,
        data: event.data,
        timestamp,
      });

      const signature = await signPayload(`${timestamp}.${payload}`, endpoint.secret);

      // Create delivery record
      const { data: delivery } = await supabaseAdmin
        .from("webhook_deliveries")
        .insert({
          webhook_endpoint_id: endpoint.id,
          event_type: event.event_type,
          payload: { event: event.event_type, data: event.data, timestamp },
          status: "pending",
        })
        .select()
        .single();

      // Attempt delivery
      try {
        const res = await fetch(endpoint.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-PayChain-Signature": `t=${timestamp},v1=${signature}`,
            "X-PayChain-Event": event.event_type,
          },
          body: payload,
          signal: AbortSignal.timeout(10000), // 10s timeout
        });

        const responseBody = await res.text();

        await supabaseAdmin
          .from("webhook_deliveries")
          .update({
            status: res.ok ? "delivered" : "failed",
            response_status: res.status,
            response_body: responseBody.slice(0, 1000),
            delivered_at: res.ok ? new Date().toISOString() : null,
            failed_at: res.ok ? null : new Date().toISOString(),
          })
          .eq("id", delivery?.id);

      } catch (fetchError) {
        console.error("Webhook delivery failed:", fetchError);
        await supabaseAdmin
          .from("webhook_deliveries")
          .update({
            status: "failed",
            response_body: String(fetchError),
            failed_at: new Date().toISOString(),
          })
          .eq("id", delivery?.id);
      }
    }
  } catch (err) {
    console.error("dispatchWebhook error:", err);
  }
}
