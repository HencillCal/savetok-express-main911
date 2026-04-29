const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Expose-Headers": "Content-Disposition, Content-Length, Content-Type",
};

const abs = (u: string | null | undefined): string | null => {
  if (!u) return null;
  return u.startsWith("http") ? u : `https://www.tikwm.com${u}`;
};

async function proxyDownload(fileUrl: string, filename: string): Promise<Response> {
  const upstream = await fetch(fileUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
      "Referer": "https://www.tiktok.com/",
    },
  });

  if (!upstream.ok || !upstream.body) {
    return new Response(JSON.stringify({ error: `Upstream error: ${upstream.status}` }), {
      status: 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const contentType = upstream.headers.get("Content-Type") ||
    (filename.endsWith(".mp3") ? "audio/mpeg" : "video/mp4");
  const contentLength = upstream.headers.get("Content-Length");

  const headers: Record<string, string> = {
    ...corsHeaders,
    "Content-Type": contentType,
    "Content-Disposition": `attachment; filename="${filename.replace(/"/g, "")}"`,
    "Cache-Control": "no-store",
  };
  if (contentLength) headers["Content-Length"] = contentLength;

  return new Response(upstream.body, { status: 200, headers });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // GET = proxy download (streams the file with Content-Disposition: attachment)
    if (req.method === "GET") {
      const u = new URL(req.url);
      const fileUrl = u.searchParams.get("file");
      const filename = u.searchParams.get("filename") || "tiktok-video.mp4";
      if (!fileUrl || !/^https?:\/\//i.test(fileUrl)) {
        return new Response(JSON.stringify({ error: "Missing or invalid file URL" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const allowed = /(^https?:\/\/)([\w.-]+\.)?(tikwm\.com|tiktokcdn\.com|tiktokcdn-us\.com|tiktok\.com|byteoversea\.com|muscdn\.com|bytedance\.com)(\/|$)/i;
      if (!allowed.test(fileUrl)) {
        return new Response(JSON.stringify({ error: "Host not allowed" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return await proxyDownload(fileUrl, filename);
    }

    const { url } = await req.json();
    if (!url || typeof url !== "string") {
      return new Response(JSON.stringify({ error: "Missing TikTok URL" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tiktokRegex = /tiktok\.com|vm\.tiktok|vt\.tiktok/i;
    if (!tiktokRegex.test(url)) {
      return new Response(JSON.stringify({ error: "Please enter a valid TikTok URL" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiUrl = `https://www.tikwm.com/api/?url=${encodeURIComponent(url)}&hd=1`;
    const resp = await fetch(apiUrl, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    const json = await resp.json();

    if (!json || json.code !== 0 || !json.data) {
      return new Response(
        JSON.stringify({ error: json?.msg || "Could not fetch this video. It may be private or removed." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const d = json.data;
    const images: string[] = Array.isArray(d.images)
      ? d.images.map((u: string) => abs(u)).filter((u: string | null): u is string => !!u)
      : [];
    const isSlideshow = images.length > 0;

    const result = {
      title: d.title ?? "TikTok Video",
      cover: d.cover ?? d.origin_cover ?? null,
      duration: d.duration ?? null,
      type: isSlideshow ? "slideshow" : "video",
      images,
      author: {
        nickname: d.author?.nickname ?? "",
        unique_id: d.author?.unique_id ?? "",
        avatar: d.author?.avatar ?? null,
      },
      stats: {
        plays: d.play_count ?? 0,
        likes: d.digg_count ?? 0,
        comments: d.comment_count ?? 0,
        shares: d.share_count ?? 0,
      },
      downloads: {
        no_watermark: isSlideshow ? null : abs(d.play),
        no_watermark_hd: isSlideshow ? null : abs(d.hdplay),
        watermark: isSlideshow ? null : abs(d.wmplay),
        music: abs(d.music),
      },
    };

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("tiktok-download error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
