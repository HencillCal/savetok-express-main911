#!/usr/bin/env bash
set -e

# Run this inside WSL or a Linux environment. It will install system deps (requires sudo),
# create a Python venv, install Python deps, and start the FastAPI app with uvicorn.

echo "== Per-frame local runner (WSL/Linux) =="

echo "Installing system packages (sudo may be required)..."
sudo apt update
sudo apt install -y python3 python3-venv python3-pip ffmpeg build-essential git curl ca-certificates \
  libglib2.0-0 libsm6 libxext6 libxrender1 libgl1-mesa-glx libsndfile1 libmagic1 libjpeg-dev zlib1g-dev libpng-dev pkg-config

# Create venv
python3 -m venv .venv
. .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

# Optional: pre-download rembg models by running a small rembg command (best-effort)
# rembg p /dev/null /dev/null || true

echo "Starting uvicorn on 0.0.0.0:8000"
uvicorn app:app --host 0.0.0.0 --port 8000 --reload
