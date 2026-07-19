import type {
  PreTrainedModel,
  Processor,
  RawImage as TransformersRawImage,
  Tensor,
} from "@huggingface/transformers";
import type { RasterPixels } from "../conversion/read-raster-pixels";
import { prepareModelArtifactCache } from "./model-artifact-cache";
import { createDownloadProgressReporter } from "./model-download-progress";
import {
  type BrowserExecutionBackend,
  type BrowserModelDefinition,
  totalModelBytes,
} from "./model-manifest";
import { createModnetAdapter, type ModnetSession } from "./modnet-adapter";
import type { ModelLoader } from "./model-registry";
import {
  availableBackends,
  configureLocalOnnxRuntime,
  type TransformersModule,
} from "./transformers-runtime";

export function createModnetModelLoader(): ModelLoader {
  const loader: ModelLoader = {
    load: async (model, report, context) => {
      if (model.id !== "modnet") {
        throw new Error(`MODNet-Loader kann ${model.id} nicht laden.`);
      }

      const progress = createDownloadProgressReporter(model, report);
      const artifactCache = await prepareModelArtifactCache(model, progress, context.signal);
      context.signal.throwIfAborted();
      const transformers = await import("@huggingface/transformers");
      configureLocalOnnxRuntime(transformers, artifactCache);
      const processor = await transformers.AutoProcessor.from_pretrained(model.repository, {
        local_files_only: true,
        revision: model.revision,
      });
      const { backend, pretrainedModel } = await loadWithBestBackend(
        transformers,
        model,
        context.signal,
      );
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

async function loadWithBestBackend(
  transformers: TransformersModule,
  model: BrowserModelDefinition,
  signal: AbortSignal,
): Promise<Readonly<{ backend: BrowserExecutionBackend; pretrainedModel: PreTrainedModel }>> {
  let lastError: unknown;
  for (const backend of availableBackends(model.runtime.backends)) {
    signal.throwIfAborted();
    try {
      const pretrainedModel = await transformers.AutoModel.from_pretrained(model.repository, {
        device: backend,
        dtype: model.runtime.dataType,
        local_files_only: true,
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
