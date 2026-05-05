from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse, StreamingResponse, PlainTextResponse
from fastapi.middleware.cors import CORSMiddleware
import requests
import re
import os
from urllib.parse import urlparse

app = FastAPI()

# Allow CORS from anywhere (edge function compatibility)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/138.0.0.0 Safari/537.36"
)

ALLOWED_DOWNLOAD_HOSTS = [
    "udemy.com",
    "udemycdn.com",
    "udemycdn.net",
    "cloudfront.net",
    "amazonaws.com",
    "akamaized.net",
]

USE_PLAYWRIGHT = os.environ.get("USE_PLAYWRIGHT", "1").lower() in ("1", "true", "yes")


def is_allowed_host(hostname: str) -> bool:
    host = (hostname or "").lower()
    return any(host == a or host.endswith('.' + a) for a in ALLOWED_DOWNLOAD_HOSTS)


def extract_mp4_urls(html: str):
    urls = set()
    mp4_regex = re.compile(r"https?://[^\"'\s>]+\.mp4[^\"'\s>]*", re.I)
    for m in mp4_regex.findall(html):
        u = m
        if re.search(r"preview|preview_asset|udemycdn|cloudfront|akamai|amazonaws|cdn", u, re.I):
            urls.add(u)

    # JSON style preview_url fields
    json_preview = re.compile(r'"preview(?:_url)?"\s*:\s*"([^"]+)"', re.I)
    for m in json_preview.findall(html):
        urls.add(m)

    return list(urls)


def sanitize_filename(value: str, fallback: str = "download") -> str:
    v = re.sub(r"[^a-z0-9._-]+", "-", value, flags=re.I)
    v = re.sub(r"-+", "-", v)
    v = re.sub(r"^-|-$", "", v)
    return v or fallback


def extract_with_playwright(url: str):
    try:
        from playwright.sync_api import sync_playwright
    except Exception as e:
        print("Playwright not available:", e)
        return []

    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch(headless=True, args=["--no-sandbox"])
            page = browser.new_page(user_agent=USER_AGENT)
            page.goto(url, wait_until="networkidle", timeout=30000)
            content = page.content()
            browser.close()
            return extract_mp4_urls(content)
    except Exception as e:
        print("Playwright extraction failed:", e)
        return []


@app.options("/functions/v1/udemy-download")
async def options_handler():
    return PlainTextResponse("ok")


@app.get("/functions/v1/udemy-download")
def proxy_download(file: str = None, filename: str = "udemy-media"):
    if not file:
        raise HTTPException(status_code=400, detail={"error": "Missing file URL"})

    try:
        parsed = urlparse(file)
    except Exception:
        raise HTTPException(status_code=400, detail={"error": "Invalid file URL"})

    if not is_allowed_host(parsed.hostname):
        raise HTTPException(status_code=400, detail={"error": "Host not allowed"})

    headers = {
        "User-Agent": USER_AGENT,
        "Accept": "*/*",
        "Referer": "https://www.udemy.com/",
    }

    try:
        upstream = requests.get(file, headers=headers, stream=True, timeout=20, allow_redirects=True)
    except requests.RequestException as e:
        raise HTTPException(status_code=502, detail={"error": f"Upstream request failed: {str(e)}"})

    if upstream.status_code >= 400:
        raise HTTPException(status_code=502, detail={"error": f"Upstream error: {upstream.status_code}"})

    def iter_stream():
        try:
            for chunk in upstream.iter_content(chunk_size=8192):
                if chunk:
                    yield chunk
        finally:
            upstream.close()

    headers_out = {
        "Content-Type": upstream.headers.get("Content-Type", "application/octet-stream"),
        "Content-Disposition": f'attachment; filename="{sanitize_filename(filename)}"',
        "Cache-Control": "no-store",
    }
    if upstream.headers.get("Content-Length"):
        headers_out["Content-Length"] = upstream.headers.get("Content-Length")

    return StreamingResponse(iter_stream(), headers=headers_out)


