Per-frame backend and Vercel — guidance

This repository contains two parts:
- Frontend (Vite React) — suitable for Vercel static hosting.
- Per-frame backend (ffmpeg + rembg) — not suitable for Vercel serverless functions because it requires native libs, long-running processing, and more memory.

Recommended deployment split:
- Frontend: deploy to Vercel using this `vercel.json` (builds `npm run build` and serves `dist`). Set `VITE_PERFRAME_URL` in Vercel environment variables to the public per-frame service URL.
- Per-frame backend: deploy to a container-friendly host (Render, Fly.io, DigitalOcean, AWS/GCP) that can run the `services/perframe/Dockerfile` or a Linux VM.

If you still want to host everything on Vercel:
- Consider converting the per-frame work into an external API (hosted elsewhere) and point the frontend to it.
- Vercel serverless functions have strict CPU/RAM/time limits and do not support installing arbitrary apt packages at runtime.

Helpful links:
- Vercel static build docs: https://vercel.com/docs/concepts/deployments/overview
- Render Docker services: https://render.com/docs/docker
- Fly.io deploy (container): https://fly.io/docs/
