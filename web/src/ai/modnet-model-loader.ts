import type {
  PreTrainedModel,
  Processor,
  RawImage as TransformersRawImage,
  Tensor,
} from "@huggingface/transformers";
import type { RasterPixels } from "../conversion/read-raster-pixels";
import {
  type BrowserExecutionBackend,
  type BrowserModelDefinition,
  totalModelBytes,
} from "./model-manifest";
import { createModnetAdapter, type ModnetSession } from "./modnet-adapter";
import type { ModelLoader, ModelLoadUpdate } from "./model-registry";

type TransformersModule = typeof import("@huggingface/transformers");
type DownloadProgress = Readonly<{
  file?: string;
  loaded?: number;
  status: string;
}>;

export function createModnetModelLoader(): ModelLoader {
  const loader: ModelLoader = {
    load: async (model, report) => {
      if (model.id !== "modnet") {
        throw new Error(`MODNet-Loader kann ${model.id} nicht laden.`);
      }

      const transformers = await import("@huggingface/transformers");
      configureLocalOnnxRuntime(transformers);
      const progress = createDownloadProgressReporter(model, report);
      const processor = await transformers.AutoProcessor.from_pretrained(model.repository, {
        progress_callback: progress,
        revision: model.revision,
      });
      const { backend, pretrainedModel } = await loadWithBestBackend(transformers, model, progress);
      report({ downloadedBytes: totalModelBytes(model), phase: "downloading" });
      report({ phase: "initializing" });

      return createModnetAdapter(
        backend,
        createTransformersSession(transformers.RawImage, pretrainedModel, processor),
      );
    },
  };
  return Object.freeze(loader);
}

function configureLocalOnnxRuntime(transformers: TransformersModule): void {
  // Transformers.js defaults to a CDN although Vite already ships the matching WASM asset.
  transformers.env.backends.onnx.wasm!.wasmPaths = {
    wasm: new URL(
      "../../node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.jsep.wasm",
      import.meta.url,
    ).href,
  };
  // ONNX reports intentional CPU assignments as warnings even when WebGPU runs the graph.
  transformers.env.backends.onnx.logLevel = "fatal";
}

export function createDownloadProgressReporter(
  model: BrowserModelDefinition,
  report: (update: ModelLoadUpdate) => void,
): (progress: DownloadProgress) => void {
  const downloadedByPath = new Map(model.files.map((file) => [file.path, 0]));

  return (progress): void => {
    const artifact = model.files.find(
      (file) => progress.file === file.path || progress.file?.endsWith(`/${file.path}`),
    );
    if (!artifact) {
      return;
    }

    const reportedBytes =
      progress.status === "done"
        ? artifact.bytes
        : progress.status === "progress" && Number.isFinite(progress.loaded)
          ? Math.min(Math.max(progress.loaded ?? 0, 0), artifact.bytes)
          : (downloadedByPath.get(artifact.path) ?? 0);
    downloadedByPath.set(
      artifact.path,
      Math.max(downloadedByPath.get(artifact.path) ?? 0, reportedBytes),
    );
    const downloadedBytes = [...downloadedByPath.values()].reduce(
      (total, bytes) => total + bytes,
      0,
    );
    report({ downloadedBytes, phase: "downloading" });
  };
}

