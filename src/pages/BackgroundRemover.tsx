import { useState } from "react";
import { Image as ImageIcon, Loader2, Download, Trash2 } from "lucide-react";
import { PageShell } from "@/components/site/PageShell";
import { PlatformRouteLinks } from "@/components/site/PlatformRouteLinks";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { invokePublicFunction } from "@/lib/public-functions";

const BackgroundRemover = () => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [fileType, setFileType] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    if (!f) {
      setFile(null);
      setPreview(null);
      setFileType(null);
      return;
    }
    if (!f.type.startsWith("image/")) {
      // allow videos too
      if (!f.type.startsWith("video/")) {
        toast.error("Please select an image or video file");
        return;
      }
    }
    setFile(f);
    // preview images and GIFs via dataURL, videos via object URL
    if (f.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = () => setPreview(reader.result as string);
      reader.readAsDataURL(f);
    } else {
      // video preview
      setPreview(URL.createObjectURL(f));
    }
    setFileType(f.type);
    setResult(null);
  };

  const clear = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
  };

  const callRemove = async () => {
    if (!file || !preview) {
      toast.error("Upload a file first");
      return;
    }
    setLoading(true);
    setResult(null);

    try {
      // Image flows (including GIFs) — downscale and call image function
      if (file.type.startsWith("image/")) {
        // Special-case animated GIFs: upload original gif and let the server call remove.bg with image_url
        if (file.type === "image/gif") {
          const buffer = await file.arrayBuffer();
          let binary = "";
          const bytes = new Uint8Array(buffer);
          for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
          const file_b64 = btoa(binary);

          const uploadResp = await invokePublicFunction<{ fileUrl?: string }>("background-upload", {
            file_b64,
            filename: file.name,
            content_type: file.type,
          });
          if (!uploadResp?.fileUrl) throw new Error("Upload failed");

          const resp = await invokePublicFunction<{ resultDataUrl?: string }>("background-remove", { image_url: uploadResp.fileUrl });
          if (resp?.resultDataUrl) {
            setResult(resp.resultDataUrl);
            toast.success("Background removed");
          } else {
            throw new Error(resp?.error ?? "No result returned from function");
          }
          return;
        }

        const toSend = await downscaleDataUrl(preview, 1200).catch(() => preview);
        const resp = await invokePublicFunction<{ resultDataUrl?: string }>("background-remove", { image: toSend });
        if (resp?.resultDataUrl) {
          setResult(resp.resultDataUrl);
          toast.success("Background removed");
        } else {
          throw new Error("No result returned from function");
        }
        return;
      }

      // Video flow: upload file to storage via background-upload function, then attempt processing for GIFs
      if (file.type.startsWith("video/")) {
        // read file as arrayBuffer -> base64
        const buffer = await file.arrayBuffer();
        let binary = "";
        const bytes = new Uint8Array(buffer);
        for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
        const file_b64 = btoa(binary);

        const uploadResp = await invokePublicFunction<{ fileUrl?: string }>("background-upload", {
          file_b64,
          filename: file.name,
          content_type: file.type,
        });
        if (!uploadResp?.fileUrl) throw new Error("Upload failed");
        // For videos we currently only store and return URL — video background removal is not implemented server-side yet.
        toast.success("Video uploaded — processing not supported yet");
        setResult(uploadResp.fileUrl);
        return;
      }

      // Fallback
      throw new Error("Unsupported file type");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Background removal failed";
      toast.error(msg);
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
      a.download = file?.name ? file.name.replace(/\.[^/.]+$/, "") + "-nobg.png" : "image-nobg.png";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("Download started");
    } catch {
      toast.error("Failed to download image");
    }
  };

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
            <Card className="p-4 shadow-elegant">
              <div className="flex items-center justify-between gap-4">
                <Input type="file" accept="image/*,video/*" onChange={onFileChange} className="h-12 text-base" aria-label="Upload image or video" />
                <div className="text-sm text-muted-foreground">{file?.name ?? "No file selected"}</div>
              </div>

              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <div className="relative">
                  {preview ? (
                    fileType && fileType.startsWith("video/") ? (
                      <video src={preview} controls className="rounded-md border border-border max-h-64 w-full object-contain" />
                    ) : (
                      <img src={preview} alt="preview" className="rounded-md border border-border max-h-64 w-full object-contain" />
                    )
                  ) : (
                    <div className="rounded-md border border-border bg-background/60 p-6 text-center text-muted-foreground">
                      <div className="mx-auto mb-2 inline-flex items-center justify-center rounded-full bg-muted p-3">
                        <ImageIcon className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <div className="text-sm font-medium">No image selected</div>
                      <div className="mt-1 text-xs text-muted-foreground">Choose an image to remove its background.</div>
                    </div>
                  )}

                  {loading && (
                    <div className="absolute inset-0 flex items-center justify-center rounded-md bg-black/30">
                      <div className="flex items-center gap-2 rounded-md bg-background/80 px-3 py-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-sm">Processing image…</span>
                      </div>
                    </div>
                  )}

                  <div className="mt-3 flex gap-2">
                    <Button onClick={clear} variant="ghost" disabled={loading || !preview}>
                      <Trash2 className="h-4 w-4" />
                      Clear
                    </Button>
                    <Button onClick={callRemove} disabled={loading || !preview} className="bg-gradient-hero">
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
                      Remove Background
                    </Button>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-medium text-muted-foreground">Result</p>
                  {result ? (
                    <>
                      {fileType && fileType.startsWith("video/") ? (
                        <>
                          <video src={result} controls className="rounded-md border border-border max-h-64 w-full object-contain" />
                          <div className="mt-3 flex gap-2">
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
                        </>
                      ) : (
                        <>
                          <img src={result} alt="result" className="rounded-md border border-border max-h-64 w-full object-contain" />
                          <div className="mt-3 flex gap-2">
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
                        </>
                      )}
                    </>
                  ) : (
                    <div className="rounded-md border border-border bg-background/60 p-6 text-center text-muted-foreground">
                      <div className="mx-auto mb-2 inline-flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                        <ImageIcon className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="text-sm font-medium">No result yet</div>
                      <div className="mt-1 text-xs text-muted-foreground">Upload an image and click "Remove Background" to see the result.</div>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>
    </PageShell>
  );
};

export default BackgroundRemover;
