import type { ConversionController } from "../conversion/conversion-controller";
import {
  CurveFittingMode,
  HierarchicalMode,
  createConversionOptions,
  type ConversionOptions,
} from "../conversion/conversion-options";
import {
  RasterFilterMode,
  RasterResizeKind,
  createRasterPreprocessingOptions,
  rasterScalePercentages,
  rasterTargetHeights,
  type RasterFilterMode as RasterFilterModeValue,
  type RasterPreprocessingOptions,
  type RasterResizeOptions,
} from "../conversion/raster-preprocessing";
import { WebMcpToolName, type WebMcpTool } from "./webmcp-adapter";
import { utf8ByteLength } from "../format-byte-size";

export interface ConversionToolServices {
  applyOptions(options: ConversionOptions): void;
  cancel: ConversionController["cancel"];
  convert: ConversionController["convert"];
  readOptions(): ConversionOptions;
}

const configureSchema = Object.freeze({
  additionalProperties: false,
  properties: Object.freeze({
    colorPrecision: Object.freeze({ maximum: 8, minimum: 1, type: "integer" }),
    cornerThreshold: Object.freeze({ maximum: 180, minimum: 0, type: "integer" }),
    curveFitting: Object.freeze({ enum: Object.values(CurveFittingMode), type: "string" }),
    filterSpeckle: Object.freeze({ maximum: 1_000, minimum: 0, type: "integer" }),
    hierarchical: Object.freeze({ enum: Object.values(HierarchicalMode), type: "string" }),
    layerDifference: Object.freeze({ maximum: 255, minimum: 0, type: "integer" }),
    lengthThreshold: Object.freeze({ maximum: 10, minimum: 3.5, type: "number" }),
    maxIterations: Object.freeze({ maximum: 20, minimum: 1, type: "integer" }),
    rasterSharpenStrength: Object.freeze({ maximum: 100, minimum: 0, type: "integer" }),
    rasterSmoothStrength: Object.freeze({ maximum: 100, minimum: 0, type: "integer" }),
    pathPrecision: Object.freeze({ maximum: 4, minimum: 0, type: "integer" }),
    monochromeThreshold: Object.freeze({ maximum: 255, minimum: 0, type: "integer" }),
    rasterFilterMode: Object.freeze({
      enum: Object.freeze(Object.values(RasterFilterMode)),
      type: "string",
    }),
    rasterResizePercent: Object.freeze({ enum: rasterScalePercentages, type: "integer" }),
    rasterTargetHeightPixels: Object.freeze({
      enum: rasterTargetHeights,
      type: "integer",
    }),
    scalePercent: Object.freeze({ maximum: 400, minimum: 10, type: "integer" }),
    spliceThreshold: Object.freeze({ maximum: 180, minimum: 0, type: "integer" }),
    useOriginalRasterSize: Object.freeze({ const: true, type: "boolean" }),
  }),
  required: Object.freeze(["colorPrecision", "filterSpeckle", "pathPrecision", "scalePercent"]),
  type: "object",
});

const emptyObjectSchema = Object.freeze({
  additionalProperties: false,
  properties: Object.freeze({}),
  type: "object",
});

export function createConversionTools(services: ConversionToolServices): readonly WebMcpTool[] {
  return Object.freeze([
    configureConversionTool(services),
    convertCurrentImageTool(services),
    cancelConversionTool(services),
  ]);
}

function cancelConversionTool(services: ConversionToolServices): WebMcpTool {
  return Object.freeze({
    annotations: Object.freeze({ readOnlyHint: false, untrustedContentHint: false }),
    description:
      "Cancel the pending or active SVG preview conversion and terminate its worker immediately. The preview can be restarted afterwards.",
    execute: () => JSON.stringify({ cancelled: services.cancel(), ok: true }),
    inputSchema: emptyObjectSchema,
    name: WebMcpToolName.CancelConversion,
  });
}

function configureConversionTool(services: ConversionToolServices): WebMcpTool {
  return Object.freeze({
    annotations: Object.freeze({ readOnlyHint: false, untrustedContentHint: false }),
    description:
      "Set visible raster preprocessing, all ten color-tracing parameters, and SVG scale. The Studio automatically refreshes its live preview with the same validation.",
    execute: (input: unknown) => {
      try {
        const currentOptions = services.readOptions();
        const values = requireConfigureInput(input, currentOptions);
        const options = createConversionOptions({
          ...currentOptions,
          ...values,
          preprocessing: readPreprocessingInput(input, currentOptions.preprocessing),
        });
        services.applyOptions(options);
        return JSON.stringify({ ok: true, options });
      } catch {
        return JSON.stringify({
          code: "invalid_options",
          message: "Die Konvertierungseinstellungen sind ungültig.",
          ok: false,
        });
      }
    },
    inputSchema: configureSchema,
    name: WebMcpToolName.ConfigureConversion,
  });
}

