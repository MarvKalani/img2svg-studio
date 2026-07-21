import type { AiActionResult } from "../ai/ai-action-result";
import { MaskPolarity } from "../ai/sam-selection";
import type { NormalizedImagePoint, SmartSelectionRequest } from "../ai/smart-select-controller";
import type { BrowserModelId } from "../ai/model-manifest";
import type { ModelRegistrySnapshot } from "../ai/model-registry";
import type { ComparedRuns, CompareSlot } from "../compare/compare-selection";
import { ComparisonSourceKind } from "../compare/comparison-source";
import type { ConversionOptions } from "../conversion/conversion-options";
import type { ConversionRun } from "../history/history-store";
import type { LoadedImage } from "../image/image-store";
import type {
  MagicWandApplyResult,
  MagicWandPreviewRequest,
  MagicWandPreviewResult,
} from "../selection/magic-wand-controller";
import { WebMcpToolName, type WebMcpTool } from "./webmcp-adapter";
import { utf8ByteLength } from "../format-byte-size";

export interface StudioToolServices {
  applySmartSelection(request: SmartSelectionRequest): Promise<AiActionResult>;
  applyMagicWandSelection(): Promise<MagicWandApplyResult>;
  assignComparison(slot: CompareSlot, runId: number): ConversionRun | undefined;
  assignOriginalComparison(slot: CompareSlot): boolean;
  assignProcessedComparison(slot: CompareSlot): boolean;
  downloadSelectedSvg(): boolean;
  loadModel(modelId: BrowserModelId): Promise<ModelRegistrySnapshot>;
  readComparedRuns(): ComparedRuns;
  readImage(): LoadedImage | undefined;
  readModels(): readonly ModelRegistrySnapshot[];
  readOptions(): ConversionOptions;
  readRuns(): readonly ConversionRun[];
  removeRun(runId: number): boolean;
  removeBackground(): Promise<AiActionResult>;
  previewMagicWandSelection(request: MagicWandPreviewRequest): Promise<MagicWandPreviewResult>;
  retryModel(modelId: BrowserModelId): Promise<ModelRegistrySnapshot>;
  selectRun(runId: number): ConversionRun | undefined;
  unloadModel(modelId: BrowserModelId): Promise<ModelRegistrySnapshot>;
}

export interface StudioToolAvailability {
  readonly modelIds: readonly BrowserModelId[];
  readonly smartSelection: boolean;
}

const allStudioTools: StudioToolAvailability = Object.freeze({
  modelIds: Object.freeze(["modnet", "slimsam"] as const),
  smartSelection: true,
});

const emptyObjectSchema = Object.freeze({
  additionalProperties: false,
  properties: Object.freeze({}),
  type: "object",
});

const runSchema = Object.freeze({
  additionalProperties: false,
  properties: Object.freeze({ runId: Object.freeze({ minimum: 1, type: "integer" }) }),
  required: Object.freeze(["runId"]),
  type: "object",
});

const comparisonSchema = Object.freeze({
  additionalProperties: false,
  oneOf: Object.freeze([
    Object.freeze({ required: Object.freeze(["runId"]) }),
    Object.freeze({ required: Object.freeze(["original"]) }),
    Object.freeze({ required: Object.freeze(["processed"]) }),
  ]),
  properties: Object.freeze({
    original: Object.freeze({ const: true, type: "boolean" }),
    processed: Object.freeze({ const: true, type: "boolean" }),
    runId: Object.freeze({ minimum: 1, type: "integer" }),
  }),
  type: "object",
});

const normalizedPointSchema = Object.freeze({
  additionalProperties: false,
  properties: Object.freeze({
    x: Object.freeze({ maximum: 1, minimum: 0, type: "number" }),
    y: Object.freeze({ maximum: 1, minimum: 0, type: "number" }),
  }),
  required: Object.freeze(["x", "y"]),
  type: "object",
});

const smartSelectionSchema = Object.freeze({
  additionalProperties: false,
  properties: Object.freeze({
    negativePoints: Object.freeze({
      items: normalizedPointSchema,
      minItems: 1,
      type: "array",
    }),
    polarity: Object.freeze({
      enum: Object.freeze([MaskPolarity.Selected, MaskPolarity.Inverted]),
      type: "string",
    }),
    positivePoints: Object.freeze({
      items: normalizedPointSchema,
      minItems: 2,
      type: "array",
    }),
  }),
  required: Object.freeze(["positivePoints", "negativePoints", "polarity"]),
  type: "object",
});

