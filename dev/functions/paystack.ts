import { createClient } from "@supabase/supabase-js";
import {
  corsHeaders,
  json,
} from "../../supabase/functions/_shared/http.ts";

const PLAN_AMOUNT_KOBO = 3900;
const PLAN_CURRENCY = "KES";

type PaystackAuthUser = {
  id: string;
  email: string;
};

type PaystackInitResponse = {
  status: boolean;
  message?: string;
  data?: {
    authorization_url?: string;
    access_code?: string;
    reference?: string;
  };
};

type PaystackVerifyResponse = {
  status: boolean;
  message?: string;
  data?: {
    status?: string;
    paid_at?: string;
    customer?: {
      email?: string;
      customer_code?: string;
    };
    metadata?: {
      user_id?: string;
      plan?: string;
    };
  };
};

const env = (globalThis as typeof globalThis & {
  process?: { env?: Record<string, string | undefined> };
}).process?.env ?? {};

const getSupabaseUrl = () => env.VITE_SUPABASE_URL ?? env.SUPABASE_URL ?? "";
const getSupabasePublishableKey = () => env.VITE_SUPABASE_PUBLISHABLE_KEY ?? env.SUPABASE_PUBLISHABLE_KEY ?? "";
const getSupabaseServiceKey = () => env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const getPaystackSecretKey = () => env.PAYSTACK_SECRET_KEY ?? "";

const createAuthedClient = () => {
  const supabaseUrl = getSupabaseUrl();
  const supabaseKey = getSupabasePublishableKey();

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing Supabase environment variables");
  }

  return createClient(supabaseUrl, supabaseKey);
};

const createAdminClient = () => {
  const supabaseUrl = getSupabaseUrl();
  const serviceKey = getSupabaseServiceKey();

  if (!supabaseUrl || !serviceKey) return null;

  return createClient(supabaseUrl, serviceKey);
};

const requireAuthedUser = async (req: Request): Promise<PaystackAuthUser> => {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("Unauthorized");
  }

  const token = authHeader.replace("Bearer ", "");
  const client = createAuthedClient();
  const { data, error } = await client.auth.getUser(token);

  if (error || !data.user?.id || !data.user.email) {
    throw new Error("Unauthorized");
  }

  return {
    id: data.user.id,
    email: data.user.email,
  };
};

const persistSubscriber = async (payload: {
  userId: string;
  email: string;
  isPro: boolean;
  reference: string;
  customerCode?: string | null;
  currentPeriodEnd?: string | null;
}) => {
  const admin = createAdminClient();
  if (!admin) return;

  await admin.from("subscribers").upsert(
    {
      user_id: payload.userId,
      email: payload.email,
      is_pro: payload.isPro,
      paystack_reference: payload.reference,
      paystack_customer_code: payload.customerCode ?? null,
      current_period_end: payload.currentPeriodEnd ?? null,
    },
    { onConflict: "user_id" },
  );
};

const createPaystackReference = (userId: string) => `pro_${userId}_${Date.now()}`;

export const handlePaystackInitialize = async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const { id: userId, email } = await requireAuthedUser(req);
    const secretKey = getPaystackSecretKey();

    if (!secretKey) {
      return json({ error: "PAYSTACK_SECRET_KEY is missing from .env" }, 500);
    }

    const body = await req.json().catch(() => ({}));
    const callbackUrl =
      typeof body?.callback_url === "string" && body.callback_url.trim().length > 0
        ? body.callback_url
        : `${new URL(req.url).origin}/pro`;

    const reference = createPaystackReference(userId);

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

    const initJson = (await initResp.json()) as PaystackInitResponse;

    if (!initResp.ok || !initJson.status) {
      return json({ error: initJson.message || "Init failed" }, 502);
    }

    await persistSubscriber({
      userId,
      email,
      isPro: false,
      reference,
    });

    return json({
      authorization_url: initJson.data?.authorization_url,
      access_code: initJson.data?.access_code,
      reference: initJson.data?.reference ?? reference,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message === "Unauthorized" ? 401 : 500;
    return json({ error: message }, status);
  }
};

export const handlePaystackVerify = async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const { id: userId, email } = await requireAuthedUser(req);
    const secretKey = getPaystackSecretKey();

    if (!secretKey) {
      return json({ error: "PAYSTACK_SECRET_KEY is missing from .env" }, 500);
    }

    const body = await req.json().catch(() => ({}));
    const reference = typeof body?.reference === "string" ? body.reference.trim() : "";
    if (!reference) {
      return json({ error: "Missing reference" }, 400);
    }

    const verifyResp = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: {
        Authorization: `Bearer ${secretKey}`,
      },
    });

    const verifyJson = (await verifyResp.json()) as PaystackVerifyResponse;

    if (!verifyResp.ok || !verifyJson.status) {
      return json({ error: verifyJson.message || "Verify failed" }, 502);
    }

    const data = verifyJson.data;
    const isSuccess = data?.status === "success";
    const metadataUserId = data?.metadata?.user_id;

    if (metadataUserId && metadataUserId !== userId) {
      return json({ error: "Reference does not belong to user" }, 403);
    }

    if (!isSuccess) {
      return json({
        is_pro: false,
        status: data?.status ?? "unknown",
      });
    }

    const paidAt = data?.paid_at ? new Date(data.paid_at) : new Date();
    const currentPeriodEnd = new Date(paidAt.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();

    await persistSubscriber({
      userId,
      email: email ?? data?.customer?.email ?? "",
      isPro: true,
      reference,
      customerCode: data?.customer?.customer_code ?? null,
      currentPeriodEnd,
    });

    return json({
      is_pro: true,
      current_period_end: currentPeriodEnd,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message === "Unauthorized" ? 401 : 500;
    return json({ error: message }, status);
  }
};
