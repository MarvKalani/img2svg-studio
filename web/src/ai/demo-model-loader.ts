import { totalModelBytes, type BrowserModelId } from "./model-manifest";
import type { ModelLoader } from "./model-registry";

type Wait = (milliseconds: number, signal: AbortSignal) => Promise<void>;
const loadStepMilliseconds = 500;
const disposeMilliseconds = 90;

export function createDemoModelLoader(wait: Wait = waitForTimer): ModelLoader {
  const failedFirstAttempts = new Set<BrowserModelId>();

  const loader: ModelLoader = {
    load: async (model, report, context) => {
      const totalBytes = totalModelBytes(model);
      for (const completedFraction of [0.25, 0.65, 1]) {
        await wait(loadStepMilliseconds, context.signal);
        report({
          downloadedBytes: Math.round(totalBytes * completedFraction),
          phase: "downloading",
        });
      }
      report({ phase: "initializing" });
      await wait(loadStepMilliseconds, context.signal);

      // The first controlled failure keeps retry and error UI testable without model traffic.
      if (!failedFirstAttempts.has(model.id)) {
        failedFirstAttempts.add(model.id);
        throw new Error("Simulierter erster Ladeversuch fehlgeschlagen.");
      }

      return Object.freeze({
        backend: model.runtime.backends[0] ?? "wasm",
        dispose: async () => wait(disposeMilliseconds, new AbortController().signal),
        modelId: model.id,
      });
    },
  };
  return Object.freeze(loader);
}

function waitForTimer(milliseconds: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(finish, milliseconds);
    signal.addEventListener("abort", abort, { once: true });
    if (signal.aborted) {
      abort();
    }

    function finish(): void {
      signal.removeEventListener("abort", abort);
      resolve();
    }

    function abort(): void {
      window.clearTimeout(timeout);
      signal.removeEventListener("abort", abort);
      reject(new DOMException("Modellladen abgebrochen.", "AbortError"));
    }
  });
}
