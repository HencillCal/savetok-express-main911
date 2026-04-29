import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub as string;
    const email = claimsData.claims.email as string | undefined;

    const body = await req.json().catch(() => ({}));
    const reference: string | undefined = body.reference;
    if (!reference) {
      return new Response(JSON.stringify({ error: "Missing reference" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const secretKey =
      Deno.env.get("PAYSTACK_SECRET_KEY") ??
      Deno.env.get("VITE_PAYSTACK_SECRET_KEY");

    if (!secretKey) {
      return new Response(
        JSON.stringify({
          error:
            "Paystack not configured (set PAYSTACK_SECRET_KEY in Supabase Edge Functions secrets)",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const verifyResp = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${secretKey}` },
    });
    const verifyJson = await verifyResp.json();
    if (!verifyResp.ok || !verifyJson.status) {
      console.error("Paystack verify failed", verifyJson);
      return new Response(JSON.stringify({ error: verifyJson.message || "Verify failed" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = verifyJson.data;
    const isSuccess = data?.status === "success";
    const metaUserId = data?.metadata?.user_id as string | undefined;

    // Ensure the reference belongs to the calling user
    if (metaUserId && metaUserId !== userId) {
      return new Response(JSON.stringify({ error: "Reference does not belong to user" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!isSuccess) {
      return new Response(JSON.stringify({ is_pro: false, status: data?.status ?? "unknown" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 30 days from paid_at (or now)
    const paidAt = data.paid_at ? new Date(data.paid_at) : new Date();
    const periodEnd = new Date(paidAt.getTime() + 30 * 24 * 60 * 60 * 1000);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { error: upsertErr } = await admin.from("subscribers").upsert(
      {
        user_id: userId,
        email: email ?? data.customer?.email ?? null,
        is_pro: true,
        paystack_reference: reference,
        paystack_customer_code: data.customer?.customer_code ?? null,
        current_period_end: periodEnd.toISOString(),
      },
      { onConflict: "user_id" },
    );

    if (upsertErr) {
      console.error("Upsert subscriber failed", upsertErr);
      return new Response(JSON.stringify({ error: upsertErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ is_pro: true, current_period_end: periodEnd.toISOString() }),
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
