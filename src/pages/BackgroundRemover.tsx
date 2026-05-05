import { useState, useRef, type ChangeEvent, type DragEvent, type KeyboardEvent } from "react";
import { Image as ImageIcon, Loader2, Download, Trash2, Upload } from "lucide-react";
import { PageShell } from "@/components/site/PageShell";
import { PlatformRouteLinks } from "@/components/site/PlatformRouteLinks";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
// GIF and video background removal disabled — keep only standard image flow.
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
    const gifByName = /\.gif$/i.test(f.name) || f.type === "image/gif";
    const hasKnownImageExt = /\.(png|jpe?g|webp|bmp|tiff)$/i.test(f.name);

    if (isVideo) {
      toast.error("Video files are not supported");
      return;
    }

    if (gifByName) {
      toast.error("Animated GIFs are not supported");
      return;
    }

    if (!isImageMime && !hasKnownImageExt) {
      toast.error("Please select an image file (PNG/JPG/WebP/BMP/TIFF)");
      return;
    }

    setFile(f);
    revokeBlobPreview();
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(f);

    setFileType(f.type || "image/png");
    setResult(null);
  };

  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    if (!f) {
      setFile(null);
      setPreview(null);
      setFileType(null);
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
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const finalizeCutout = async (cutoutDataUrl: string) => {
    // GIFs and video frames disabled — always show PNG/WebP cutout returned by the API.
    setResult(cutoutDataUrl);
  };

  // Wrap Edge Function calls with a timeout to avoid hanging the UI if functions stall.
  const invokeWithTimeout = async <T,>(p: Promise<T>, ms = 30000): Promise<T> => {
    return await Promise.race([
      p,
      new Promise<T>((_, reject) => setTimeout(() => reject(new Error("Function timed out")), ms)),
    ]);
  };

  // Per-frame and GIF/video handling removed. No auto-detection or extra hosts.

  const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

  const callRemove = async () => {
    if (!file || !preview) {
      toast.error("Upload a file first");
      return;
    }
    setLoading(true);
    setResult(null);
    setLoadingLabel("Removing background…");

    try {
      const toSend = await downscaleDataUrl(preview, 1200).catch(() => preview);
      const resp = await invokeWithTimeout(
        invokePublicFunction<{ resultDataUrl?: string; error?: string }>("background-remove", { image: toSend }),
        30000,
      );
      if (resp?.resultDataUrl) {
        await finalizeCutout(resp.resultDataUrl);
        toast.success("Background removed");
      } else {
        throw new Error(resp?.error ?? "No result returned from function");
      }
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
                  accept="image/*"
                  onChange={onFileChange}
                  className="sr-only"
                  aria-label="Upload image"
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
                        or choose a file — PNG, JPG, and WebP uploads supported.
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
                          <img
                            src={preview}
                            alt="Original upload preview"
                            className="max-h-64 w-full object-contain object-center"
                          />
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
                        <span className="text-[11px] text-muted-foreground">Transparent PNG when ready</span>
                      </div>
                      <div
                        className={cn(
                          "relative flex min-h-[200px] flex-1 flex-col rounded-xl border border-border/80 p-2.5 sm:min-h-[256px] sm:p-3",
                          result ? "bg-[length:14px_14px] [background-image:linear-gradient(45deg,#88888814_25%,transparent_25%),linear-gradient(-45deg,#88888814_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#88888814_75%),linear-gradient(-45deg,transparent_75%,#88888814_75%)] [background-position:0_0,0_7px,7px_-7px,-7px_0]" : "bg-muted/15",
                        )}
                      >
                        <div className={cn("flex flex-1 items-center justify-center overflow-hidden rounded-lg", result ? "bg-transparent" : "bg-background/40")}>
                          {result ? (
                            <img src={result} alt="Background removed" className="max-h-64 w-full object-contain object-center drop-shadow-md" />
                          ) : (
                            <div className="flex flex-col items-center justify-center px-4 py-6 text-center text-muted-foreground">
                              <div className="mb-2 inline-flex rounded-full bg-muted/80 p-3">
                                <ImageIcon className="h-7 w-7 opacity-80" />
                              </div>
                              <p className="text-sm font-medium text-foreground/90">No result yet</p>
                              <p className="mt-1 max-w-[240px] text-xs leading-relaxed">Run remove background to see your cutout beside the original.</p>
                            </div>
                          )}
                        </div>

                        {result && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            <Button onClick={downloadResult} size="sm" className="bg-gradient-hero">
                              <Download className="h-4 w-4" />
                              Download
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