function readPreprocessingInput(
  input: unknown,
  current: RasterPreprocessingOptions,
): RasterPreprocessingOptions {
  if (!isRecord(input)) {
    throw new TypeError("Conversion tool input must be an object.");
  }
  const resizeInputs = [
    input.useOriginalRasterSize === true,
    input.rasterResizePercent !== undefined,
    input.rasterTargetHeightPixels !== undefined,
  ].filter(Boolean).length;
  if (resizeInputs > 1) {
    throw new TypeError("Choose one raster resize mode.");
  }
  const resize: RasterResizeOptions =
    input.useOriginalRasterSize === true
      ? { kind: RasterResizeKind.Original }
      : input.rasterResizePercent !== undefined
        ? {
            kind: RasterResizeKind.Percentage,
            percent: requireNumber(input.rasterResizePercent),
          }
        : input.rasterTargetHeightPixels !== undefined
          ? {
              heightPixels: requireNumber(input.rasterTargetHeightPixels),
              kind: RasterResizeKind.TargetHeight,
            }
          : current.resize;
  return createRasterPreprocessingOptions({
    filterMode: readFilterMode(input.rasterFilterMode) ?? current.filterMode,
    monochromeThreshold:
      input.monochromeThreshold === undefined
        ? current.monochromeThreshold
        : requireNumber(input.monochromeThreshold),
    resize,
    sharpenStrength:
      input.rasterSharpenStrength === undefined
        ? current.sharpenStrength
        : requireNumber(input.rasterSharpenStrength),
    smoothStrength:
      input.rasterSmoothStrength === undefined
        ? current.smoothStrength
        : requireNumber(input.rasterSmoothStrength),
  });
}

function readFilterMode(value: unknown): RasterFilterModeValue | undefined {
  if (value === undefined) {
    return undefined;
  }
  switch (value) {
    case RasterFilterMode.Color:
      return RasterFilterMode.Color;
    case RasterFilterMode.Grayscale:
      return RasterFilterMode.Grayscale;
    case RasterFilterMode.Monochrome:
      return RasterFilterMode.Monochrome;
    default:
      throw new TypeError("Raster filter is invalid.");
  }
}

function convertCurrentImageTool(services: ConversionToolServices): WebMcpTool {
  return Object.freeze({
    annotations: Object.freeze({ readOnlyHint: false, untrustedContentHint: true }),
    description:
      "Accept the latest visible SVG preview as an immutable History run. If needed, the Studio first refreshes the preview with the current image and parameters.",
    execute: async () => {
      const attempt = await services.convert();
      if (!attempt.ok) {
        return JSON.stringify(attempt);
      }
      const { run } = attempt;
      return JSON.stringify({
        fileName: run.fileName,
        heightPixels: run.heightPixels,
        inputVersion: run.inputVersion,
        ok: true,
        runId: run.id,
        sizeBytes: utf8ByteLength(run.svg),
        widthPixels: run.widthPixels,
      });
    },
    inputSchema: emptyObjectSchema,
    name: WebMcpToolName.ConvertCurrentImage,
  });
}

function requireConfigureInput(input: unknown, current: ConversionOptions): ConversionOptions {
  if (!isRecord(input)) {
    throw new TypeError("Conversion tool input must be an object.");
  }
  return {
    colorPrecision: requireNumber(input.colorPrecision),
    cornerThreshold: optionalNumber(input.cornerThreshold, current.cornerThreshold),
    curveFitting: optionalCurveFitting(input.curveFitting, current.curveFitting),
    filterSpeckle: requireNumber(input.filterSpeckle),
    hierarchical: optionalHierarchical(input.hierarchical, current.hierarchical),
    layerDifference: optionalNumber(input.layerDifference, current.layerDifference),
    lengthThreshold: optionalNumber(input.lengthThreshold, current.lengthThreshold),
    maxIterations: optionalNumber(input.maxIterations, current.maxIterations),
    pathPrecision: requireNumber(input.pathPrecision),
    preprocessing: current.preprocessing,
    scalePercent: requireNumber(input.scalePercent),
    shapeDetection: current.shapeDetection,
    spliceThreshold: optionalNumber(input.spliceThreshold, current.spliceThreshold),
  };
}

function optionalCurveFitting(value: unknown, fallback: CurveFittingMode): CurveFittingMode {
  if (value === undefined) {
    return fallback;
  }
  if (Object.values(CurveFittingMode).some((candidate) => candidate === value)) {
    return value as CurveFittingMode;
  }
  throw new TypeError("Curve fitting mode is invalid.");
}

function optionalHierarchical(value: unknown, fallback: HierarchicalMode): HierarchicalMode {
  if (value === undefined) {
    return fallback;
  }
  if (Object.values(HierarchicalMode).some((candidate) => candidate === value)) {
    return value as HierarchicalMode;
  }
  throw new TypeError("Hierarchical mode is invalid.");
}

function optionalNumber(value: unknown, fallback: number): number {
  return value === undefined ? fallback : requireNumber(value);
}

function requireNumber(value: unknown): number {
  if (typeof value !== "number") {
    throw new TypeError("Conversion tool values must be numbers.");
  }
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
