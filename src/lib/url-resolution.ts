import { supabase } from "@/integrations/supabase/client";

export const isTinyUrl = (value: string) =>
  /https?:\/\/(?:www\.)?(?:tinyurl\.com|tiny\.one)\//i.test(value);

export const resolveInputUrl = async (value: string) => {
  const trimmed = value.trim();
  if (!isTinyUrl(trimmed)) {
    return { url: trimmed, resolved: false };
  }

  const { data, error } = await supabase.functions.invoke("tinyurl-tools", {
    body: { action: "resolve", url: trimmed },
  });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);

  return {
    url: data?.resolvedUrl ?? trimmed,
    resolved: true,
  };
};
