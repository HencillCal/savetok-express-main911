import {
  EncodedAudioPacketSource,
  EncodedPacketSink,
  EncodedVideoPacketSource,
  Input,
  MP4,
  Mp4OutputFormat,
  Output,
  QTFF,
  StreamTarget,
  UrlSource,
} from "npm:mediabunny@1.13.0";

import {
  corsHeaders,
  isAllowedHost,
  json,
  sanitizeFilename,
  USER_AGENT,
} from "./http.ts";

type MergeResponseOptions = {
  referer?: string;
  defaultFilename?: string;
  userAgent?: string;
};

type ProbedVideoTrack = NonNullable<Awaited<ReturnType<Input["getPrimaryVideoTrack"]>>>;
type ProbedAudioTrack = NonNullable<Awaited<ReturnType<Input["getPrimaryAudioTrack"]>>>;

const NETWORK_HEADERS = (referer?: string, userAgent = USER_AGENT): HeadersInit => ({
  "User-Agent": userAgent,
  Accept: "*/*",
  "Accept-Language": "en-US,en;q=0.9",
  ...(referer ? { Referer: referer } : {}),
});

const createUrlSource = (fileUrl: string, referer?: string, userAgent?: string) =>
  new UrlSource(fileUrl, {
    requestInit: {
      headers: NETWORK_HEADERS(referer, userAgent),
    },
    fetchFn: (url, requestInit) => {
      const headers = new Headers(requestInit?.headers);
      const baseHeaders = new Headers(NETWORK_HEADERS(referer, userAgent));
      baseHeaders.forEach((value, key) => {
        if (!headers.has(key)) headers.set(key, value);
      });
      return fetch(url, {
        ...requestInit,
        headers,
      });
    },
    maxCacheSize: 16 * 1024 * 1024,
    parallelism: 2,
    getRetryDelay: (previousAttempts) => (previousAttempts >= 2 ? null : 0.35 * (previousAttempts + 1)),
  });

const validateFileUrl = (value: string | null, allowedHosts: readonly string[]) => {
  if (!value) throw new Error("Missing file URL");

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error("Missing or invalid file URL");
  }

  if (!isAllowedHost(parsed.hostname, allowedHosts)) {
    throw new Error("Host not allowed");
  }

  return parsed.toString();
};

const asErrorResponse = (error: unknown) => {
  const message = error instanceof Error ? error.message : "Merge failed";
  const status =
    message === "Host not allowed"
    || message.startsWith("Missing")
    || message.startsWith("Unsupported")
    || message.startsWith("Could not read")
      ? 400
      : 500;

  return json({ error: message }, status);
};

const createProbeInputs = (videoUrl: string, audioUrl: string, referer?: string, userAgent?: string) => {
  const videoInput = new Input({
    formats: [MP4, QTFF],
    source: createUrlSource(videoUrl, referer, userAgent),
  });
  const audioInput = new Input({
    formats: [MP4, QTFF],
    source: createUrlSource(audioUrl, referer, userAgent),
  });

  return { videoInput, audioInput };
};

async function probeTracks(videoUrl: string, audioUrl: string, referer?: string, userAgent?: string) {
  const { videoInput, audioInput } = createProbeInputs(videoUrl, audioUrl, referer, userAgent);

  try {
    const [videoTrack, audioTrack] = await Promise.all([
      videoInput.getPrimaryVideoTrack(),
      audioInput.getPrimaryAudioTrack(),
    ]);

    if (!videoTrack || !audioTrack) {
      throw new Error("Could not read compatible video and audio tracks for merge");
    }

    if (!videoTrack.codec || !audioTrack.codec) {
      throw new Error("Unsupported track codec for MP4 merge");
    }

    const [videoConfig, audioConfig] = await Promise.all([
      videoTrack.getDecoderConfig(),
      audioTrack.getDecoderConfig(),
    ]);

    if (!videoConfig || !audioConfig) {
      throw new Error("Missing decoder configuration for MP4 merge");
    }

    return { videoTrack, audioTrack, videoConfig, audioConfig, videoInput, audioInput };
  } catch (error) {
    videoInput.dispose();
    audioInput.dispose();
    throw error;
  }
}

const pipeVideoPackets = async (
  track: ProbedVideoTrack,
  source: EncodedVideoPacketSource,
  decoderConfig: VideoDecoderConfig,
) => {
  const sink = new EncodedPacketSink(track);
  let first = true;

  for await (const packet of sink.packets()) {
    if (first) {
      await source.add(packet, { decoderConfig });
      first = false;
    } else {
      await source.add(packet);
    }
  }

  if (first) {
    throw new Error("Video track has no packets");
  }
};

const pipeAudioPackets = async (
  track: ProbedAudioTrack,
  source: EncodedAudioPacketSource,
  decoderConfig: AudioDecoderConfig,
) => {
  const sink = new EncodedPacketSink(track);
  let first = true;

  for await (const packet of sink.packets()) {
    if (first) {
      await source.add(packet, { decoderConfig });
      first = false;
    } else {
      await source.add(packet);
    }
  }

  if (first) {
    throw new Error("Audio track has no packets");
  }
};

export async function validateMp4MergeRequest(
  videoUrl: string | null,
  audioUrl: string | null,
  allowedHosts: readonly string[],
  options?: MergeResponseOptions,
) {
  const safeVideoUrl = validateFileUrl(videoUrl, allowedHosts);
  const safeAudioUrl = validateFileUrl(audioUrl, allowedHosts);
  const { videoInput, audioInput } = await probeTracks(safeVideoUrl, safeAudioUrl, options?.referer, options?.userAgent);
  videoInput.dispose();
  audioInput.dispose();
}

export async function mergeMp4Response(
  videoUrl: string | null,
  audioUrl: string | null,
  filename: string,
  allowedHosts: readonly string[],
  options?: MergeResponseOptions,
) {
  try {
    const safeVideoUrl = validateFileUrl(videoUrl, allowedHosts);
    const safeAudioUrl = validateFileUrl(audioUrl, allowedHosts);

    const {
      videoTrack,
      audioTrack,
      videoConfig,
      audioConfig,
      videoInput,
      audioInput,
    } = await probeTracks(safeVideoUrl, safeAudioUrl, options?.referer, options?.userAgent);

    const videoSource = new EncodedVideoPacketSource(videoTrack.codec);
    const audioSource = new EncodedAudioPacketSource(audioTrack.codec);
    const stream = new TransformStream<Uint8Array, Uint8Array>();
    const output = new Output({
      format: new Mp4OutputFormat(),
      target: new StreamTarget(stream.writable, {
        chunked: true,
        chunkSize: 1024 * 1024,
      }),
    });

    output.addVideoTrack(videoSource);
    output.addAudioTrack(audioSource);

    const task = (async () => {
      try {
        await output.start();
        await Promise.all([
          pipeVideoPackets(videoTrack, videoSource, videoConfig),
          pipeAudioPackets(audioTrack, audioSource, audioConfig),
        ]);
        await output.finalize();
      } catch (error) {
        await output.cancel().catch(() => undefined);
        await stream.writable.abort(error).catch(() => undefined);
      } finally {
        videoInput.dispose();
        audioInput.dispose();
      }
    })();

    void task;

    return new Response(stream.readable, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "video/mp4",
        "Content-Disposition": `attachment; filename="${sanitizeFilename(filename, options?.defaultFilename ?? "merged-media")}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return asErrorResponse(error);
  }
}
