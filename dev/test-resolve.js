#!/usr/bin/env node
(async () => {
  const startUrl = process.argv[2] || "https://is.gd/WoqG6p";
  const UA = "savetok-test/1.0";
  const allowedShortenerHosts = [
    "tinyurl.com",
    "tiny.one",
    "is.gd",
    "v.gd",
    "da.gd",
    "bit.ly",
    "t.co",
    "tiny.cc",
    "shorturl.at",
    "rebrand.ly",
    "cutt.ly",
    "t.ly",
    "ow.ly",
    "short.io",
  ];

  const isAllowed = (host) => {
    const h = host.toLowerCase();
    return allowedShortenerHosts.some((a) => h === a || h.endsWith(`.${a}`));
  };

  const fetchFn = typeof fetch === 'function' ? fetch : null;
  if (!fetchFn) {
    console.error('Node fetch not available in this runtime.');
    process.exit(1);
  }

  let current = startUrl;
  const hops = [];

  for (let i = 0; i < 6; i++) {
    try {
      const parsed = new URL(current);
      if (!isAllowed(parsed.hostname)) break;
    } catch (e) {
      break;
    }

    console.log(`Fetching (manual) ${current}`);
    const res = await fetchFn(current, { method: 'GET', redirect: 'manual', headers: { 'User-Agent': UA, Accept: 'text/html,application/xhtml+xml' } });
    console.log(`  status: ${res.status}`);
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get('location');
      if (!loc) break;
      current = new URL(loc, current).toString();
      hops.push(current);
      console.log(`  redirect -> ${current}`);
      continue;
    }

    const ct = res.headers.get('content-type') || '';
    if (res.ok && /text\/(?:html|xhtml)/i.test(ct)) {
      const html = await res.text();
      // meta refresh
      const meta = html.match(/<meta[^>]*http-equiv=["']?refresh["']?[^>]*content=["']?([^"'>]+)["']?[^>]*>/i);
      if (meta) {
        const content = meta[1];
        const urlMatch = content.match(/url\s*=\s*['"]?([^'";\s]+)/i);
        if (urlMatch) {
          current = new URL(urlMatch[1], current).toString();
          hops.push(current);
          console.log(`  meta-refresh -> ${current}`);
          continue;
        }
      }
      const canonical = html.match(/<link[^>]*rel=["']?canonical["']?[^>]*href=["']?([^"'>\s]+)["']?[^>]*>/i);
      if (canonical) {
        current = new URL(canonical[1], current).toString();
        hops.push(current);
        console.log(`  canonical -> ${current}`);
        continue;
      }
      const og = html.match(/<meta[^>]*property=["']?og:url["']?[^>]*content=["']?([^"'>\s]+)["']?[^>]*>/i);
      if (og) {
        current = new URL(og[1], current).toString();
        hops.push(current);
        console.log(`  og:url -> ${current}`);
        continue;
      }
    }

    break;
  }

  console.log('\nResult:');
  console.log('  final:', current);
  console.log('  hops:', hops.join(' -> ') || '(none)');
})();
