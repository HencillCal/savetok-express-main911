from fastapi import FastAPI, UploadFile, File, Form, HTTPException, BackgroundTasks, Request
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import tempfile
import os
import shutil
import subprocess
import glob
import uuid
import json
import time
import httpx

app = FastAPI(title="Per-frame Background Removal Service")

JOBS_DIR = os.environ.get("PERFRAME_JOBS_DIR", "/tmp/perframe_jobs")
os.makedirs(JOBS_DIR, exist_ok=True)

# Configure CORS (set PERFRAME_CORS_ALLOWED_ORIGINS=comma,separated,origins)
_cors_env = os.environ.get("PERFRAME_CORS_ALLOWED_ORIGINS", "*")
if _cors_env.strip() == "*" or not _cors_env.strip():
    _allow_origins = ["*"]
else:
    _allow_origins = [o.strip() for o in _cors_env.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def run_cmd(cmd, cwd=None):
    try:
        res = subprocess.run(cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, cwd=cwd)
        return res
    except subprocess.CalledProcessError as e:
        stdout = e.stdout.decode("utf-8", errors="ignore")
        stderr = e.stderr.decode("utf-8", errors="ignore")
        raise RuntimeError(f"Command failed: {' '.join(cmd)}\nSTDOUT: {stdout}\nSTDERR: {stderr}")


def job_path(job_id: str) -> str:
    return os.path.join(JOBS_DIR, job_id)


def write_job_meta(job_id: str, meta: dict):
    path = job_path(job_id)
    os.makedirs(path, exist_ok=True)
    with open(os.path.join(path, "meta.json"), "w", encoding="utf-8") as f:
        meta["updated_at"] = time.time()
        json.dump(meta, f)


def read_job_meta(job_id: str) -> dict:
    try:
        with open(os.path.join(job_path(job_id), "meta.json"), "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {}


async def notify_webhook(webhook: str, payload: dict):
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            await client.post(webhook, json=payload)
    except Exception:
        # Webhook failures are best-effort
        pass


def process_file_sync(input_path: str, out_dir: str, frames_dir: str, output: str, fps: int, job_meta: dict = None):
    """Process file synchronously. Returns output path."""
    # Extract frames to PNGs
    run_cmd(["ffmpeg", "-y", "-i", input_path, os.path.join(frames_dir, "frame%05d.png")])
    frames = sorted(glob.glob(os.path.join(frames_dir, "*.png")))
    if not frames:
        # Try single-frame fallback
        run_cmd(["ffmpeg", "-y", "-i", input_path, "-frames:v", "1", os.path.join(frames_dir, "frame%05d.png")])
        frames = sorted(glob.glob(os.path.join(frames_dir, "*.png")))
    if not frames:
        raise RuntimeError("No frames extracted from input")

    # rembg batch
    run_cmd(["rembg", "p", frames_dir, out_dir])
    out_frames = sorted(glob.glob(os.path.join(out_dir, "*.png")))
    if not out_frames:
        raise RuntimeError("No output frames after rembg")

    if output == "webm":
        out_file = os.path.join(os.path.dirname(out_dir), "out.webm")
        webm_cmd = [
            "ffmpeg",
            "-y",
            "-framerate",
            str(fps),
            "-i",
            os.path.join(out_dir, "frame%05d.png"),
            "-c:v",
            "libvpx-vp9",
            "-pix_fmt",
            "yuva420p",
            "-lossless",
            "1",
            out_file,
        ]
        run_cmd(webm_cmd)
        return out_file
    else:
        palette = os.path.join(os.path.dirname(out_dir), "palette.png")
        run_cmd([
            "ffmpeg",
            "-y",
            "-i",
            os.path.join(out_dir, "frame%05d.png"),
            "-vf",
            "palettegen=reserve_transparent=on",
            palette,
        ])
        out_file = os.path.join(os.path.dirname(out_dir), "out.gif")
        run_cmd([
            "ffmpeg",
            "-y",
            "-framerate",
            str(fps),
            "-i",
            os.path.join(out_dir, "frame%05d.png"),
            "-i",
            palette,
            "-lavfi",
            "paletteuse",
            out_file,
        ])
        return out_file


def process_job_sync(job_id: str, input_path: str, filename: str, output: str, fps: int, webhook: str = None, base_callback_url: str = None):
    meta = read_job_meta(job_id)
    try:
        meta.update({"status": "processing", "progress": 5})
        write_job_meta(job_id, meta)

        tmpdir = job_path(job_id)
        frames_dir = os.path.join(tmpdir, "frames")
        out_dir = os.path.join(tmpdir, "out")
        os.makedirs(frames_dir, exist_ok=True)
        os.makedirs(out_dir, exist_ok=True)

        meta.update({"progress": 10}); write_job_meta(job_id, meta)

        # extract + rembg + encode with progress updates at milestones
        run_cmd(["ffmpeg", "-y", "-i", input_path, os.path.join(frames_dir, "frame%05d.png")])
        meta.update({"progress": 30}); write_job_meta(job_id, meta)

        run_cmd(["rembg", "p", frames_dir, out_dir])
        meta.update({"progress": 70}); write_job_meta(job_id, meta)

        out_file = None
        if output == "webm":
            out_file = os.path.join(tmpdir, "out.webm")
            run_cmd([
                "ffmpeg",
                "-y",
                "-framerate",
                str(fps),
                "-i",
                os.path.join(out_dir, "frame%05d.png"),
                "-c:v",
                "libvpx-vp9",
                "-pix_fmt",
                "yuva420p",
                "-lossless",
                "1",
                out_file,
            ])
        else:
            palette = os.path.join(tmpdir, "palette.png")
            run_cmd([
                "ffmpeg",
                "-y",
                "-i",
                os.path.join(out_dir, "frame%05d.png"),
                "-vf",
                "palettegen=reserve_transparent=on",
                palette,
            ])
            out_file = os.path.join(tmpdir, "out.gif")
            run_cmd([
                "ffmpeg",
                "-y",
                "-framerate",
                str(fps),
                "-i",
                os.path.join(out_dir, "frame%05d.png"),
                "-i",
                palette,
                "-lavfi",
                "paletteuse",
                out_file,
            ])

        meta.update({"status": "done", "progress": 100, "result": os.path.basename(out_file)})
        write_job_meta(job_id, meta)

        if webhook:
            payload = {"job_id": job_id, "status": "done", "result_url": base_callback_url + f"/jobs/{job_id}/result" if base_callback_url else None}
            # notify async best-effort
            try:
                import asyncio
                asyncio.run(notify_webhook(webhook, payload))
            except Exception:
                pass

    except Exception as e:
        meta.update({"status": "error", "progress": meta.get("progress", 0), "error": str(e)})
        write_job_meta(job_id, meta)
        if webhook:
            payload = {"job_id": job_id, "status": "error", "error": str(e)}
            try:
                import asyncio
                asyncio.run(notify_webhook(webhook, payload))
            except Exception:
                pass


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/process")
async def process(request: Request, file: UploadFile = File(...), output: str = Form("gif"), fps: int = Form(15), async_job: int = Form(0), webhook: str | None = Form(None), background_tasks: BackgroundTasks = None):
    """
    Accepts an uploaded GIF or video and either processes synchronously or schedules an async job.
    Form fields:
      - output: 'gif' or 'webm' (default: gif)
      - fps: frame rate
      - async_job: 1 to schedule job and return job id
      - webhook: optional webhook URL to POST result to when done
    """
    tmpdir = tempfile.mkdtemp(prefix="perframe_")
    os.makedirs(tmpdir, exist_ok=True)
    input_path = os.path.join(tmpdir, "input_" + os.path.basename(file.filename))
    with open(input_path, "wb") as f:
        f.write(await file.read())

    if int(async_job):
        job_id = uuid.uuid4().hex
        job_dir = job_path(job_id)
        os.makedirs(job_dir, exist_ok=True)
        # move input into job dir
        new_input = os.path.join(job_dir, os.path.basename(input_path))
        shutil.move(input_path, new_input)
        meta = {"id": job_id, "status": "pending", "progress": 0, "filename": file.filename, "output": output, "fps": fps, "created_at": time.time(), "error": None}
        write_job_meta(job_id, meta)

        # schedule background processing
        base_callback_url = str(request.base_url).rstrip("/")
        background_tasks.add_task(process_job_sync, job_id, new_input, file.filename, output, fps, webhook, base_callback_url)

        return JSONResponse({"job_id": job_id, "status_url": f"{base_callback_url}/jobs/{job_id}", "result_url": f"{base_callback_url}/jobs/{job_id}/result"})

    # synchronous path
    try:
        frames_dir = os.path.join(tmpdir, "frames")
        out_dir = os.path.join(tmpdir, "out")
        os.makedirs(frames_dir, exist_ok=True)
        os.makedirs(out_dir, exist_ok=True)

        out_file = process_file_sync(input_path, out_dir, frames_dir, output, fps)
        if background_tasks is not None:
            background_tasks.add_task(shutil.rmtree, tmpdir, True)
        mime = "video/webm" if output == "webm" else "image/gif"
        return FileResponse(out_file, media_type=mime, filename=os.path.basename(out_file))
    except HTTPException:
        shutil.rmtree(tmpdir, ignore_errors=True)
        raise
    except Exception as e:
        shutil.rmtree(tmpdir, ignore_errors=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/jobs/{job_id}")
def get_job(job_id: str):
    meta = read_job_meta(job_id)
    if not meta:
        return JSONResponse({"error": "Not found"}, status_code=404)
    return JSONResponse(meta)


@app.get("/jobs/{job_id}/result")
def get_job_result(job_id: str):
    meta = read_job_meta(job_id)
    if not meta:
        return JSONResponse({"error": "Not found"}, status_code=404)
    if meta.get("status") != "done":
        return JSONResponse({"error": "Job not complete", "status": meta.get("status")}, status_code=409)
    filename = meta.get("result")
    if not filename:
        return JSONResponse({"error": "No result file"}, status_code=500)
    path = os.path.join(job_path(job_id), filename)
    if not os.path.exists(path):
        return JSONResponse({"error": "Result missing"}, status_code=500)
    mime = "video/webm" if filename.endswith(".webm") else "image/gif"
    return FileResponse(path, media_type=mime, filename=filename)

