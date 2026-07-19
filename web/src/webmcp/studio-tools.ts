import type { AiActionResult } from "../ai/ai-action-result";
import { MaskPolarity } from "../ai/sam-selection";
import type { NormalizedImagePoint, SmartSelectionRequest } from "../ai/smart-select-controller";
import type { BrowserModelId } from "../ai/model-manifest";
import type { ModelRegistrySnapshot } from "../ai/model-registry";
import type { ComparedRuns, CompareSlot } from "../compare/compare-selection";
import type { ConversionOptions } from "../conversion/conversion-options";
import type { ConversionRun } from "../history/history-store";
import type { LoadedImage } from "../image/image-store";
import { WebMcpToolName, type WebMcpTool } from "./webmcp-adapter";

export interface StudioToolServices {
  applySmartSelection(request: SmartSelectionRequest): Promise<AiActionResult>;
  assignComparison(slot: CompareSlot, runId: number): ConversionRun | undefined;
  downloadSelectedSvg(): boolean;
  loadModel(modelId: BrowserModelId): Promise<ModelRegistrySnapshot>;
  readComparedRuns(): ComparedRuns;
  readImage(): LoadedImage | undefined;
  readModels(): readonly ModelRegistrySnapshot[];
  readOptions(): ConversionOptions;
  readRuns(): readonly ConversionRun[];
  removeBackground(): Promise<AiActionResult>;
  retryModel(modelId: BrowserModelId): Promise<ModelRegistrySnapshot>;
  selectRun(runId: number): ConversionRun | undefined;
  unloadModel(modelId: BrowserModelId): Promise<ModelRegistrySnapshot>;
}

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

const modelSchema = Object.freeze({
  additionalProperties: false,
  properties: Object.freeze({
    modelId: Object.freeze({ enum: Object.freeze(["modnet", "slimsam"]), type: "string" }),
  }),
  required: Object.freeze(["modelId"]),
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

export function createStudioTools(services: StudioToolServices): readonly WebMcpTool[] {
  return Object.freeze([
    readWorkspaceTool(services),
    selectRunTool(services),
    compareTool(services, "a", WebMcpToolName.SelectComparisonA),
    compareTool(services, "b", WebMcpToolName.SelectComparisonB),
    downloadTool(services),
    modelTool(services, "load", WebMcpToolName.LoadModel),
    modelTool(services, "retry", WebMcpToolName.RetryModel),
    modelTool(services, "unload", WebMcpToolName.UnloadModel),
    backgroundRemovalTool(services),
    smartSelectionTool(services),
  ]);
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
    description: `Assign one History run to visible comparison slot ${slot.toUpperCase()}.`,
    execute: (input: unknown) => {
      const runId = readRunId(input);
      if (runId === undefined) {
        return invalidInput("runId must be a positive integer.");
      }
      const run = services.assignComparison(slot, runId);
      return run ? success({ run: runSummary(run), slot }) : missingRun(runId);
    },
    inputSchema: runSchema,
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
  action: "load" | "retry" | "unload",
  name: string,
): WebMcpTool {
  return defineTool({
    annotations: { readOnlyHint: false, untrustedContentHint: false },
    description: `${action} one declared local AI model through the visible model manager.`,
    execute: async (input: unknown) => {
      const modelId = readModelId(input);
      if (!modelId) {
        return invalidInput("modelId must be modnet or slimsam.");
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
    inputSchema: modelSchema,
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

function readModelId(input: unknown): BrowserModelId | undefined {
  if (!isRecord(input)) {
    return undefined;
  }
  return input.modelId === "modnet" || input.modelId === "slimsam" ? input.modelId : undefined;
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
    widthPixels: run.widthPixels,
  };
}

function modelSummary(snapshot: ModelRegistrySnapshot): Record<string, unknown> {
  return { id: snapshot.model.id, ...snapshot.state };
}

function comparedRunIds(compared: ComparedRuns): Record<string, number> {
  return {
    ...(compared.a ? { a: compared.a.id } : {}),
    ...(compared.b ? { b: compared.b.id } : {}),
  };
}

function actionResult(result: AiActionResult): string {
  return result.ok
    ? success({ fileName: result.fileName })
    : failure("action_failed", result.message);
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
