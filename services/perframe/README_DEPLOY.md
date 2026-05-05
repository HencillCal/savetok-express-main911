Deploying the per-frame service (Render and Fly.io)

This file explains two easy deployment options if you don't want to run Docker locally.

1) Render (Git-based Deploy)
-----------------------------
- We added a service entry to the repo `render.yaml`. You can deploy from the Render dashboard using that file, or create a new Web Service manually.

Manual steps (Render web UI):
- Go to Render → New → Web Service → Connect your Git repo.
- Choose Docker as the environment and set `Dockerfile Path` to `services/perframe/Dockerfile`.
- Set the `Start Command` (optional) to:

  uvicorn app:app --host 0.0.0.0 --port 8000

- Add the following Environment Variables in Render:
  - `PERFRAME_CORS_ALLOWED_ORIGINS` = your frontend origin (or `*` for testing)
  - `PERFRAME_JOBS_DIR` = `/tmp/perframe_jobs` (or a mounted disk path if you need persistence)

- Deploy. The service will build using the Dockerfile in `services/perframe`.

Notes:
- If the `render.yaml` method is preferred, Render will pick up the `render.yaml` file in the repo root and create the `perframe-service` there.
- Make sure the service's public URL is used as `VITE_PERFRAME_URL` in your frontend environment.

2) Fly.io (CLI)
----------------
Fly.io runs containers; it's a good low-friction option.

Prereqs:
- Install `flyctl`: https://fly.io/docs/hands-on/install-flyctl/
- Log in: `flyctl auth login`

From the repo root or `services/perframe` folder:

1. Create an app (pick a name):

```bash
cd services/perframe
flyctl apps create perframe-app
```

2. (Optional) Create a persistent volume for job artifacts:

```bash
flyctl volumes create perframe_data 10 -a perframe-app
```

3. Set environment variables (CORS, etc):

```bash
flyctl secrets set PERFRAME_CORS_ALLOWED_ORIGINS="https://your-frontend.example.com" -a perframe-app
flyctl secrets set PERFRAME_JOBS_DIR="/data/perframe_jobs" -a perframe-app
```

4. Deploy:

```bash
flyctl deploy -a perframe-app
```

After deploy, your app will be available at `https://perframe-app.fly.dev` (or the name you chose).

3) Frontend integration
------------------------
- Set `VITE_PERFRAME_URL` in your frontend hosting environment to the public URL of the per-frame service (e.g. `https://perframe-app.fly.dev`).
- Ensure CORS is configured: set `PERFRAME_CORS_ALLOWED_ORIGINS` on the service to include your frontend origin.

4) Troubleshooting
-------------------
- Build fails on `pip install rembg`: make sure the Dockerfile includes native libs (we added common dependencies). If a provider's build dies due to memory/time, try increasing the build instance size or use a multi-stage build with cached wheels.
- If `rembg` downloads models on first run, expect extra runtime start time and disk usage.
- If you prefer, I can prepare a Render dashboard step-by-step or run `flyctl` commands for you.
