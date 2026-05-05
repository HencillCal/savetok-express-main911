# Per-frame background removal service

This service processes animated GIFs or video files by:

- extracting frames with `ffmpeg`
- removing the background from each frame with `rembg`
- re-encoding an animated GIF or a WebM with alpha channel

Build and run (in the project root):

```sh
docker build -t perframe-service ./services/perframe
docker run --rm -p 8000:8000 perframe-service
```

Or with docker-compose (project root):

```sh
docker compose -f docker-compose.perframe.yml up --build
```

Example `curl` request:

```sh
curl -X POST "http://localhost:8000/process" \
  -F "file=@/path/to/animated.gif" \
  -F "output=webm" \
  -F "fps=15" \
  --output result.webm
```

Notes:
- This prototype uses `rembg` (ONNX models) and `ffmpeg`. The first run may download models and take extra time.
- For production, add size limits, authentication, queueing, and GPU-backed workers for performance.
