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
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    if (!f) {
      setFile(null);
      setPreview(null);
      return;
    }
    if (!f.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    setFile(f);
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(f);
    setResult(null);
  };

  const clear = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
  };

  const callRemove = async () => {
    if (!preview) {
      toast.error("Upload an image first");
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const resp = await invokePublicFunction<{ resultDataUrl?: string }>("background-remove", { image: preview });
      if (resp?.resultDataUrl) {
        setResult(resp.resultDataUrl);
        toast.success("Background removed");
      } else {
        throw new Error("No result returned from function");
      }
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
              <Input type="file" accept="image/*" onChange={onFileChange} className="h-12 text-base" />

              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <div>
                  {preview ? (
                    <img src={preview} alt="preview" className="rounded-md border border-border max-h-64 w-full object-contain" />
                  ) : (
                    <div className="rounded-md border border-border bg-background/60 p-6 text-center text-muted-foreground">No image chosen.</div>
                  )}

                  <div className="mt-3 flex gap-2">
                    <Button onClick={clear} variant="ghost">
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
                  ) : (
                    <div className="rounded-md border border-border bg-background/60 p-6 text-center text-muted-foreground">No result yet.</div>
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
