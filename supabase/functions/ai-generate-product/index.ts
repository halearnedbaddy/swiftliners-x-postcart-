import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GenerateProductRequest {
  description: string;
  imageUrl?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify user
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claimsData.claims.sub;

    // Get request body
    const { description, imageUrl }: GenerateProductRequest = await req.json();

    if (!description && !imageUrl) {
      return new Response(
        JSON.stringify({ error: "Please provide a description or image" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user's store
    const { data: store, error: storeError } = await supabase
      .from("stores")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (storeError || !store) {
      return new Response(
        JSON.stringify({ error: "Store not found. Please create a store first." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build AI prompt
    const systemPrompt = `You are a product listing assistant. Given a product description or image, generate structured product data for an e-commerce listing.

Return ONLY valid JSON with this exact structure:
{
  "name": "Product name (concise, catchy)",
  "description": "Detailed product description (2-3 sentences)",
  "price": 0,
  "confidence": 0.85,
  "warnings": ["Any issues or uncertainties"],
  "missingFields": ["Fields that couldn't be determined"]
}

For price:
- If a price is mentioned, extract it in KES (Kenyan Shillings)
- If no price is mentioned, set price to 0 and add "price" to missingFields
- Confidence should be 0.0-1.0 based on how complete the product info is`;

    let userMessage = "";
    const content: Array<{ type: string; text?: string; image_url?: { url: string } }> = [];

    if (description) {
      userMessage = `Generate a product listing from this description: "${description}"`;
      content.push({ type: "text", text: userMessage });
    }

    if (imageUrl) {
      content.push({
        type: "image_url",
        image_url: { url: imageUrl },
      });
      if (!description) {
        content.push({ type: "text", text: "Generate a product listing from this product image." });
      }
    }

    // Call Lovable AI
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: content.length === 1 ? content[0].text : content },
        ],
        max_tokens: 1000,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI API error:", errorText);
      return new Response(
        JSON.stringify({ error: "AI generation failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices?.[0]?.message?.content || "";

    // Parse AI response
    let productData;
    try {
      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch = aiContent.match(/```json\s*([\s\S]*?)\s*```/) || 
                        aiContent.match(/```\s*([\s\S]*?)\s*```/) ||
                        [null, aiContent];
      const jsonStr = jsonMatch[1] || aiContent;
      productData = JSON.parse(jsonStr.trim());
    } catch (parseError) {
      console.error("Failed to parse AI response:", aiContent);
      productData = {
        name: "Untitled Product",
        description: description || "No description available",
        price: 0,
        confidence: 0.3,
        warnings: ["Failed to parse AI response"],
        missingFields: ["name", "price"],
      };
    }

    // Insert product as draft
    const { data: product, error: insertError } = await supabase
      .from("products")
      .insert({
        store_id: store.id,
        name: productData.name || "Untitled Product",
        description: productData.description || null,
        price: productData.price || null,
        images: imageUrl ? [imageUrl] : [],
        status: "DRAFT",
        ai_confidence_score: productData.confidence || 0.5,
        extraction_warnings: productData.warnings || [],
        missing_fields: productData.missingFields || [],
        source_type: "AI_GENERATED",
      })
      .select()
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to save product" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, product }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