async function loadWithBestBackend(
  transformers: TransformersModule,
  model: BrowserModelDefinition,
  progress: (progress: DownloadProgress) => void,
): Promise<Readonly<{ backend: BrowserExecutionBackend; pretrainedModel: PreTrainedModel }>> {
  let lastError: unknown;
  for (const backend of availableBackends(model.runtime.backends)) {
    try {
      const pretrainedModel = await transformers.AutoModel.from_pretrained(model.repository, {
        device: backend,
        dtype: model.runtime.dataType,
        progress_callback: progress,
        revision: model.revision,
        // ORT assigns shape operations to CPU by design; surface only actionable session errors.
        session_options: { logSeverityLevel: 3 },
      });
      return { backend, pretrainedModel };
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error("MODNet konnte mit keinem Browser-Backend initialisiert werden.");
}

function availableBackends(
  configuredBackends: readonly BrowserExecutionBackend[],
): readonly BrowserExecutionBackend[] {
  return configuredBackends.filter(
    (backend) => backend !== "webgpu" || (typeof navigator !== "undefined" && "gpu" in navigator),
  );
}

function createTransformersSession(
  RawImage: typeof TransformersRawImage,
  pretrainedModel: PreTrainedModel,
  processor: Processor,
): ModnetSession {
  return Object.freeze({
    dispose: async () => {
      await pretrainedModel.dispose();
    },
    predictAlpha: async (input: RasterPixels) => {
      const image = new RawImage(
        new Uint8ClampedArray(input.rgba),
        input.widthPixels,
        input.heightPixels,
        4,
      );
      const processorOutput = await processor(image);
      const inputTensor = requireTensor(processorOutput, "pixel_values");
      let outputTensor: Tensor | undefined;
      try {
        const modelOutput = await pretrainedModel({ input: inputTensor });
        outputTensor = requireTensor(modelOutput, "output");
        return resizeAlphaMatte(outputTensor, input.widthPixels, input.heightPixels);
      } finally {
        outputTensor?.dispose();
        inputTensor.dispose();
      }
    },
  });
}

function requireTensor(input: unknown, property: string): Tensor {
  if (!isRecord(input)) {
    throw new Error(`MODNet lieferte kein ${property}-Tensor.`);
  }
  const tensor = input[property];
  if (!isRecord(tensor) || !Array.isArray(tensor.dims) || !("data" in tensor)) {
    throw new Error(`MODNet lieferte kein ${property}-Tensor.`);
  }
  return tensor as unknown as Tensor;
}

function resizeAlphaMatte(
  tensor: Tensor,
  targetWidth: number,
  targetHeight: number,
): Float32Array<ArrayBuffer> {
  const sourceHeight = tensor.dims.at(-2);
  const sourceWidth = tensor.dims.at(-1);
  if (!sourceWidth || !sourceHeight || tensor.data.length !== sourceWidth * sourceHeight) {
    throw new Error("MODNet lieferte eine unerwartete Maskengröße.");
  }
  const source = Float32Array.from(tensor.data as ArrayLike<number>);
  const target = new Float32Array(targetWidth * targetHeight);

  for (let targetY = 0; targetY < targetHeight; targetY += 1) {
    const sourceY = ((targetY + 0.5) * sourceHeight) / targetHeight - 0.5;
    const y0 = Math.max(Math.floor(sourceY), 0);
    const y1 = Math.min(y0 + 1, sourceHeight - 1);
    const yWeight = Math.max(sourceY - y0, 0);
    for (let targetX = 0; targetX < targetWidth; targetX += 1) {
      const sourceX = ((targetX + 0.5) * sourceWidth) / targetWidth - 0.5;
      const x0 = Math.max(Math.floor(sourceX), 0);
      const x1 = Math.min(x0 + 1, sourceWidth - 1);
      const xWeight = Math.max(sourceX - x0, 0);
      const top = interpolate(
        source[y0 * sourceWidth + x0] ?? 0,
        source[y0 * sourceWidth + x1] ?? 0,
        xWeight,
      );
      const bottom = interpolate(
        source[y1 * sourceWidth + x0] ?? 0,
        source[y1 * sourceWidth + x1] ?? 0,
        xWeight,
      );
      target[targetY * targetWidth + targetX] = interpolate(top, bottom, yWeight);
    }
  }
  return target;
}

function interpolate(start: number, end: number, weight: number): number {
  return start + (end - start) * weight;
}

function isRecord(input: unknown): input is Record<string, unknown> {
  return typeof input === "object" && input !== null;
}
