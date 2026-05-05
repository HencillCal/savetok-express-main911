import { useState, useRef, type ChangeEvent, type DragEvent, type KeyboardEvent } from "react";
import { Image as ImageIcon, Loader2, Download, Trash2, Upload } from "lucide-react";
import { PageShell } from "@/components/site/PageShell";
import { PlatformRouteLinks } from "@/components/site/PlatformRouteLinks";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import {
  LARGE_GIF_BYTES,
  MAX_GIF_UPLOAD_BYTES,
  isRasterCutoutDataUrl,
  pngDataUrlToTransparentGifDataUrl,
  rasterToJpegDataUrl,
  shouldTreatAsGif,
  videoFrameToJpegDataUrl,
} from "@/lib/background-preprocess";
import { invokePublicFunction } from "@/lib/public-functions";
import { cn } from "@/lib/utils";

const BackgroundRemover = () => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [fileType, setFileType] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingLabel, setLoadingLabel] = useState("Removing background…");
  const [isDragging, setIsDragging] = useState(false);
  const [sourceIsGif, setSourceIsGif] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);
  const blobPreviewRef = useRef<string | null>(null);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(bytes < 10240 ? 1 : 0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Downscale large images on the client to reduce payload size and speed up processing.
  const downscaleDataUrl = (dataUrl: string, max = 1200) =>
    new Promise<string>((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const w = img.width;
        const h = img.height;
        const scale = Math.min(1, max / Math.max(w, h));
        if (scale === 1) return resolve(dataUrl);
        const cw = Math.max(1, Math.round(w * scale));
        const ch = Math.max(1, Math.round(h * scale));
        const c = document.createElement("canvas");
        c.width = cw;
        c.height = ch;
        const ctx = c.getContext("2d");
        if (!ctx) return reject(new Error("Canvas not supported"));
        ctx.drawImage(img, 0, 0, cw, ch);
        // Use JPEG to reduce payload size; remove.bg accepts JPEG inputs.
        const out = c.toDataURL("image/jpeg", 0.85);
        resolve(out);
      };
      img.onerror = (e) => reject(new Error("Could not load image"));
      img.src = dataUrl;
    });

  const revokeBlobPreview = () => {
    if (blobPreviewRef.current) {
      URL.revokeObjectURL(blobPreviewRef.current);
      blobPreviewRef.current = null;
    }
  };

  const applyFile = (f: File) => {
    const isVideo = f.type ? f.type.startsWith("video/") : false;
    const isImageMime = f.type ? f.type.startsWith("image/") : false;
    const gifByName = /\.gif$/i.test(f.name);
    const hasKnownImageExt = /\.(gif|png|jpe?g|webp|bmp|tiff)$/i.test(f.name);
    if (!isVideo && !isImageMime && !hasKnownImageExt) {
      toast.error("Please select an image or video file");
      return;
    }

    const isGif = shouldTreatAsGif(f, null);
    setSourceIsGif(isGif);

    let fileToUse = f;
    if (isGif && f.size > MAX_GIF_UPLOAD_BYTES) {
      fileToUse = new File([f.slice(0, MAX_GIF_UPLOAD_BYTES)], f.name, {
        type: f.type || "image/gif",
        lastModified: f.lastModified,
      });
      toast.info(`Using only the first ${MAX_GIF_UPLOAD_BYTES / (1024 * 1024)} MB of this GIF.`, { duration: 6500 });
    }

    setFile(fileToUse);

    if (isVideo) {
      setSourceIsGif(false);
      revokeBlobPreview();
      const url = URL.createObjectURL(fileToUse);
      blobPreviewRef.current = url;
      setPreview(url);
    } else {
      revokeBlobPreview();
      const reader = new FileReader();
      reader.onload = () => setPreview(reader.result as string);
      reader.readAsDataURL(fileToUse);
    }

    setFileType(fileToUse.type || (gifByName ? "image/gif" : fileToUse.type));
    setResult(null);
  };

  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    if (!f) {
      setFile(null);
      setPreview(null);
      setFileType(null);
      setSourceIsGif(false);
      revokeBlobPreview();
      return;
    }
    applyFile(f);
  };

  const openFilePicker = () => fileInputRef.current?.click();

  const onDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragDepth.current += 1;
    setIsDragging(true);
  };

  const onDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragDepth.current -= 1;
    if (dragDepth.current <= 0) {
      dragDepth.current = 0;
      setIsDragging(false);
    }
  };

  const onDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragDepth.current = 0;
    setIsDragging(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) applyFile(dropped);
  };

  const clear = () => {
    revokeBlobPreview();
    setFile(null);
    setPreview(null);
    setResult(null);
    setFileType(null);
    setSourceIsGif(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const finalizeCutout = async (cutoutDataUrl: string) => {
    let out = cutoutDataUrl;
    const wantsGif =
      sourceIsGif || Boolean(file && preview && shouldTreatAsGif(file, preview));
    if (wantsGif && isRasterCutoutDataUrl(cutoutDataUrl)) {
      try {
        setLoadingLabel("Encoding transparent GIF…");
        // Try encoding, but don't block indefinitely — fall back to PNG after timeout.
        const encodePromise = pngDataUrlToTransparentGifDataUrl(cutoutDataUrl);
        out = await Promise.race([
          encodePromise,
          new Promise<string>((resolve) => setTimeout(() => resolve(cutoutDataUrl), 8000)),
        ]);
        if (out === cutoutDataUrl) {
          toast.info("GIF encoding timed out — showing PNG instead.", { duration: 5000 });
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : "GIF encoding failed";
        console.error("GIF encoding error:", e);
        toast.error(msg);
        toast.info("Showing PNG cutout instead.", { duration: 5000 });
        out = cutoutDataUrl;
      }
    }
    setResult(out);
  };

  // Wrap Edge Function calls with a timeout to avoid hanging the UI if functions stall.
  const invokeWithTimeout = async <T,>(p: Promise<T>, ms = 30000): Promise<T> => {
    return await Promise.race([
      p,
      new Promise<T>((_, reject) => setTimeout(() => reject(new Error("Function timed out")), ms)),
    ]);
  };

  const _envPerframe = (import.meta.env.VITE_PERFRAME_URL as string) || "";
  const [perframeUrl, setPerframeUrl] = useState<string>(() => {
    try {
      const saved = localStorage.getItem("perframe_url");
      return saved || _envPerframe || "";
    } catch {
      return _envPerframe || "";
    }
  });

  const PERFRAME_URL = perframeUrl || _envPerframe || "http://localhost:8000";

  const savePerframeUrl = (u: string) => {
    try {
      if (u) localStorage.setItem("perframe_url", u);
      else localStorage.removeItem("perframe_url");
      setPerframeUrl(u);
      toast.success("Per-frame URL saved locally");
    } catch (e) {
      toast.error("Could not save per-frame URL locally");
    }
  };

  const probeHealth = async (base: string, ms = 2500) => {
    if (!base) return false;
    const url = base.replace(/\/$/, "") + "/health";
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), ms);
      const res = await fetch(url, { method: "GET", signal: controller.signal });
      clearTimeout(id);
      if (!res.ok) return false;
      const j = await res.json().catch(() => ({}));
      return j && j.status === "ok";
    } catch {
      return false;
    }
  };

  const autoDetectPerframe = async () => {
    const candidates = [
      _envPerframe,
      "http://localhost:8000",
      "https://perframe-service.onrender.com",
      "https://perframe-app.fly.dev",
    ].filter(Boolean) as string[];
    setLoading(true);
    setLoadingLabel("Detecting per-frame service…");
    for (const c of candidates) {
      const ok = await probeHealth(c, 2500);
      if (ok) {
        savePerframeUrl(c.replace(/\/$/, ""));
        setLoading(false);
        toast.success(`Per-frame service found: ${c}`);
        return;
      }
    }
    setLoading(false);
    toast.error("Could not detect per-frame service automatically");
  };

  const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

  const callRemove = async () => {
    if (!file || !preview) {
      toast.error("Upload a file first");
      return;
    }
    setLoading(true);
    setResult(null);
    setLoadingLabel(file.type.startsWith("video/") ? "Extracting frame…" : "Removing background…");

    try {
      if (file.type.startsWith("video/")) {
        setLoadingLabel("Extracting frame & removing background…");
        const frame = await videoFrameToJpegDataUrl(file);
        const toSend = await downscaleDataUrl(frame, 1200).catch(() => frame);
        const resp = await invokeWithTimeout(
          invokePublicFunction<{ resultDataUrl?: string; error?: string }>("background-remove", {
            image: toSend,
          }),
          30000,
        );
        if (resp?.resultDataUrl) {
          setResult(resp.resultDataUrl);
          toast.success("Background removed from a video frame");
          toast.info("Uses one sampled frame, not full video matting.", { duration: 6500 });
        } else {
          throw new Error(resp?.error ?? "No result returned from function");
        }
        return;
      }

      // Images + GIFs (including .gif files with missing/wrong MIME)
      if (file.type.startsWith("image/") || shouldTreatAsGif(file, preview)) {
        if (shouldTreatAsGif(file, preview)) {
          if (file.size > LARGE_GIF_BYTES) {
            setLoadingLabel("Shrinking GIF (first frame)…");
            const blobUrl = URL.createObjectURL(file);
            try {
              const jpeg = await rasterToJpegDataUrl(blobUrl);
              const toSend = await downscaleDataUrl(jpeg, 1200).catch(() => jpeg);
              toast.info("Large GIF: using the first frame only so the file fits upload limits.", { duration: 6500 });
              const resp = await invokeWithTimeout(
                invokePublicFunction<{ resultDataUrl?: string; error?: string }>("background-remove", {
                  image: toSend,
                }),
                30000,
              );
              if (resp?.resultDataUrl) {
                await finalizeCutout(resp.resultDataUrl);
                toast.success("Transparent GIF ready");
              } else {
                throw new Error(resp?.error ?? "No result returned from function");
              }
            } finally {
              URL.revokeObjectURL(blobUrl);
            }
            return;
          }

          const buffer = await file.arrayBuffer();
          let binary = "";
          const bytes = new Uint8Array(buffer);
          for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
          const file_b64 = btoa(binary);

          // Prefer local per-frame service for animated GIFs when available.
          try {
            setLoadingLabel("Scheduling per-frame job…");
            const form = new FormData();
            form.append("file", file, file.name);
            form.append("output", "gif");
            form.append("fps", "15");
            form.append("async_job", "1");

            const base = PERFRAME_URL.replace(/\/$/, "");
            const svcResp = await fetch(`${base}/process`, { method: "POST", body: form });
            if (!svcResp.ok) throw new Error(`Per-frame service ${svcResp.status}`);
            const json = await svcResp.json();
            const statusUrl = json.status_url;
            const resultUrl = json.result_url;
            if (!statusUrl || !resultUrl) throw new Error("Invalid per-frame response");

            setLoadingLabel("Processing GIF (this may take a while)…");
            // Poll for job completion (2 minute timeout)
            let meta: any = null;
            const maxPoll = 120;
            for (let i = 0; i < maxPoll; i++) {
              const s = await fetch(statusUrl);
              if (!s.ok) throw new Error("Job status fetch failed");
              meta = await s.json();
              if (meta.status === "done") break;
              if (meta.status === "error") throw new Error(meta.error || "Per-frame job failed");
              await sleep(1000);
            }
            if (!meta || meta.status !== "done") throw new Error("Per-frame job timed out");

            setLoadingLabel("Downloading result…");
            const fileResp = await fetch(resultUrl);
            if (!fileResp.ok) throw new Error("Failed to download result");
            const blob = await fileResp.blob();
            const blobUrl = URL.createObjectURL(blob);
            blobPreviewRef.current = blobUrl;
            setResult(blobUrl);
            toast.success("Transparent GIF ready");
            return;
          } catch (e) {
            // Fall back to previous upload+function path on any error
            console.warn("Per-frame service failed, falling back:", e);
          }

          // Fallback: upload whole GIF and call Edge Function (single-frame or remove.bg)
          const uploadResp = await invokeWithTimeout(
            invokePublicFunction<{ fileUrl?: string }>("background-upload", {
              file_b64,
              filename: file.name,
              content_type: file.type || "image/gif",
            }),
            30000,
          );
          if (!uploadResp?.fileUrl) throw new Error("Upload failed");

          const resp = await invokeWithTimeout(
            invokePublicFunction<{ resultDataUrl?: string; error?: string }>("background-remove", {
              image_url: uploadResp.fileUrl,
            }),
            30000,
          );
          if (resp?.resultDataUrl) {
            await finalizeCutout(resp.resultDataUrl);
            toast.success("Transparent GIF ready");
          } else {
            throw new Error(resp?.error ?? "No result returned from function");
          }
          return;
        }

        const toSend = await downscaleDataUrl(preview, 1200).catch(() => preview);
        const resp = await invokeWithTimeout(
          invokePublicFunction<{ resultDataUrl?: string }>("background-remove", { image: toSend }),
          30000,
        );
        if (resp?.resultDataUrl) {
          await finalizeCutout(resp.resultDataUrl);
          toast.success("Background removed");
        } else {
          throw new Error("No result returned from function");
        }
        return;
      }

      // Fallback
      throw new Error("Unsupported file type");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Background removal failed";
      toast.error(msg);
      if (/row-level security|RLS|policy/i.test(msg)) {
        toast.info("Ask your admin to apply the latest Supabase migration for storage uploads.", { duration: 8000 });
      }
    } finally {
      setLoading(false);
    }
  };

  const downloadResult = async () => {
    if (!result) return;
    try {
      const res = await fetch(result);
      if (!res.ok) throw new Error(`Fetch failed (${res.status})`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const ext = result.startsWith("data:image/gif") ? "gif" : "png";
      a.download = file?.name ? file.name.replace(/\.[^/.]+$/, "") + `-nobg.${ext}` : `image-nobg.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("Download started");
    } catch {
      toast.error("Failed to download image");
    }
  };

  /** PNG or GIF cutout from API / encoder; plain video URLs are rare now */
  const resultShowsCheckerboard = Boolean(
    result?.startsWith("data:image/png") ||
      result?.startsWith("data:image/gif") ||
      result?.startsWith("data:image/webp"),
  );

  return (
    <PageShell>
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-soft" />
        <div className="absolute -top-24 left-1/2 -z-10 h-72 w-[40rem] -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" />
        <div className="container py-16 md:py-24">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-background/70 px-4 py-1.5 text-xs font-medium text-muted-foreground shadow-soft backdrop-blur">
              Image tools
            </span>
            <h1 className="mt-6 text-4xl font-extrabold tracking-tight sm:text-5xl">Background Remover</h1>
            <p className="mx-auto mt-5 max-w-2xl text-base text-muted-foreground sm:text-lg">
              Remove backgrounds from images and download transparent PNGs.
            </p>
          </div>

          <div className="mx-auto mt-8 max-w-5xl">
            <PlatformRouteLinks current="background-remover" compact />
          </div>

          <div className="mx-auto mt-8 max-w-3xl">
            <Card className="overflow-hidden p-4 shadow-elegant">
              <label
                className={cn(
                  "relative block cursor-pointer rounded-xl border-2 border-dashed px-4 py-6 text-center outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:px-6 sm:py-8",
                  isDragging
                    ? "border-primary bg-primary/10 shadow-[0_0_0_1px_hsl(var(--primary)/0.35)]"
                    : "border-border/80 bg-muted/20 hover:border-primary/40 hover:bg-muted/30",
                )}
                tabIndex={0}
                onKeyDown={(e: KeyboardEvent<HTMLLabelElement>) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    openFilePicker();
                  }
                }}
                onDragEnter={onDragEnter}
                onDragLeave={onDragLeave}
                onDragOver={onDragOver}
                onDrop={onDrop}
                aria-label="Drop a file here or click to choose"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  onChange={onFileChange}
                  className="sr-only"
                  aria-label="Upload image or video"
                  id="background-remover-file"
                />
                <div className="pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-b from-background/40 to-transparent" aria-hidden />
                <div className="relative mx-auto flex max-w-md flex-col items-center gap-3">
                  <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-card text-primary shadow-soft">
                    <Upload className="h-6 w-6" aria-hidden />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold tracking-tight sm:text-base">Drop an image here</p>
                    <p className="text-xs text-muted-foreground sm:text-sm">
                      or choose a file — PNG, JPG, GIF, WebP, and video uploads supported.
                    </p>
                  </div>
                  <span
                    className={cn(
                      buttonVariants({ variant: "outline", size: "lg" }),
                      "pointer-events-none border-primary/30 bg-background/80 shadow-soft backdrop-blur",
                    )}
                    aria-hidden
                  >
                    <Upload className="h-4 w-4" />
                    Choose file
                  </span>
                  <p className="max-w-full truncate text-xs text-muted-foreground" title={file?.name}>
                    {file ? (
                      <>
                        <span className="font-medium text-foreground">{file.name}</span>
                        <span className="text-muted-foreground"> · {formatFileSize(file.size)}</span>
                      </>
                    ) : (
                      "No file selected yet"
                    )}
                  </p>
                </div>
              </label>

              {preview ? (
                <>
                  <div className="mt-5 grid gap-4 md:grid-cols-2 md:items-stretch md:gap-5">
                    <div className="flex min-h-0 flex-col">
                      <div className="mb-2 flex items-baseline justify-between gap-2">
                        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Original</h2>
                        <span className="text-[11px] text-muted-foreground">Source preview</span>
                      </div>
                      <div className="relative flex min-h-[200px] flex-1 flex-col rounded-xl border border-border/80 bg-muted/15 p-2.5 sm:min-h-[256px] sm:p-3">
                        <div className="flex flex-1 items-center justify-center overflow-hidden rounded-lg bg-background/40">
                          {fileType && fileType.startsWith("video/") ? (
                            <video src={preview} controls className="max-h-64 w-full rounded-md object-contain shadow-sm" />
                          ) : (
                            <img
                              src={preview}
                              alt="Original upload preview"
                              className="max-h-64 w-full object-contain object-center"
                            />
                          )}
                        </div>

                        {loading && (
                          <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-background/70 backdrop-blur-[2px]">
                            <div className="flex items-center gap-2.5 rounded-lg border border-border bg-background/95 px-4 py-2.5 shadow-elegant">
                              <Loader2 className="h-5 w-5 animate-spin text-primary" />
                              <span className="text-sm font-medium">{loadingLabel}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex min-h-0 flex-col">
                      <div className="mb-2 flex items-baseline justify-between gap-2">
                        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Result</h2>
                        <span className="text-[11px] text-muted-foreground">
                          {sourceIsGif
                            ? "Transparent GIF when ready"
                            : fileType?.startsWith("video/")
                              ? resultShowsCheckerboard
                                ? "Frame cutout (PNG)"
                                : "One frame → cutout"
                              : "Transparent PNG when ready"}
                        </span>
                      </div>
                      <div
                        className={cn(
                          "relative flex min-h-[200px] flex-1 flex-col rounded-xl border border-border/80 p-2.5 sm:min-h-[256px] sm:p-3",
                          result && resultShowsCheckerboard
                            ? "bg-[length:14px_14px] [background-image:linear-gradient(45deg,#88888814_25%,transparent_25%),linear-gradient(-45deg,#88888814_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#88888814_75%),linear-gradient(-45deg,transparent_75%,#88888814_75%)] [background-position:0_0,0_7px,7px_-7px,-7px_0]"
                            : "bg-muted/15",
                        )}
                      >
                        <div
                          className={cn(
                            "flex flex-1 items-center justify-center overflow-hidden rounded-lg",
                            result && resultShowsCheckerboard ? "bg-transparent" : "bg-background/40",
                          )}
                        >
                          {result ? (
                            resultShowsCheckerboard ? (
                              <img
                                src={result}
                                alt="Background removed"
                                className="max-h-64 w-full object-contain object-center drop-shadow-md"
                              />
                            ) : (
                              <video src={result} controls className="max-h-64 w-full rounded-md object-contain shadow-sm" />
                            )
                          ) : (
                            <div className="flex flex-col items-center justify-center px-4 py-6 text-center text-muted-foreground">
                              <div className="mb-2 inline-flex rounded-full bg-muted/80 p-3">
                                <ImageIcon className="h-7 w-7 opacity-80" />
                              </div>
                              <p className="text-sm font-medium text-foreground/90">No result yet</p>
                              <p className="mt-1 max-w-[240px] text-xs leading-relaxed">
                                {fileType?.startsWith("video/")
                                  ? "Click Remove background to cut out one frame from your video."
                                  : "Run remove background to see your cutout beside the original."}
                              </p>
                            </div>
                          )}
                        </div>

                        {result && fileType?.startsWith("video/") && !resultShowsCheckerboard && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            <a href={result} target="_blank" rel="noreferrer" className="inline-block">
                              <Button size="sm" className="bg-gradient-hero">
                                <Download className="h-4 w-4" />
                                Open / Download
                              </Button>
                            </a>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                try {
                                  navigator.clipboard.writeText(result);
                                  toast.success("Copied URL");
                                } catch {
                                  toast.error("Could not copy");
                                }
                              }}
                            >
                              Copy URL
                            </Button>
                          </div>
                        )}

                        {result && resultShowsCheckerboard && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            <Button onClick={downloadResult} size="sm" className="bg-gradient-hero">
                              <Download className="h-4 w-4" />
                              {result.startsWith("data:image/gif") ? "Download GIF" : "Download PNG"}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                try {
                                  navigator.clipboard.writeText(result);
                                  toast.success("Copied data URL");
                                } catch {
                                  toast.error("Could not copy");
                                }
                              }}
                            >
                              Copy URL
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-col items-stretch gap-3 border-t border-border/60 pt-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="mb-2 w-full sm:w-[50%]">
                      <label className="text-xs font-medium text-muted-foreground">Per-frame service URL (optional)</label>
                      <div className="mt-1 flex gap-2">
                        <input
                          type="text"
                          value={perframeUrl}
                          onChange={(e) => setPerframeUrl(e.target.value)}
                          placeholder={_envPerframe || "http://localhost:8000"}
                          className="flex-1 rounded-md border border-border px-3 py-1 text-sm bg-background"
                        />
                        <Button size="sm" onClick={() => autoDetectPerframe()} disabled={loading}>
                          Detect
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => savePerframeUrl(perframeUrl)}>
                          Save
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => { savePerframeUrl(""); setPerframeUrl(""); }}>
                          Reset
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Set your per-frame backend URL here so GIFs are preserved. If empty, the app will try localhost or fall back to remove.bg.</p>
                    </div>
                    <p className="text-center text-xs text-muted-foreground sm:text-left">
                      Images are processed securely. Clear resets this session.
                    </p>
                    <div className="flex flex-wrap justify-center gap-2 sm:justify-end">
                      <Button onClick={clear} variant="ghost" disabled={loading || !preview} className="min-w-[100px]">
                        <Trash2 className="h-4 w-4" />
                        Clear
                      </Button>
                      <Button onClick={callRemove} disabled={loading || !preview} className="min-w-[180px] bg-gradient-hero shadow-soft">
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
                        Remove background
                      </Button>
                    </div>
                  </div>
                </>
              ) : null}
            </Card>
          </div>
        </div>
      </section>
    </PageShell>
  );
};

export default BackgroundRemover;
