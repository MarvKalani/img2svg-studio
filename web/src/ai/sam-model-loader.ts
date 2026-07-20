import type {
  Processor,
  SamModel as TransformersSamModel,
  Tensor,
} from "@huggingface/transformers";
import type { RasterPixels } from "../conversion/read-raster-pixels";
import { detectBrowserAiCapabilities } from "./browser-ai-capabilities";
import { prepareModelArtifactCache } from "./model-artifact-cache";
import { createDownloadProgressReporter } from "./model-download-progress";
import { totalModelBytes } from "./model-manifest";
import type { ModelLoader } from "./model-registry";
import { createSamAdapter, type SamRuntime, type SamSelectionSession } from "./sam-adapter";
import { SamPointKind, type SamSelectionMask, type SamSelectionPoint } from "./sam-selection";
import { configureLocalOnnxRuntime, type TransformersModule } from "./transformers-runtime";

interface ProcessedSamImage {
  readonly original_sizes: [number, number][];
  readonly pixel_values: Tensor;
  readonly reshaped_input_sizes: [number, number][];
}

interface SamProcessor extends Processor {
  post_process_masks(
    masks: Tensor,
    originalSizes: [number, number][],
    reshapedInputSizes: [number, number][],
  ): Promise<Tensor[]>;
  reshape_input_points(
    points: readonly (readonly (readonly [number, number])[])[],
    originalSizes: [number, number][],
    reshapedInputSizes: [number, number][],
  ): Tensor;
}

interface SamDecoderOutput {
  readonly iou_scores: Tensor;
  readonly pred_masks: Tensor;
}

interface SamDecoderModel {
  dispose(): Promise<void>;
  forward(input: Readonly<Record<string, Tensor>>): Promise<SamDecoderOutput>;
  get_image_embeddings(input: Readonly<{ pixel_values: Tensor }>): Promise<
    Readonly<{
      image_embeddings: Tensor;
      image_positional_embeddings: Tensor;
    }>
  >;
}

export function createSamModelLoader(): ModelLoader {
  const loader: ModelLoader = {
    load: async (model, report, context) => {
      if (model.id !== "slimsam") {
        throw new Error(`SlimSAM-Loader kann ${model.id} nicht laden.`);
      }
      const capabilities = await detectBrowserAiCapabilities();
      if (!capabilities.smartSelect) {
        throw new Error("SlimSAM benötigt WebGPU mit shader-f16-Unterstützung.");
      }

      const progress = createDownloadProgressReporter(model, report);
      const artifactCache = await prepareModelArtifactCache(model, progress, context.signal);
      context.signal.throwIfAborted();
      const transformers = await import("@huggingface/transformers");
      configureLocalOnnxRuntime(transformers, artifactCache);
      report({ downloadedBytes: totalModelBytes(model), phase: "downloading" });
      report({ phase: "initializing" });

      const processor = (await transformers.AutoProcessor.from_pretrained(model.repository, {
        local_files_only: true,
        revision: model.revision,
      })) as SamProcessor;
      const pretrainedModel = (await transformers.SamModel.from_pretrained(model.repository, {
        device: "webgpu",
        dtype: model.runtime.dataType,
        local_files_only: true,
        revision: model.revision,
        session_options: { logSeverityLevel: 3 },
      })) as TransformersSamModel;
      context.signal.throwIfAborted();

      return createSamAdapter(
        "webgpu",
        createTransformersSamRuntime(
          transformers,
          pretrainedModel as unknown as SamDecoderModel,
          processor,
        ),
      );
    },
  };
  return Object.freeze(loader);
}

function createTransformersSamRuntime(
  transformers: TransformersModule,
  model: SamDecoderModel,
  processor: SamProcessor,
): SamRuntime {
  return Object.freeze({
    createSelection: async (input: RasterPixels) => {
      const image = new transformers.RawImage(
        new Uint8ClampedArray(input.rgba),
        input.widthPixels,
        input.heightPixels,
        4,
      );
      const processed = requireProcessedImage(await processor(image));
      let embeddings:
        | Readonly<{ image_embeddings: Tensor; image_positional_embeddings: Tensor }>
        | undefined;
      try {
        embeddings = await model.get_image_embeddings({ pixel_values: processed.pixel_values });
      } finally {
        processed.pixel_values.dispose();
      }
      return createPromptSession(transformers.Tensor, model, processor, processed, embeddings);
    },
    dispose: async () => model.dispose(),
  });
}

