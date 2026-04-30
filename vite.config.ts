import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { Readable } from "node:stream";
import { componentTagger } from "lovable-tagger";
import { handleFacebookDownload } from "./dev/functions/facebook";
import { handlePaystackInitialize, handlePaystackVerify } from "./dev/functions/paystack";
import { handleYouTubeDownload } from "./dev/functions/youtube";
import { handleTinyUrl } from "./dev/functions/tinyurl-tools";

const devFunctionHandlers: Record<string, (request: Request) => Promise<Response>> = {
  "facebook-download": handleFacebookDownload,
  "youtube-download": handleYouTubeDownload,
  "paystack-initialize": handlePaystackInitialize,
  "paystack-verify": handlePaystackVerify,
  "tinyurl-tools": handleTinyUrl,
};

const toWebRequest = (req: import("node:http").IncomingMessage) => {
  const origin = `http://${req.headers.host ?? "localhost:8080"}`;
  const url = new URL(req.url ?? "/", origin);
  const method = req.method ?? "GET";
  const headers = new Headers();

  Object.entries(req.headers).forEach(([key, value]) => {
    if (typeof value === "string") {
      headers.set(key, value);
    } else if (Array.isArray(value)) {
      headers.set(key, value.join(", "));
    }
  });

  return new Request(url, {
    method,
    headers,
    body: method === "GET" || method === "HEAD" ? undefined : Readable.toWeb(req),
    duplex: method === "GET" || method === "HEAD" ? undefined : "half",
  });
};

const writeWebResponse = async (res: import("node:http").ServerResponse, response: Response) => {
  res.statusCode = response.status;
  response.headers.forEach((value, key) => {
    res.setHeader(key, value);
  });

  if (!response.body) {
    res.end();
    return;
  }

  await new Promise<void>((resolve, reject) => {
    Readable.fromWeb(response.body as globalThis.ReadableStream).pipe(res).on("finish", resolve).on("error", reject);
  });
};

const devFunctionProxy = () => ({
  name: "dev-function-proxy",
  apply: "serve" as const,
  configureServer(server: import("vite").ViteDevServer) {
    server.middlewares.use(async (req, res, next) => {
      const pathname = (req.url ?? "").split("?")[0];
      const match = pathname.match(/^\/functions\/v1\/([^/]+)$/);
      const functionName = match?.[1];
      const handler = functionName ? devFunctionHandlers[functionName] : null;

      if (!handler) {
        next();
        return;
      }

      try {
        const request = toWebRequest(req);
        const response = await handler(request);
        await writeWebResponse(res, response);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Local function proxy failed";
        res.statusCode = 500;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: message }));
      }
    });
  },
});

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  Object.assign(process.env, env);

  return {
    server: {
      host: "::",
      port: 8080,
      hmr: {
        overlay: false,
      },
    },
    plugins: [react(), devFunctionProxy(), mode === "development" && componentTagger()].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
      dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
    },
  };
});
