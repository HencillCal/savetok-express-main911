import { useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Check,
  Download,
  FileArchive,
  Image as ImageIcon,
  Loader2,
  Video,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { buildHistoryEntry } from "@/lib/history";
import { downloadFileVia, downloadMixedZip, downloadProxyOptionsFromMedia, triggerDownloadVia } from "@/lib/download";
import { applyPattern, DEFAULT_PATTERN } from "@/lib/filename-pattern";
import type { MediaDownload, MediaItem, MediaResult, PlatformKey } from "@/lib/media";
import { invokePublicFunction } from "@/lib/public-functions";
import { useDownloadHistory } from "@/hooks/use-download-history";
import { PlatformRouteLinks } from "@/components/site/PlatformRouteLinks";
import { resolveInputUrl } from "@/lib/url-resolution";

type QueueStatus = "queued" | "downloading" | "done" | "error";
type QueueItem = { filename: string; status: QueueStatus; error?: string };

export type DownloaderMode = {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
  placeholder: string;
  expectedHint: string;
  matches: (value: string) => boolean;
};

type MediaDownloaderPageProps = {
  platform: PlatformKey;
  functionName: string;
  badge: string;
  title: string;
  description: string;
  modes: DownloaderMode[];
  defaultMode?: string;
};

const isTinyUrlInput = (value: string) => /https?:\/\/(?:www\.)?(tinyurl\.com|tiny\.one)\//i.test(value);

const readInvokeErrorMessage = async (error: unknown, fallback: string) => {
  if (error && typeof error === "object" && "context" in error) {
    const context = (error as { context?: unknown }).context;
    if (context instanceof Response) {
      try {
        const payload = await context.clone().json() as { error?: string };
        if (payload?.error) return payload.error;
      } catch {
        try {
          const text = await context.clone().text();
          if (text) return text;
        } catch {
          // Ignore response parsing issues and fall back to the error message.
        }
      }
    }
  }

  return error instanceof Error ? error.message : fallback;
};

export const MediaDownloaderPage = ({
  platform,
  functionName,
  badge,
  title,
  description,
  modes,
  defaultMode,
}: MediaDownloaderPageProps) => {
  const [url, setUrl] = useState("");
  const [mode, setMode] = useState(defaultMode ?? modes[0]?.id ?? "");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MediaResult | null>(null);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [queueRunning, setQueueRunning] = useState(false);
  const [zipRunning, setZipRunning] = useState(false);
  const [pattern, setPattern] = useState<string>(DEFAULT_PATTERN);
  const { add } = useDownloadHistory();

  const activeMode = modes.find((item) => item.id === mode) ?? modes[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) {
      toast.error(`Paste a ${badge.toLowerCase()} URL`);
      return;
    }

    if (!isTinyUrlInput(trimmed) && !activeMode.matches(trimmed)) {
      const matchedMode = modes.find((item) => item.matches(trimmed));
      if (matchedMode && matchedMode.id !== activeMode.id) {
        toast.error(`That link looks like ${matchedMode.label}. Switch the mode or paste a ${activeMode.label} URL.`);
      } else {
        toast.error(`Expected a URL matching ${activeMode.expectedHint}`);
      }
      return;
    }

    setLoading(true);
    setResult(null);
    setQueue([]);

    try {
      const resolvedInput = await resolveInputUrl(trimmed);
      const payload = await invokePublicFunction<MediaResult>(functionName, {
        url: resolvedInput.url,
        mode,
      });
      if (!payload.items?.length) throw new Error("No downloadable media found");
      setResult(payload);
      add(buildHistoryEntry(resolvedInput.url, payload));
      toast.success(resolvedInput.resolved ? `TinyURL resolved and ${badge.toLowerCase()} media is ready` : `${badge} media ready to download`);
    } catch (err) {
      const msg = await readInvokeErrorMessage(err, `Failed to fetch ${badge} media`);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const buildFilename = (item: MediaItem, download: MediaDownload, itemIndex: number) =>
    applyPattern(pattern || DEFAULT_PATTERN, {
      username: result?.username ?? result?.authorName ?? platform,
      type: item.type,
      index: itemIndex + 1,
      total: result?.items.length,
      original: download.filename,
    });

  const primaryDownloads = useMemo(
    () =>
      (result?.items ?? [])
        .map((item, index) => {
          const primary = item.downloads[0];
          if (!primary) return null;
          return {
            download: primary,
            item,
            filename: buildFilename(item, primary, index),
          };
        })
        .filter((entry): entry is { download: MediaDownload; item: MediaItem; filename: string } => Boolean(entry)),
    [result, pattern],
  );

  const supportsBatchPrimaryDownloads = useMemo(
    () => primaryDownloads.every((entry) => !entry.download.mergeAudioUrl),
    [primaryDownloads],
  );

  const handleDownloadAll = async () => {
    if (queueRunning || !primaryDownloads.length || !supportsBatchPrimaryDownloads) return;
    setQueue(primaryDownloads.map((entry) => ({ filename: entry.filename, status: "queued" })));
    setQueueRunning(true);

    let completed = 0;
    for (let index = 0; index < primaryDownloads.length; index += 1) {
      const entry = primaryDownloads[index];
      setQueue((prev) => prev.map((item, queueIndex) => (queueIndex === index ? { ...item, status: "downloading" } : item)));
      try {
        await downloadFileVia(
          entry.download.functionName,
          entry.download.url,
          entry.filename,
          downloadProxyOptionsFromMedia(entry.download),
        );
        completed += 1;
        setQueue((prev) => prev.map((item, queueIndex) => (queueIndex === index ? { ...item, status: "done" } : item)));
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Download failed";
        setQueue((prev) => prev.map((item, queueIndex) => (queueIndex === index ? { ...item, status: "error", error: msg } : item)));
      }
    }

    setQueueRunning(false);
    if (completed === primaryDownloads.length) toast.success(`Downloaded ${completed} file${completed === 1 ? "" : "s"}`);
    else toast.warning(`Downloaded ${completed} of ${primaryDownloads.length}. Some files failed.`);
  };

  const handleDownloadZip = async () => {
    if (zipRunning || queueRunning || !primaryDownloads.length || !supportsBatchPrimaryDownloads) return;
    const functionNameForZip = primaryDownloads[0]?.download.functionName;
    if (!functionNameForZip || !primaryDownloads.every((entry) => entry.download.functionName === functionNameForZip)) {
      toast.error("ZIP packaging is only available when all files use the same download function.");
      return;
    }

    setQueue(primaryDownloads.map((entry) => ({ filename: entry.filename, status: "queued" })));
    setZipRunning(true);
    try {
      await downloadMixedZip(
        primaryDownloads.map((entry) => ({
          url: entry.download.url,
          filename: entry.filename,
          ...downloadProxyOptionsFromMedia(entry.download),
        })),
        `${result?.username ?? result?.authorName ?? platform}-${result?.sourceType ?? "media"}`,
        functionNameForZip,
        (done, _total, current) => {
          setQueue((prev) =>
            prev.map((item) => {
              if (item.filename === current) {
                return { ...item, status: done === 0 ? "downloading" : "done" };
              }
              return item;
            }),
          );
        },
      );
      setQueue((prev) => prev.map((item) => ({ ...item, status: "done" })));
    } catch {
      setQueue((prev) => prev.map((item) => (item.status === "done" ? item : { ...item, status: "error" })));
    } finally {
      setZipRunning(false);
    }
  };

  const totalQueue = queue.length;
  const finishedCount = queue.filter((item) => item.status === "done" || item.status === "error").length;
  const progressPct = totalQueue ? Math.round((finishedCount / totalQueue) * 100) : 0;
  const currentDownloading = queue.find((item) => item.status === "downloading");
  const busy = queueRunning || zipRunning;

  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-gradient-soft" />
      <div className="absolute -top-24 left-1/2 -z-10 h-72 w-[40rem] -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" />

      <div className="container py-16 md:py-24">
        <div className="mx-auto max-w-5xl">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-background/70 px-4 py-1.5 text-xs font-medium text-muted-foreground shadow-soft backdrop-blur">
              {badge}
            </span>
            <h1 className="mt-6 text-4xl font-extrabold tracking-tight sm:text-5xl">{title}</h1>
            <p className="mx-auto mt-5 max-w-2xl text-base text-muted-foreground sm:text-lg">{description}</p>
          </div>

          <div className="mx-auto mt-8 max-w-5xl">
            <PlatformRouteLinks current={platform} compact />
          </div>

          <div className="mt-8 grid gap-2 sm:grid-cols-2 xl:grid-cols-4" role="tablist" aria-label={`${badge} download modes`}>
            {modes.map((item) => {
              const Icon = item.icon;
              const active = item.id === activeMode.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => {
                    setMode(item.id);
                    setResult(null);
                    setQueue([]);
                  }}
                  className={`flex min-h-[104px] flex-col items-start gap-1 rounded-xl border p-3 text-left transition ${
                    active
                      ? "border-primary bg-primary/10 shadow-soft"
                      : "border-border bg-background/70 hover:border-primary/40"
                  }`}
                >
                  <Icon className={`h-4 w-4 ${active ? "text-primary" : "text-muted-foreground"}`} />
                  <span className="text-sm font-semibold">{item.label}</span>
                  <span className="text-xs text-muted-foreground">{item.description}</span>
                </button>
              );
            })}
          </div>

          <form onSubmit={handleSubmit} className="mt-4">
            <Card className="flex flex-col gap-3 p-3 shadow-elegant sm:flex-row sm:items-center">
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder={activeMode.placeholder}
                className="h-12 border-0 bg-transparent text-base shadow-none focus-visible:ring-0"
                disabled={loading}
              />
              <Button type="submit" size="lg" disabled={loading} className="h-12 bg-gradient-hero px-8 text-base font-semibold shadow-elegant">
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Fetching...
                  </>
                ) : (
                  <>
                    <Download className="h-5 w-5" />
                    Get {activeMode.label.toLowerCase()}
                  </>
                )}
              </Button>
            </Card>
            <p className="mt-2 text-xs text-muted-foreground">
              Expecting a URL matching <code className="rounded bg-muted px-1 py-0.5">{activeMode.expectedHint}</code>
            </p>
          </form>

          {loading && (
            <Card className="mx-auto mt-10 max-w-4xl p-6 shadow-elegant" aria-busy="true" aria-live="polite">
              <div className="grid gap-6 md:grid-cols-[220px_1fr]">
                <Skeleton className="aspect-square w-full rounded-lg" />
                <div className="space-y-4">
                  <Skeleton className="h-5 w-28" />
                  <Skeleton className="h-8 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <div className="grid grid-cols-2 gap-3">
                    <Skeleton className="h-28 w-full rounded-lg" />
                    <Skeleton className="h-28 w-full rounded-lg" />
                  </div>
                  <Skeleton className="h-11 w-full" />
                </div>
              </div>
            </Card>
          )}

          {result && !loading && (
            <Card className="mx-auto mt-6 max-w-4xl overflow-hidden p-4 shadow-elegant">
              <div className="flex items-center gap-3">
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-md border border-border bg-secondary/40">
                  {(result.cover || result.items[0]?.thumbnail) ? (
                    <img
                      src={result.cover ?? result.items[0]?.thumbnail ?? ""}
                      alt={result.title ?? badge}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                      <ImageIcon className="h-5 w-5" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span className="rounded-full border border-border bg-background px-2 py-0.5">{result.sourceType}</span>
                    {result.resolvedUrl && result.resolvedUrl !== url.trim() && (
                      <span className="rounded-full border border-border bg-background px-2 py-0.5">Resolved via TinyURL</span>
                    )}
                    <span>{result.items.length} item{result.items.length === 1 ? "" : "s"}</span>
                  </div>
                  {(result.username || result.authorName) && (
                    <p className="mt-1 truncate text-sm font-semibold">
                      {result.username ? `@${result.username}` : result.authorName}
                    </p>
                  )}
                  {result.title && (
                    <p className="mt-0.5 line-clamp-1 text-sm">{result.title}</p>
                  )}
                  {result.caption && (
                    <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{result.caption}</p>
                  )}
                </div>
              </div>

              <div className="mt-4 rounded-md border border-border bg-background/60 p-3">
                <label className="block text-xs font-medium text-muted-foreground" htmlFor={`${platform}-pattern`}>
                  Filename pattern
                </label>
                <Input
                  id={`${platform}-pattern`}
                  value={pattern}
                  onChange={(e) => setPattern(e.target.value)}
                  placeholder={DEFAULT_PATTERN}
                  disabled={busy}
                  className="mt-1 h-9 text-xs"
                />
                <p className="mt-1 text-[10px] text-muted-foreground">
                  Tokens: <code>{"{username}"}</code> <code>{"{type}"}</code> <code>{"{index}"}</code> <code>{"{index2}"}</code> <code>{"{ext}"}</code> <code>{"{original}"}</code>
                </p>
                {result.items[0]?.downloads[0] && (
                  <p className="mt-1 truncate text-[10px] text-muted-foreground">
                    Preview: <span className="font-mono text-foreground">{buildFilename(result.items[0], result.items[0].downloads[0], 0)}</span>
                  </p>
                )}
              </div>

              <ul className="mt-3 divide-y divide-border rounded-md border border-border">
                {result.items.map((item, itemIndex) => {
                  const queueStatus = queue[itemIndex]?.status;
                  const primaryDownload = item.downloads[0];
                  return (
                    <li key={item.id} className="px-3 py-3">
                      <div className="flex items-start gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
                          {item.type === "video" ? <Video className="h-4 w-4" /> : <ImageIcon className="h-4 w-4" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-sm font-medium">{item.title}</p>
                            {queueStatus === "downloading" && <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />}
                            {queueStatus === "done" && <Check className="h-3.5 w-3.5 text-primary" />}
                            {queueStatus === "error" && <X className="h-3.5 w-3.5 text-destructive" />}
                          </div>
                          {item.description && (
                            <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{item.description}</p>
                          )}
                          {primaryDownload && (
                            <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                              Primary file: {buildFilename(item, primaryDownload, itemIndex)}
                            </p>
                          )}
                          <div className="mt-2 flex flex-wrap gap-2">
                            {item.downloads.map((download, downloadIndex) => (
                              <Button
                                key={`${item.id}-${downloadIndex}`}
                                size="sm"
                                variant={downloadIndex === 0 ? "default" : "outline"}
                                className={downloadIndex === 0 ? "bg-gradient-hero" : undefined}
                                disabled={busy}
                                onClick={() =>
                                  void triggerDownloadVia(
                                    download.functionName,
                                    download.url,
                                    buildFilename(item, download, itemIndex),
                                    downloadProxyOptionsFromMedia(download),
                                  )}
                              >
                                <Download className="h-3.5 w-3.5" />
                                {download.label}
                              </Button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>

              {totalQueue > 0 && (
                <div className="mt-3 space-y-1.5" aria-live="polite">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      {busy
                        ? zipRunning
                          ? `Zipping ${currentDownloading?.filename ?? "files"}`
                          : `Downloading ${currentDownloading?.filename ?? "files"}`
                        : finishedCount === totalQueue
                          ? "All downloads finished"
                          : "Paused"}
                    </span>
                    <span>{finishedCount}/{totalQueue}</span>
                  </div>
                  <Progress value={progressPct} className="h-2" />
                </div>
              )}

              {primaryDownloads.length > 1 && supportsBatchPrimaryDownloads && (
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <Button onClick={handleDownloadAll} size="sm" disabled={busy} className="bg-gradient-hero">
                    {queueRunning ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /> Downloading...</>
                    ) : (
                      <><Download className="h-4 w-4" /> Download all</>
                    )}
                  </Button>
                  <Button onClick={handleDownloadZip} size="sm" variant="outline" disabled={busy}>
                    {zipRunning ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /> Zipping...</>
                    ) : (
                      <><FileArchive className="h-4 w-4" /> Download all as ZIP</>
                    )}
                  </Button>
                </div>
              )}
            </Card>
          )}
        </div>
      </div>
    </section>
  );
};