function createPromptSession(
  TensorConstructor: typeof Tensor,
  model: SamDecoderModel,
  processor: SamProcessor,
  processed: ProcessedSamImage,
  embeddings: Readonly<{ image_embeddings: Tensor; image_positional_embeddings: Tensor }>,
): SamSelectionSession {
  let disposed = false;
  let activePrediction: Promise<SamSelectionMask> | undefined;

  const predict = (points: readonly SamSelectionPoint[]): Promise<SamSelectionMask> => {
    if (disposed) {
      return Promise.reject(new Error("Die Smart-Select-Sitzung wurde bereits beendet."));
    }
    if (points.length === 0) {
      return Promise.reject(new Error("Smart Select benötigt mindestens einen Punkt."));
    }
    if (activePrediction) {
      return Promise.reject(new Error("Die Smart-Select-Maske wird bereits aktualisiert."));
    }
    const prediction = predictMask(
      TensorConstructor,
      model,
      processor,
      processed,
      embeddings,
      points,
    );
    activePrediction = prediction;
    return prediction.finally(() => {
      if (activePrediction === prediction) {
        activePrediction = undefined;
      }
    });
  };

  return Object.freeze({
    dispose: async () => {
      if (!disposed) {
        disposed = true;
        await activePrediction?.catch(() => undefined);
        embeddings.image_embeddings.dispose();
        embeddings.image_positional_embeddings.dispose();
      }
    },
    predict,
  });
}

async function predictMask(
  TensorConstructor: typeof Tensor,
  model: SamDecoderModel,
  processor: SamProcessor,
  processed: ProcessedSamImage,
  embeddings: Readonly<{ image_embeddings: Tensor; image_positional_embeddings: Tensor }>,
  points: readonly SamSelectionPoint[],
): Promise<SamSelectionMask> {
  const inputPoints = processor.reshape_input_points(
    [points.map((point) => [point.xPixels, point.yPixels] as const)],
    processed.original_sizes,
    processed.reshaped_input_sizes,
  );
  const inputLabels = new TensorConstructor(
    "int64",
    points.map((point) => BigInt(point.kind === SamPointKind.Positive ? 1 : 0)),
    [1, 1, points.length],
  );
  let output: SamDecoderOutput | undefined;
  let processedMasks: Tensor[] = [];
  try {
    output = await model.forward({
      image_embeddings: embeddings.image_embeddings,
      image_positional_embeddings: embeddings.image_positional_embeddings,
      input_labels: inputLabels,
      input_points: inputPoints,
    });
    processedMasks = await processor.post_process_masks(
      output.pred_masks,
      processed.original_sizes,
      processed.reshaped_input_sizes,
    );
    return selectBestMask(output.iou_scores, processedMasks, processed.original_sizes[0]);
  } finally {
    for (const mask of processedMasks) {
      mask.dispose();
    }
    output?.iou_scores.dispose();
    output?.pred_masks.dispose();
    inputLabels.dispose();
    inputPoints.dispose();
  }
}

function selectBestMask(
  scores: Tensor,
  masks: readonly Tensor[],
  originalSize: [number, number] | undefined,
): SamSelectionMask {
  const mask = masks[0];
  const heightPixels = originalSize?.[0];
  const widthPixels = originalSize?.[1];
  const maskCount = mask?.dims.at(-3);
  if (!mask || !heightPixels || !widthPixels || !maskCount) {
    throw new Error("SlimSAM lieferte keine verwendbare Maske.");
  }
  const bestMaskIndex = maximumValueIndex(scores.data, maskCount);
  const pixelCount = widthPixels * heightPixels;
  const offset = bestMaskIndex * pixelCount;
  if (mask.data.length < offset + pixelCount) {
    throw new Error("SlimSAM lieferte eine unerwartete Maskengröße.");
  }
  const selected = new Uint8Array(pixelCount);
  for (let pixelIndex = 0; pixelIndex < pixelCount; pixelIndex += 1) {
    selected[pixelIndex] = Number(mask.data[offset + pixelIndex] ?? 0) === 0 ? 0 : 1;
  }
  return { heightPixels, selected, widthPixels };
}

function maximumValueIndex(values: ArrayLike<number | bigint>, limit: number): number {
  let bestIndex = 0;
  let bestValue = Number(values[0] ?? Number.NEGATIVE_INFINITY);
  for (let index = 1; index < limit; index += 1) {
    const value = Number(values[index] ?? Number.NEGATIVE_INFINITY);
    if (value > bestValue) {
      bestIndex = index;
      bestValue = value;
    }
  }
  return bestIndex;
}

function requireProcessedImage(input: unknown): ProcessedSamImage {
  if (!isRecord(input) || !isTensor(input.pixel_values)) {
    throw new Error("SlimSAM konnte das Eingabebild nicht vorbereiten.");
  }
  if (!isSizes(input.original_sizes) || !isSizes(input.reshaped_input_sizes)) {
    input.pixel_values.dispose();
    throw new Error("SlimSAM lieferte keine gültigen Bildmaße.");
  }
  return {
    original_sizes: input.original_sizes,
    pixel_values: input.pixel_values,
    reshaped_input_sizes: input.reshaped_input_sizes,
  };
}

function isTensor(input: unknown): input is Tensor {
  return isRecord(input) && Array.isArray(input.dims) && "data" in input && "dispose" in input;
}

function isSizes(input: unknown): input is [number, number][] {
  return (
    Array.isArray(input) &&
    input.length > 0 &&
    input.every(
      (size) =>
        Array.isArray(size) &&
        size.length === 2 &&
        size.every((dimension) => Number.isInteger(dimension) && dimension > 0),
    )
  );
}

function isRecord(input: unknown): input is Record<string, unknown> {
  return typeof input === "object" && input !== null;
}
