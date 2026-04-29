import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Pro plan: 39 KES / month
const PLAN_AMOUNT_KOBO = 3900; // Paystack uses subunit (kobo/cents). 39 KES = 3900.
const PLAN_CURRENCY = "KES";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized: Missing or invalid Authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    
    // Create authenticated Supabase client
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { 
        global: { 
          headers: { Authorization: authHeader } 
        }
      },
    );

    // Verify JWT and get user claims
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      console.error("Auth error:", userError);
      return new Response(JSON.stringify({ error: "Unauthorized: Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = user.id;
    const email = user.email;
    
    if (!email) {
      return new Response(JSON.stringify({ error: "User email missing" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const callbackUrl: string = body.callback_url || `${new URL(req.url).origin}/pro?verify=1`;

    const secretKey =
      Deno.env.get("PAYSTACK_SECRET_KEY") ??
      Deno.env.get("VITE_PAYSTACK_SECRET_KEY");

    if (!secretKey) {
      return new Response(JSON.stringify({
        error:
          "Paystack not configured (set PAYSTACK_SECRET_KEY in Supabase Edge Functions secrets)",
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const reference = `pro_${userId}_${Date.now()}`;

    const initResp = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        amount: PLAN_AMOUNT_KOBO,
        currency: PLAN_CURRENCY,
        reference,
        callback_url: callbackUrl,
        metadata: { user_id: userId, plan: "pro_monthly" },
      }),
    });

    const initJson = await initResp.json();
    if (!initResp.ok || !initJson.status) {
      console.error("Paystack init failed", initJson);
      return new Response(JSON.stringify({ error: initJson.message || "Init failed" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Store pending reference using service role (bypass RLS)
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    await admin.from("subscribers").upsert(
      {
        user_id: userId,
        email,
        paystack_reference: reference,
      },
      { onConflict: "user_id" },
    );

    return new Response(
      JSON.stringify({
        authorization_url: initJson.data.authorization_url,
        access_code: initJson.data.access_code,
        reference: initJson.data.reference,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
