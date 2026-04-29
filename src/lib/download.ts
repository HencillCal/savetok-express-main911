import JSZip from "jszip";
import { toast } from "sonner";
import type { MediaDownload, MergeStrategy } from "@/lib/media";
import { publicFunctionBase } from "@/lib/public-functions";

const functionBase = (functionName: string) => `${publicFunctionBase(functionName)}/functions/v1/${functionName}`;
const RETRYABLE_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504]);
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type DownloadProxyOptions = {
  mergeStrategy?: MergeStrategy | null;
  mergeAudioUrl?: string | null;
};

export const proxyUrl = (
  fileUrl: string,
  filename: string,
  functionName = "tiktok-download",
  options?: DownloadProxyOptions,
) => {
  const params = new URLSearchParams({
    file: fileUrl,
    filename,
  });

  if (options?.mergeStrategy === "mux-mp4" && options.mergeAudioUrl) {
    params.set("merge", options.mergeStrategy);
    params.set("audio", options.mergeAudioUrl);
  }

  return `${functionBase(functionName)}?${params.toString()}`;
};

const fetchWithRetry = async (url: string, init?: RequestInit, attempts = 3) => {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const res = await fetch(url, init);
      if (!RETRYABLE_STATUSES.has(res.status) || attempt === attempts - 1) {
        return res;
      }
      await res.body?.cancel().catch(() => undefined);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Download request failed");
      if (attempt === attempts - 1) break;
    }

    await sleep(400 * (attempt + 1));
  }

  throw lastError ?? new Error("Download request failed");
};

const clickDownloadLink = (href: string, filename: string) => {
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};

const readDownloadError = async (res: Response) => {
  try {
    const payload = await res.clone().json() as { error?: string };
    if (payload?.error) return payload.error;
  } catch {
    // Ignore JSON parsing errors and fall back to status text.
  }

  return `Download failed (${res.status})`;
};

const ensureDownloadReady = async (
  functionName: string,
  fileUrl: string,
  filename: string,
  options?: DownloadProxyOptions,
) => {
  const proxied = proxyUrl(fileUrl, filename, functionName, options);
  const res = await fetchWithRetry(proxied, {
    method: options?.mergeAudioUrl ? "HEAD" : "GET",
    headers: {
      Accept: "*/*",
    },
  });
  if (!res.ok) throw new Error(await readDownloadError(res));
  await res.body?.cancel().catch(() => undefined);
  return proxied;
};

export const downloadFileVia = async (
  functionName: string,
  fileUrl: string,
  filename: string,
  options?: DownloadProxyOptions,
) => {
  const proxied = proxyUrl(fileUrl, filename, functionName, options);
  const res = await fetchWithRetry(proxied, {
    headers: {
      Accept: "*/*",
    },
  });
  if (!res.ok) throw new Error(await readDownloadError(res));
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  clickDownloadLink(objectUrl, filename);
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
};

export const triggerDownloadVia = async (
  functionName: string,
  fileUrl: string,
  filename: string,
  options?: DownloadProxyOptions,
) => {
  try {
    toast.loading(options?.mergeAudioUrl ? "Preparing merged MP4..." : "Downloading...", { id: filename });
    const proxied = await ensureDownloadReady(functionName, fileUrl, filename, options);
    clickDownloadLink(proxied, filename);
    toast.success(options?.mergeAudioUrl ? "Merged download started" : "Download started", { id: filename });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Download failed";
    toast.error(msg, { id: filename });
  }
};

export const triggerDownload = async (fileUrl: string, filename: string) =>
  triggerDownloadVia("tiktok-download", fileUrl, filename);

export const downloadSlideshowZip = async (images: string[], baseName: string) => {
  const id = `zip-${baseName}`;
  try {
    toast.loading(`Packaging ${images.length} images...`, { id });
    const zip = new JSZip();
    const folder = zip.folder(baseName) ?? zip;
    await Promise.all(
      images.map(async (imgUrl, idx) => {
        const res = await fetchWithRetry(proxyUrl(imgUrl, `${idx + 1}.jpg`), {
          headers: {
            Accept: "*/*",
          },
        });
        if (!res.ok) throw new Error(await readDownloadError(res));
        const blob = await res.blob();
        folder.file(`${String(idx + 1).padStart(2, "0")}.jpg`, blob);
      }),
    );
    const zipBlob = await zip.generateAsync({ type: "blob" });
    const objectUrl = URL.createObjectURL(zipBlob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = `${baseName}-images.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    toast.success("ZIP ready", { id });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "ZIP failed";
    toast.error(msg, { id });
  }
};

export type ZipItem = {
  url: string;
  filename: string;
  mergeStrategy?: MergeStrategy | null;
  mergeAudioUrl?: string | null;
};

export const downloadMixedZip = async (
  items: ZipItem[],
  baseName: string,
  functionName = "tiktok-download",
  onProgress?: (done: number, total: number, current: string) => void,
) => {
  const id = `zip-${baseName}`;
  try {
    toast.loading(`Packaging ${items.length} files...`, { id });
    const zip = new JSZip();
    const folder = zip.folder(baseName) ?? zip;
    let done = 0;
    // Sequential to surface progress and avoid hammering the proxy.
    for (const item of items) {
      onProgress?.(done, items.length, item.filename);
      const res = await fetchWithRetry(proxyUrl(item.url, item.filename, functionName, item), {
        headers: {
          Accept: "*/*",
        },
      });
      if (!res.ok) throw new Error(await readDownloadError(res));
      const blob = await res.blob();
      folder.file(item.filename, blob);
      done += 1;
      onProgress?.(done, items.length, item.filename);
    }
    const zipBlob = await zip.generateAsync({ type: "blob" });
    const objectUrl = URL.createObjectURL(zipBlob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = `${baseName}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    toast.success("ZIP ready", { id });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "ZIP failed";
    toast.error(msg, { id });
    throw err;
  }
};

export const downloadProxyOptionsFromMedia = (download: Pick<MediaDownload, "mergeStrategy" | "mergeAudioUrl">): DownloadProxyOptions => ({
  mergeStrategy: download.mergeStrategy ?? null,
  mergeAudioUrl: download.mergeAudioUrl ?? null,
});
