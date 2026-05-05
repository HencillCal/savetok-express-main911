Running the per-frame service without Docker

This document explains how to run the per-frame background removal service if you don't have Docker.

Recommended: Use WSL (Windows Subsystem for Linux)
-----------------------------------------------
WSL provides a Linux environment on Windows and is the simplest way to run this service without Docker.

1) Open WSL (Ubuntu) and change to the repo path mounted under /mnt (example):

   cd /mnt/c/Users/YourUser/Desktop/savetok-express-main/services/perframe

2) Run the helper script (it will install system deps, create a venv, and start the app):

   chmod +x ./run-local.sh
   ./run-local.sh

3) Visit the health endpoint to verify:

   http://localhost:8000/health

Notes:
- The script installs system packages using apt (sudo required).
- The first run may download machine learning models used by `rembg` (this can take time and disk space).
- If you need to change CORS, set the environment variable `PERFRAME_CORS_ALLOWED_ORIGINS` to a comma-separated list of origins (or `*` for testing).

Native Windows (Conda recommended)
----------------------------------
Running natively on Windows is more involved because `rembg` and some dependencies expect Linux libraries.
Using Conda (Miniconda/Anaconda) with `conda-forge` is the recommended approach for native Windows.

1) Install Miniconda: https://docs.conda.io/en/latest/miniconda.html
2) Create an environment and install packages:

   conda create -n perframe python=3.11 -y
   conda activate perframe
   conda install -c conda-forge ffmpeg libsndfile libglib libpng libjpeg pkg-config -y

3) Install Python deps and run:

   pip install --upgrade pip
   pip install -r requirements.txt
   uvicorn app:app --host 0.0.0.0 --port 8000

Caveats for Windows:
- `rembg` may require Visual C++ Build Tools; installing the 'Build Tools for Visual Studio' may be necessary.
- If `rembg` installation fails, prefer using WSL or a Linux VM where `apt` installs the required native libs.

Hosting in the cloud (short)
----------------------------
If you host your frontend online, the per-frame service must also be hosted (or accessible) for animated GIF preservation.
You can deploy the `services/perframe` folder to any provider that supports containers or Python apps. If Docker isn't available locally, consider deploying to:
- Render (use the Dockerfile in the folder)
- Fly.io
- DigitalOcean App Platform
- Google Cloud Run (container)
- An AWS EC2 or ECS service (container or VM)

When deploying to the cloud, set the following env vars as needed:
- `PERFRAME_CORS_ALLOWED_ORIGINS` — the frontend origin (or `*` while testing)
- `PERFRAME_JOBS_DIR` — optional path to store job artifacts (default: /tmp/perframe_jobs)

Questions / Troubleshooting
---------------------------
- If you encounter `rembg` or pip install errors on Windows, post the pip error log here and I can suggest fixes or alternates.
- If you prefer, I can prepare a Render or Fly.io deployment config for this folder and guide you through deploying it (no Docker needed locally).