const magicWandSchema = Object.freeze({
  additionalProperties: false,
  properties: Object.freeze({
    sensitivityPercent: Object.freeze({ maximum: 100, minimum: 0, type: "number" }),
    source: Object.freeze({ enum: Object.freeze(["original", "processed"]), type: "string" }),
    x: Object.freeze({ maximum: 1, minimum: 0, type: "number" }),
    y: Object.freeze({ maximum: 1, minimum: 0, type: "number" }),
  }),
  required: Object.freeze(["source", "x", "y", "sensitivityPercent"]),
  type: "object",
});

export function createStudioTools(
  services: StudioToolServices,
  availability: StudioToolAvailability = allStudioTools,
): readonly WebMcpTool[] {
  const tools = [
    readWorkspaceTool(services),
    selectRunTool(services),
    deleteRunTool(services),
    compareTool(services, "a", WebMcpToolName.SelectComparisonA),
    compareTool(services, "b", WebMcpToolName.SelectComparisonB),
    downloadTool(services),
    modelTool(services, availability.modelIds, "load", WebMcpToolName.LoadModel),
    modelTool(services, availability.modelIds, "retry", WebMcpToolName.RetryModel),
    modelTool(services, availability.modelIds, "unload", WebMcpToolName.UnloadModel),
    magicWandPreviewTool(services),
    magicWandApplyTool(services),
    backgroundRemovalTool(services),
    ...(availability.smartSelection ? [smartSelectionTool(services)] : []),
  ];
  return Object.freeze(tools);
}

function magicWandPreviewTool(services: StudioToolServices): WebMcpTool {
  return defineTool({
    annotations: { readOnlyHint: false, untrustedContentHint: true },
    description:
      "Preview a visible contiguous Magic Wand selection without changing pixels. Coordinates are normalized from the image top-left. For the bundled logo's black edge background, start with source original, x 0.01, y 0.01 and sensitivityPercent 15; inspect coverage before applying it.",
    execute: async (input: unknown) => {
      const request = readMagicWandRequest(input);
      return request
        ? magicWandResult(await services.previewMagicWandSelection(request))
        : invalidInput(
            "Use source original or processed, normalized x/y, and sensitivityPercent 0 to 100.",
          );
    },
    inputSchema: magicWandSchema,
    name: WebMcpToolName.PreviewMagicWandSelection,
  });
}

function magicWandApplyTool(services: StudioToolServices): WebMcpTool {
  return defineTool({
    annotations: { readOnlyHint: false, untrustedContentHint: true },
    description:
      "Remove the currently visible Magic Wand selection and load the transparent PNG as a processed raster. Call only after preview_magic_wand_selection succeeded and the user asked to remove that region.",
    execute: async () => magicWandResult(await services.applyMagicWandSelection()),
    inputSchema: emptyObjectSchema,
    name: WebMcpToolName.ApplyMagicWandSelection,
  });
}

function deleteRunTool(services: StudioToolServices): WebMcpTool {
  return defineTool({
    annotations: { readOnlyHint: false, untrustedContentHint: true },
    description: "Delete one History run from the current browser session and release its SVG.",
    execute: (input: unknown) => {
      const runId = readRunId(input);
      if (runId === undefined) {
        return invalidInput("runId must be a positive integer.");
      }
      return services.removeRun(runId) ? success({ deletedRunId: runId }) : missingRun(runId);
    },
    inputSchema: runSchema,
    name: WebMcpToolName.DeleteHistoryRun,
  });
}

function readWorkspaceTool(services: StudioToolServices): WebMcpTool {
  return defineTool({
    annotations: { readOnlyHint: true, untrustedContentHint: true },
    description: "Read the visible image, options, History, A/B selection, and local model states.",
    execute: () =>
      JSON.stringify({
        comparison: comparedRunIds(services.readComparedRuns()),
        history: services.readRuns().map(runSummary),
        image: imageSummary(services.readImage()),
        models: services.readModels().map(modelSummary),
        options: services.readOptions(),
      }),
    inputSchema: emptyObjectSchema,
    name: WebMcpToolName.GetWorkspaceState,
  });
}

function selectRunTool(services: StudioToolServices): WebMcpTool {
  return defineTool({
    annotations: { readOnlyHint: false, untrustedContentHint: true },
    description: "Select and visibly display one immutable History run by its session ID.",
    execute: (input: unknown) => {
      const runId = readRunId(input);
      if (runId === undefined) {
        return invalidInput("runId must be a positive integer.");
      }
      const run = services.selectRun(runId);
      return run ? success({ run: runSummary(run) }) : missingRun(runId);
    },
    inputSchema: runSchema,
    name: WebMcpToolName.SelectHistoryRun,
  });
}

