import { totalModelBytes, type BrowserModelId } from "./model-manifest";
import type { ModelLoader } from "./model-registry";

type Wait = (milliseconds: number) => Promise<void>;

export function createDemoModelLoader(wait: Wait = waitForTimer): ModelLoader {
  const failedFirstAttempts = new Set<BrowserModelId>();

  const loader: ModelLoader = {
    load: async (model, report) => {
      const totalBytes = totalModelBytes(model);
      for (const completedFraction of [0.25, 0.65, 1]) {
        await wait(90);
        report({
          downloadedBytes: Math.round(totalBytes * completedFraction),
          phase: "downloading",
        });
      }
      report({ phase: "initializing" });
      await wait(90);

      // The first controlled failure keeps retry and error UI testable without model traffic.
      if (!failedFirstAttempts.has(model.id)) {
        failedFirstAttempts.add(model.id);
        throw new Error("Simulierter erster Ladeversuch fehlgeschlagen.");
      }

      return Object.freeze({
        backend: model.runtime.backends[0] ?? "wasm",
        dispose: async () => wait(90),
        modelId: model.id,
      });
    },
  };
  return Object.freeze(loader);
}

function waitForTimer(milliseconds: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}
