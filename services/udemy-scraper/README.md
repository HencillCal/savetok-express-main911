Udemy Scraper service

This small FastAPI service provides two compatible endpoints so the frontend can
fallback to a self-hosted scraper when Supabase Edge Functions cannot reach Udemy
or when more advanced scraping (headless browsers) is required.

Endpoints:
- POST /functions/v1/udemy-download  -> body: { url: string, mode?: 'preview'|'course'|'owner' }
  Returns the same JSON shape as the Supabase Edge Function (list of items and downloads).

- GET /functions/v1/udemy-download?file=<file>&filename=<name>  -> proxies and streams the file.

Run locally:

```bash
python -m venv .venv
source .venv/bin/activate    # or .\.venv\Scripts\Activate on Windows
pip install -r requirements.txt
python -m playwright install --with-deps chromium   # required once to download browser binaries
python -m uvicorn app:app --reload --host 127.0.0.1 --port 8080
```

Or using Docker:

```bash
docker build -t udemy-scraper:dev .
docker run -p 8080:8080 udemy-scraper:dev
```

To use from the frontend, set `VITE_UDEMY_SCRAPER_URL` to the base URL (e.g.
`http://localhost:8080` or your deployed service URL). The frontend will then
route `udemy-download` invocations and downloads through this service.