@app.post("/functions/v1/udemy-download")
def udemy_download(body: dict):
    requested_url = body.get("url") if isinstance(body, dict) else None
    requested_mode = body.get("mode") if isinstance(body, dict) else "preview"

    if not requested_url or not isinstance(requested_url, str):
        raise HTTPException(status_code=400, detail={"error": "Missing Udemy URL"})

    try:
        # Follow redirects to get final URL
        resolved = requests.get(requested_url, headers={"User-Agent": USER_AGENT}, timeout=15, allow_redirects=True)
        final_url = resolved.url
    except requests.RequestException as e:
        raise HTTPException(status_code=400, detail={"error": f"Failed to resolve URL: {str(e)}"})

    # Public preview extraction
    if requested_mode == "preview":
        try:
            resp = requests.get(final_url, headers={"User-Agent": USER_AGENT, "Accept": "text/html", "Accept-Language": "en-US,en;q=0.9"}, timeout=20)
        except requests.RequestException as e:
            raise HTTPException(status_code=400, detail={"error": f"Udemy page fetch failed: {str(e)}"})

        if resp.status_code != 200:
            # If Udemy blocked the request or returned non-200, attempt fallback to an external scraper if configured
            scraper = os.environ.get("UDEMY_SCRAPER_URL")
            if scraper:
                try:
                    fallback = requests.post(f"{scraper.rstrip('/')}/functions/v1/udemy-download", json={"url": requested_url, "mode": "preview"}, timeout=30)
                    if fallback.ok:
                        return JSONResponse(content=fallback.json())
                except Exception:
                    pass
            raise HTTPException(status_code=400, detail={"error": f"Udemy page fetch failed {resp.status_code}"})

        html = resp.text
        candidates = extract_mp4_urls(html)

        # If no candidates and Playwright is enabled, try rendering the page
        if not candidates and USE_PLAYWRIGHT:
            candidates = extract_with_playwright(final_url)

        # If still empty, try external scraper (if configured)
        if not candidates:
            scraper = os.environ.get("UDEMY_SCRAPER_URL")
            if scraper:
                try:
                    fallback = requests.post(f"{scraper.rstrip('/')}/functions/v1/udemy-download", json={"url": requested_url, "mode": "preview"}, timeout=30)
                    if fallback.ok:
                        return JSONResponse(content=fallback.json())
                except Exception:
                    pass
            return JSONResponse(status_code=404, content={"error": "No public preview media found on that page"})

        items = []
        for i, u in enumerate(candidates, start=1):
            items.append({
                "id": f"preview-{i}",
                "type": "video",
                "title": f"Preview {i}",
                "description": None,
                "thumbnail": None,
                "downloads": [
                    {
                        "label": "Preview MP4",
                        "url": u,
                        "filename": f"udemy-preview-{i}.mp4",
                        "functionName": "udemy-download",
                    },
                ],
            })

        return {
            "platform": "udemy",
            "sourceType": "preview",
            "title": None,
            "caption": None,
            "username": None,
            "authorName": None,
            "profilePic": None,
            "cover": items[0].get("thumbnail") if items else None,
            "items": items,
            "resolvedUrl": final_url,
        }

    # Owner / course scaffold
    if requested_mode in ("owner", "course"):
        token = body.get("udemy_api_token") or os.environ.get("UDEMY_API_TOKEN")
        if not token:
            return JSONResponse(status_code=400, content={
                "error": "Owner mode requires a Udemy API token. Provide `udemy_api_token` in the request body or set UDEMY_API_TOKEN on the server.",
            })

        # Basic scaffold: attempt to search course by slug using Udemy API
        slug_match = re.search(r"udemy\.com/course/([^/\?]+)", final_url, re.I)
        slug = slug_match.group(1) if slug_match else None
        if not slug:
            return JSONResponse(status_code=400, content={"error": "Could not determine course slug from URL"})

        try:
            api_resp = requests.get(f"https://www.udemy.com/api-2.0/courses/?search={slug}",
                                    headers={"Authorization": f"Bearer {token}", "User-Agent": USER_AGENT, "Accept": "application/json"},
                                    timeout=15)
            if api_resp.status_code >= 400:
                return JSONResponse(status_code=502, content={"error": f"Udemy API error {api_resp.status_code}: {api_resp.text}"})
            payload = api_resp.json()
            return {"message": "Udemy owner API scaffold: course search returned", "payload": payload}
        except requests.RequestException as e:
            return JSONResponse(status_code=500, content={"error": str(e)})

    return JSONResponse(status_code=400, content={"error": "Unsupported mode"})
