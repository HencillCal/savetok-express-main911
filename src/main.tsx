import { createRoot } from "react-dom/client";
import "./index.css";
import ErrorBoundary from "@/components/ErrorBoundary";

// Apply stored theme before render to avoid flash
const stored = localStorage.getItem("ttok-theme");
const prefersDark =
  stored === "dark" ||
  (!stored && window.matchMedia("(prefers-color-scheme: dark)").matches);
document.documentElement.classList.toggle("dark", prefersDark);

const mount = () => {
  const rootEl = document.getElementById("root")!;
  const root = createRoot(rootEl);

  import("./App")
    .then(({ default: App }) => {
      root.render(
        <ErrorBoundary>
          <App />
        </ErrorBoundary>,
      );
    })
    .catch((err) => {
      // If module evaluation fails, show the error in the DOM so it's visible.
      // eslint-disable-next-line no-console
      console.error("Failed to load App module:", err);
      root.render(
        <div style={{ padding: 24 }}>
          <h1 style={{ marginTop: 0 }}>Failed to load application</h1>
          <pre style={{ whiteSpace: "pre-wrap" }}>{String(err)}</pre>
        </div>,
      );
    });
};

mount();