function compareTool(services: StudioToolServices, slot: CompareSlot, name: string): WebMcpTool {
  return defineTool({
    annotations: { readOnlyHint: false, untrustedContentHint: true },
    description: `Assign the raster original, current processed raster, or one History run to visible comparison slot ${slot.toUpperCase()}.`,
    execute: (input: unknown) => {
      if (
        isRecord(input) &&
        input.original === true &&
        input.processed !== true &&
        input.runId === undefined
      ) {
        return services.assignOriginalComparison(slot)
          ? success({ source: "original", slot })
          : failure("original_not_found", "Es ist kein Rasteroriginal geladen.");
      }
      if (
        isRecord(input) &&
        input.processed === true &&
        input.original !== true &&
        input.runId === undefined
      ) {
        return services.assignProcessedComparison(slot)
          ? success({ source: "processed", slot })
          : failure("processed_not_found", "Es ist kein verarbeitetes Raster geladen.");
      }
      const runId = readRunId(input);
      if (runId === undefined) {
        return invalidInput("Use exactly one of runId, original: true, or processed: true.");
      }
      const run = services.assignComparison(slot, runId);
      return run ? success({ run: runSummary(run), slot }) : missingRun(runId);
    },
    inputSchema: comparisonSchema,
    name,
  });
}

function downloadTool(services: StudioToolServices): WebMcpTool {
  return defineTool({
    annotations: { readOnlyHint: false, untrustedContentHint: true },
    description: "Download the SVG currently displayed by the selected History run.",
    execute: () =>
      services.downloadSelectedSvg()
        ? success({ downloaded: true })
        : failure("no_selected_svg", "Es ist kein SVG zum Herunterladen ausgewählt."),
    inputSchema: emptyObjectSchema,
    name: WebMcpToolName.DownloadSelectedSvg,
  });
}

function modelTool(
  services: StudioToolServices,
  modelIds: readonly BrowserModelId[],
  action: "load" | "retry" | "unload",
  name: string,
): WebMcpTool {
  return defineTool({
    annotations: { readOnlyHint: false, untrustedContentHint: false },
    description: `${action} one declared local AI model through the visible model manager.`,
    execute: async (input: unknown) => {
      const modelId = readModelId(input, modelIds);
      if (!modelId) {
        return invalidInput(`modelId must be ${modelIds.join(" or ")}.`);
      }
      const operation =
        action === "load"
          ? services.loadModel
          : action === "retry"
            ? services.retryModel
            : services.unloadModel;
      const snapshot = await operation(modelId);
      if (snapshot.state.status === "error") {
        return failure("model_error", snapshot.state.message);
      }
      const expectedStatus = action === "unload" ? "not-loaded" : "ready";
      if (snapshot.state.status !== expectedStatus) {
        return failure(
          "model_state",
          `Das Modell endete in Zustand ${snapshot.state.status} statt ${expectedStatus}.`,
        );
      }
      return success({ model: modelSummary(snapshot) });
    },
    inputSchema: modelSchema(modelIds),
    name,
  });
}

function backgroundRemovalTool(services: StudioToolServices): WebMcpTool {
  return defineTool({
    annotations: { readOnlyHint: false, untrustedContentHint: true },
    description: "Apply local MODNet background removal and visibly load its versioned PNG result.",
    execute: async () => actionResult(await services.removeBackground()),
    inputSchema: emptyObjectSchema,
    name: WebMcpToolName.ApplyBackgroundRemoval,
  });
}

function smartSelectionTool(services: StudioToolServices): WebMcpTool {
  return defineTool({
    annotations: { readOnlyHint: false, untrustedContentHint: true },
    description:
      "Apply local SlimSAM using normalized positive and negative image points and load the PNG.",
    execute: async (input: unknown) => {
      const request = readSmartSelection(input);
      return request
        ? actionResult(await services.applySmartSelection(request))
        : invalidInput("Use two positive points, one negative point, and coordinates from 0 to 1.");
    },
    inputSchema: smartSelectionSchema,
    name: WebMcpToolName.ApplySmartSelection,
  });
}

function defineTool(tool: WebMcpTool): WebMcpTool {
  return Object.freeze({ ...tool, annotations: Object.freeze({ ...tool.annotations }) });
}

function readRunId(input: unknown): number | undefined {
  if (!isRecord(input) || !Number.isSafeInteger(input.runId) || Number(input.runId) < 1) {
    return undefined;
  }
  return Number(input.runId);
}

