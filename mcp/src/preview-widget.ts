export const previewResourceUri = "ui://img2svg/preview.html";

const maximumSvgBytes = 5 * 1024 * 1024;
const visibleElementNames = ["path", "circle", "ellipse", "rect", "line", "polygon"] as const;

export interface PreviewResult extends Record<string, unknown> {
  stats: Readonly<{
    byteSize: number;
    circleCount: number;
    elementCount: number;
    pathCount: number;
  }>;
  svg: string;
}

export function createPreviewResult(svg: string): PreviewResult {
  const byteSize = Buffer.byteLength(svg);
  if (byteSize === 0 || byteSize > maximumSvgBytes || !/^<svg\b[^>]*>[\s\S]*<\/svg>$/u.test(svg)) {
    throw new TypeError("invalid_svg");
  }

  const counts = Object.fromEntries(
    visibleElementNames.map((name) => [name, countElements(svg, name)]),
  ) as Record<(typeof visibleElementNames)[number], number>;
  return Object.freeze({
    stats: Object.freeze({
      byteSize,
      circleCount: counts.circle,
      elementCount: visibleElementNames.reduce((total, name) => total + counts[name], 0),
      pathCount: counts.path,
    }),
    svg,
  });
}

function countElements(svg: string, elementName: string): number {
  return [...svg.matchAll(new RegExp(`<${elementName}(?:\\s|>)`, "gu"))].length;
}

export const previewWidgetHtml: string = String.raw`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>img2svg preview</title>
    <style>
      :root { color-scheme: light dark; font-family: Inter, system-ui, sans-serif; }
      * { box-sizing: border-box; }
      body { margin: 0; padding: 12px; background: transparent; color: CanvasText; }
      main { display: grid; gap: 12px; }
      .canvas { min-height: 220px; display: grid; place-items: center; overflow: hidden;
        border: 1px solid color-mix(in srgb, CanvasText 18%, transparent); border-radius: 14px;
        background: repeating-conic-gradient(#e5e7eb 0 25%, #fff 0 50%) 50% / 20px 20px; }
      img { display: block; width: 100%; height: 100%; max-height: 420px; object-fit: contain; }
      footer { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
      output { font-size: 0.82rem; opacity: 0.75; }
      button { border: 0; border-radius: 999px; padding: 9px 16px; font: inherit;
        font-weight: 650; color: white; background: #2563eb; cursor: pointer; }
      button:disabled { cursor: not-allowed; opacity: 0.5; }
    </style>
  </head>
  <body>
    <main>
      <div class="canvas">
        <img id="svg-preview" alt="Generated SVG preview" />
      </div>
      <footer>
        <output id="svg-stats">Waiting for SVG…</output>
        <button id="download-svg" type="button" disabled>Download SVG</button>
      </footer>
    </main>
    <script type="module">
      const preview = document.querySelector("#svg-preview");
      const stats = document.querySelector("#svg-stats");
      const downloadButton = document.querySelector("#download-svg");
      let currentSvg = "";
      let rpcId = 0;
      const pendingRequests = new Map();

      function render(result) {
        if (!result || typeof result.svg !== "string" || !result.stats) return;
        currentSvg = result.svg;
        preview.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(currentSvg);
        stats.textContent = result.stats.byteSize + " bytes · " + result.stats.elementCount +
          " elements · " + result.stats.pathCount + " paths";
        downloadButton.disabled = false;
      }

      function rpcNotify(method, params) {
        window.parent.postMessage({ jsonrpc: "2.0", method, params }, "*");
      }

      function rpcRequest(method, params) {
        return new Promise((resolve, reject) => {
          const id = ++rpcId;
          pendingRequests.set(id, { reject, resolve });
          window.parent.postMessage({ jsonrpc: "2.0", id, method, params }, "*");
        });
      }

      window.addEventListener("message", (event) => {
        if (event.source !== window.parent) return;
        const message = event.data;
        if (!message || message.jsonrpc !== "2.0") return;
        if (typeof message.id === "number") {
          const pending = pendingRequests.get(message.id);
          if (!pending) return;
          pendingRequests.delete(message.id);
          message.error ? pending.reject(message.error) : pending.resolve(message.result);
          return;
        }
        if (message.method === "ui/notifications/tool-result") {
          render(message.params?.structuredContent);
        }
      }, { passive: true });

      downloadButton.addEventListener("click", () => {
        if (!currentSvg) return;
        const url = URL.createObjectURL(new Blob([currentSvg], { type: "image/svg+xml" }));
        const link = document.createElement("a");
        link.href = url;
        link.download = "img2svg-result.svg";
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 0);
      });

      render(window.openai?.toolOutput);
      try {
        await rpcRequest("ui/initialize", {
          appCapabilities: {},
          appInfo: { name: "img2svg-preview", version: "0.1.0" },
          protocolVersion: "2026-01-26",
        });
        rpcNotify("ui/notifications/initialized", {});
      } catch (error) {
        console.error("Failed to initialize the img2svg preview bridge", error);
      }
    </script>
  </body>
</html>`;
