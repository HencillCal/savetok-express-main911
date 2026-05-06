from pathlib import Path

path = Path('supabase/functions/youtube-download/index.ts')
text = path.read_text(encoding='utf-8')
old = '''const parsePlayerResponseFromHtml = (html: string): PlayerResponse | null => {
  // Attempt to extract ytInitialPlayerResponse JSON from inline scripts
  const patterns = [
    /ytInitialPlayerResponse\s*=\s*(\{.+?\})\s*;\s*var ytInitialPlayerResponse/s,
    /ytInitialPlayerResponse\s*=\s*(\{.+?\})\s*;\s*/s,
    /window\["ytInitialPlayerResponse"\]\s*=\s*(\{.+?\})\s*;/s,
    /"playerResponse"\s*:\s*(\{.+?\})\s*,\s*"/,
  ];

  for (const re of patterns) {
    const m = re.exec(html);
    if (m && m[1]) {
      try {
        const parsed = JSON.parse(m[1]);
        return parsed as PlayerResponse;
      } catch (e) {
        // ignore parse errors and continue trying other patterns
      }
    }
  }

  return null;
};'''
new = '''const extractJsonObject = (html: string, startIndex: number): string | null => {
  let depth = 0;
  let inString = false;
  let stringQuote = "";
  let escaped = false;

  for (let index = startIndex; index < html.length; index += 1) {
    const char = html[index];

    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === "\\") {
        escaped = true;
        continue;
      }
      if (char === stringQuote) {
        inString = false;
      }
      continue;
    }

    if (char === '"' || char === "'") {
      inString = true;
      stringQuote = char;
      continue;
    }

    if (char === "{") {
      depth += 1;
      if (depth === 1) startIndex = index;
    } else if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        return html.slice(startIndex, index + 1);
      }
    }
  }

  return null;
};

const parsePlayerResponseFromHtml = (html: string): PlayerResponse | null => {
  const patterns = [
    /ytInitialPlayerResponse\s*=\s*/i,
    /window\["ytInitialPlayerResponse"\]\s*=\s*/i,
    /window\['ytInitialPlayerResponse'\]\s*=\s*/i,
    /"playerResponse"\s*:\s*/i,
  ];

  for (const pattern of patterns) {
    const match = pattern.exec(html);
    if (!match) continue;

    const jsonStart = html.indexOf("{", match.index + match[0].length - 1);
    if (jsonStart === -1) continue;

    const jsonString = extractJsonObject(html, jsonStart);
    if (!jsonString) continue;

    try {
      return JSON.parse(jsonString) as PlayerResponse;
    } catch {
      continue;
    }
  }

  return null;
};'''

if old not in text:
    raise RuntimeError('Old block not found in youtube-download/index.ts')

text = text.replace(old, new)
path.write_text(text, encoding='utf-8')
print('PATCHED')