function modelSchema(modelIds: readonly BrowserModelId[]): Readonly<Record<string, unknown>> {
  return Object.freeze({
    additionalProperties: false,
    properties: Object.freeze({
      modelId: Object.freeze({ enum: Object.freeze([...modelIds]), type: "string" }),
    }),
    required: Object.freeze(["modelId"]),
    type: "object",
  });
}

function readModelId(
  input: unknown,
  modelIds: readonly BrowserModelId[],
): BrowserModelId | undefined {
  if (!isRecord(input)) {
    return undefined;
  }
  return modelIds.find((modelId) => modelId === input.modelId);
}

function readSmartSelection(input: unknown): SmartSelectionRequest | undefined {
  if (
    !isRecord(input) ||
    !Array.isArray(input.positivePoints) ||
    !Array.isArray(input.negativePoints)
  ) {
    return undefined;
  }
  const positivePoints = readPoints(input.positivePoints, 2);
  const negativePoints = readPoints(input.negativePoints, 1);
  const polarity = input.polarity;
  if (
    !positivePoints ||
    !negativePoints ||
    (polarity !== MaskPolarity.Selected && polarity !== MaskPolarity.Inverted)
  ) {
    return undefined;
  }
  return { negativePoints, polarity, positivePoints };
}

function readMagicWandRequest(input: unknown): MagicWandPreviewRequest | undefined {
  if (
    !isRecord(input) ||
    (input.source !== "original" && input.source !== "processed") ||
    !withinUnit(input.x) ||
    !withinUnit(input.y) ||
    typeof input.sensitivityPercent !== "number" ||
    !Number.isFinite(input.sensitivityPercent) ||
    input.sensitivityPercent < 0 ||
    input.sensitivityPercent > 100
  ) {
    return undefined;
  }
  return Object.freeze({
    sensitivityPercent: input.sensitivityPercent,
    source: input.source,
    x: input.x,
    y: input.y,
  });
}

function readPoints(
  input: readonly unknown[],
  minimum: number,
): readonly NormalizedImagePoint[] | undefined {
  if (input.length < minimum) {
    return undefined;
  }
  const points: NormalizedImagePoint[] = [];
  for (const value of input) {
    if (!isRecord(value) || !withinUnit(value.x) || !withinUnit(value.y)) {
      return undefined;
    }
    points.push(Object.freeze({ x: value.x, y: value.y }));
  }
  return Object.freeze(points);
}

function withinUnit(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1;
}

function imageSummary(image: LoadedImage | undefined): Record<string, unknown> {
  return image
    ? {
        fileName: image.file.name,
        heightPixels: image.metadata.heightPixels,
        loaded: true,
        sizeBytes: image.metadata.sizeBytes,
        version: image.version,
        widthPixels: image.metadata.widthPixels,
      }
    : { loaded: false };
}

function runSummary(run: ConversionRun): Record<string, unknown> {
  return {
    fileName: run.fileName,
    heightPixels: run.heightPixels,
    id: run.id,
    inputVersion: run.inputVersion,
    sizeBytes: utf8ByteLength(run.svg),
    widthPixels: run.widthPixels,
  };
}

function modelSummary(snapshot: ModelRegistrySnapshot): Record<string, unknown> {
  return { id: snapshot.model.id, ...snapshot.state };
}

function comparedRunIds(
  compared: ComparedRuns,
): Record<string, number | "draft" | "original" | "processed"> {
  return {
    ...(compared.a ? { a: comparisonSourceId(compared.a) } : {}),
    ...(compared.b ? { b: comparisonSourceId(compared.b) } : {}),
  };
}

function comparisonSourceId(
  source: NonNullable<ComparedRuns["a"]>,
): number | "draft" | "original" | "processed" {
  switch (source.kind) {
    case ComparisonSourceKind.Draft:
      return "draft";
    case ComparisonSourceKind.Original:
      return "original";
    case ComparisonSourceKind.Processed:
      return "processed";
    case ComparisonSourceKind.Run:
      return source.run.id;
  }
}

function actionResult(result: AiActionResult): string {
  return result.ok
    ? success({ fileName: result.fileName })
    : failure("action_failed", result.message);
}

function magicWandResult(result: MagicWandApplyResult | MagicWandPreviewResult): string {
  return result.ok ? JSON.stringify(result) : failure("magic_wand_failed", result.message);
}

function success(result: Record<string, unknown>): string {
  return JSON.stringify({ ok: true, ...result });
}

function invalidInput(message: string): string {
  return failure("invalid_input", message);
}

function missingRun(runId: number): string {
  return failure("run_not_found", `Run ${String(runId)} wurde nicht gefunden.`);
}

function failure(code: string, message: string): string {
  return JSON.stringify({ code, message, ok: false });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
