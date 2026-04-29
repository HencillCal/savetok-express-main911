// Apply a custom filename pattern with tokens.
// Supported tokens: {username}, {type}, {index}, {index2}, {ext}, {original}
// Index is 1-based. {index2} pads to 2 digits.

export type PatternContext = {
  username?: string | null;
  type?: string | null; // e.g. "video", "image", "audio", "reel"
  index?: number;
  total?: number;
  original: string; // original filename (with extension)
};

const sanitize = (value: string) =>
  value.replace(/[\\/:*?"<>|]+/g, "-").replace(/\s+/g, " ").trim() || "file";

export const splitExt = (filename: string): { base: string; ext: string } => {
  const dot = filename.lastIndexOf(".");
  if (dot <= 0 || dot === filename.length - 1) return { base: filename, ext: "" };
  return { base: filename.slice(0, dot), ext: filename.slice(dot + 1) };
};

export const applyPattern = (pattern: string, ctx: PatternContext): string => {
  const { base: origBase, ext: origExt } = splitExt(ctx.original);
  const replacements: Record<string, string> = {
    "{username}": ctx.username ? sanitize(ctx.username) : "user",
    "{type}": ctx.type ? sanitize(ctx.type) : "media",
    "{index}": String(ctx.index ?? 1),
    "{index2}": String(ctx.index ?? 1).padStart(2, "0"),
    "{ext}": origExt || "bin",
    "{original}": sanitize(origBase),
  };

  let out = pattern;
  for (const [key, val] of Object.entries(replacements)) {
    out = out.split(key).join(val);
  }

  // Ensure extension present
  const { ext } = splitExt(out);
  if (!ext && origExt) out = `${out}.${origExt}`;
  return sanitize(out);
};

export const DEFAULT_PATTERN = "{username}-{type}-{index2}.{ext}";
