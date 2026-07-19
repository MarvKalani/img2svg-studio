import type { BrowserExecutionBackend } from "./model-manifest";
import type { ModelArtifactCache } from "./model-artifact-cache";

export type TransformersModule = typeof import("@huggingface/transformers");

export function configureLocalOnnxRuntime(
  transformers: TransformersModule,
  artifactCache: ModelArtifactCache,
): void {
  // Transformers.js defaults to a CDN although Vite already ships the matching WASM asset.
  transformers.env.backends.onnx.wasm!.wasmPaths = {
    wasm: new URL(
      "../../node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.jsep.wasm",
      import.meta.url,
    ).href,
  };
  transformers.env.allowLocalModels = true;
  transformers.env.allowRemoteModels = false;
  transformers.env.useBrowserCache = false;
  transformers.env.useCustomCache = true;
  transformers.env.customCache = artifactCache;
  // ONNX reports intentional CPU assignments as warnings even when WebGPU runs the graph.
  transformers.env.backends.onnx.logLevel = "fatal";
}

export function availableBackends(
  configuredBackends: readonly BrowserExecutionBackend[],
): readonly BrowserExecutionBackend[] {
  return configuredBackends.filter(
    (backend) => backend !== "webgpu" || (typeof navigator !== "undefined" && "gpu" in navigator),
  );
}
