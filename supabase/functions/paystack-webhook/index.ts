import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { createHmac } from "node:crypto";

// Public webhook — no auth header required. Verified via Paystack HMAC signature.
Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const secretKey =
    Deno.env.get("PAYSTACK_SECRET_KEY") ??
    Deno.env.get("VITE_PAYSTACK_SECRET_KEY");

  if (!secretKey) return new Response("Paystack not configured", { status: 500 });

  const raw = await req.text();
  const signature = req.headers.get("x-paystack-signature") ?? "";
  const computed = createHmac("sha512", secretKey).update(raw).digest("hex");
  if (computed !== signature) {
    console.warn("Invalid Paystack signature");
    return new Response("Invalid signature", { status: 401 });
  }

  let event: any;
  try {
    event = JSON.parse(raw);
  } catch {
    return new Response("Bad JSON", { status: 400 });
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    if (event.event === "charge.success") {
      const data = event.data;
      const userId = data?.metadata?.user_id as string | undefined;
      const reference = data?.reference as string | undefined;
      const email = data?.customer?.email as string | undefined;

      if (!userId) {
        console.warn("charge.success without user_id metadata", { reference });
        return new Response("ok", { status: 200 });
      }

      const paidAt = data.paid_at ? new Date(data.paid_at) : new Date();
      const periodEnd = new Date(paidAt.getTime() + 30 * 24 * 60 * 60 * 1000);

      const { error } = await admin.from("subscribers").upsert(
        {
          user_id: userId,
          email: email ?? null,
          is_pro: true,
          paystack_reference: reference ?? null,
          paystack_customer_code: data.customer?.customer_code ?? null,
          current_period_end: periodEnd.toISOString(),
        },
        { onConflict: "user_id" },
      );
      if (error) console.error("Webhook upsert failed", error);
    } else if (
      event.event === "subscription.disable" ||
      event.event === "subscription.not_renew" ||
      event.event === "invoice.payment_failed"
    ) {
      const customerCode = event.data?.customer?.customer_code as string | undefined;
      if (customerCode) {
        await admin
          .from("subscribers")
          .update({ is_pro: false })
          .eq("paystack_customer_code", customerCode);
      }
    }
  } catch (e) {
    console.error("Webhook handler error", e);
  }

  return new Response("ok", { status: 200 });
});
