import { supabase } from "@/integrations/supabase/client";

const LOCAL_DEV_FUNCTIONS = new Set([
  "facebook-download",
  "youtube-download",
]);

export const usesLocalDevFunction = (functionName: string) =>
  import.meta.env.DEV && LOCAL_DEV_FUNCTIONS.has(functionName);

export const publicFunctionBase = (functionName: string) =>
  usesLocalDevFunction(functionName)
    ? window.location.origin
    : import.meta.env.VITE_SUPABASE_URL;

const readFunctionError = async (response: Response) => {
  try {
    const payload = await response.clone().json() as { error?: string };
    if (payload?.error) return payload.error;
  } catch {
    try {
      const text = await response.clone().text();
      if (text) return text;
    } catch {
      // Ignore parsing errors and fall through.
    }
  }

  return `Function error ${response.status}`;
};

export const invokePublicFunction = async <T>(functionName: string, body: unknown): Promise<T> => {
  if (usesLocalDevFunction(functionName)) {
    const response = await fetch(`${publicFunctionBase(functionName)}/functions/v1/${functionName}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      throw new Error(await readFunctionError(response));
    }

    const payload = await response.json() as { error?: string } & T;
    if (payload?.error) throw new Error(payload.error);
    return payload as T;
  }

  const { data, error } = await supabase.functions.invoke(functionName, {
    body,
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data as T;
};
