#!/usr/bin/env node
(async () => {
  const testUrl = process.argv[2] || "https://example.com/?savetok=1";
  const UA = "savetok-test/1.0";

  function okPrint(msg) { console.log(msg); }
  function errPrint(msg) { console.error(msg); }

  const fetchFn = typeof fetch === "function" ? fetch : null;
  if (!fetchFn) {
    errPrint("Global fetch is not available in this Node runtime. Aborting.");
    process.exit(1);
  }

  async function doFetch(url, opts = {}) {
    try {
      const res = await fetchFn(url, opts);
      const contentType = res.headers.get("content-type") || "";
      let body;
      if (contentType.includes("application/json")) body = await res.json();
      else body = await res.text();
      return { ok: res.ok, status: res.status, body };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  }

  okPrint(`Testing shorteners for: ${testUrl}\n`);

  const results = [];

  // is.gd
  results.push({ provider: "is.gd", result: await doFetch(`https://is.gd/create.php?format=json&url=${encodeURIComponent(testUrl)}`, { headers: { "User-Agent": UA } }) });

  // v.gd
  results.push({ provider: "v.gd", result: await doFetch(`https://v.gd/create.php?format=json&url=${encodeURIComponent(testUrl)}`, { headers: { "User-Agent": UA } }) });

  // da.gd (plain text)
  results.push({ provider: "da.gd", result: await doFetch(`https://da.gd/s?url=${encodeURIComponent(testUrl)}`, { headers: { "User-Agent": UA } }) });

  // tinyurl legacy
  results.push({ provider: "tinyurl-legacy", result: await doFetch(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(testUrl)}`, { headers: { "User-Agent": UA } }) });

  // bitly (if token present)
  if (process.env.BITLY_TOKEN) {
    results.push({ provider: "bitly", result: await doFetch("https://api-ssl.bitly.com/v4/shorten", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.BITLY_TOKEN}`, "Content-Type": "application/json", "User-Agent": UA },
      body: JSON.stringify({ long_url: testUrl }),
    }) });
  } else {
    results.push({ provider: "bitly", result: { ok: false, body: "SKIPPED (BITLY_TOKEN not set)" } });
  }

  // tinyurl official (if token present)
  if (process.env.TINYURL_API_TOKEN) {
    results.push({ provider: "tinyurl-api", result: await doFetch("https://api.tinyurl.com/create", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.TINYURL_API_TOKEN}`, "Content-Type": "application/json", "User-Agent": UA },
      body: JSON.stringify({ url: testUrl }),
    }) });
  } else {
    results.push({ provider: "tinyurl-api", result: { ok: false, body: "SKIPPED (TINYURL_API_TOKEN not set)" } });
  }

  // Print detailed results
  for (const r of results) {
    okPrint("----");
    okPrint(`Provider: ${r.provider}`);
    if (r.result.error) {
      errPrint(`Error: ${r.result.error}`);
      continue;
    }
    okPrint(`OK: ${r.result.ok}  Status: ${r.result.status ?? "-"}`);
    if (typeof r.result.body === "string") okPrint(`Body: ${r.result.body}`);
    else okPrint(`Body: ${JSON.stringify(r.result.body)}`);
  }

  // Summary: extract short URLs when possible
  okPrint("\nSummary:");
  for (const r of results) {
    let short = null;
    const b = r.result.body;
    if (!b) short = null;
    else if (typeof b === "string") short = b.trim();
    else if (b.shorturl) short = b.shorturl;
    else if (b.data?.tiny_url) short = b.data.tiny_url;
    else if (b.link) short = b.link;
    else if (b.short_url) short = b.short_url;
    console.log(`${r.provider}: ${short ?? "[no short url]"}`);
  }
})();
