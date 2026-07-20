import type { ConversionController } from "../conversion/conversion-controller";
import { createConversionOptions, type ConversionOptions } from "../conversion/conversion-options";
import {
  RasterDetailMode,
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

export interface ConversionToolServices {
  applyOptions(options: ConversionOptions): void;
  convert: ConversionController["convert"];
  readOptions(): ConversionOptions;
}

const configureSchema = Object.freeze({
  additionalProperties: false,
  properties: Object.freeze({
    colorPrecision: Object.freeze({ maximum: 8, minimum: 1, type: "integer" }),
    filterSpeckle: Object.freeze({ maximum: 1_000, minimum: 0, type: "integer" }),
    rasterDetailMode: Object.freeze({
      enum: Object.freeze(Object.values(RasterDetailMode)),
      type: "string",
    }),
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
  return Object.freeze([configureConversionTool(services), convertCurrentImageTool(services)]);
}

function configureConversionTool(services: ConversionToolServices): WebMcpTool {
  return Object.freeze({
    annotations: Object.freeze({ readOnlyHint: false, untrustedContentHint: false }),
    description:
      "Set visible raster preprocessing, color precision, speckle filter, path precision, and SVG scale. The Studio automatically refreshes its live preview with the same validation.",
    execute: (input: unknown) => {
      try {
        const values = requireConfigureInput(input);
        const currentOptions = services.readOptions();
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
    detailMode: readDetailMode(input.rasterDetailMode) ?? current.detailMode,
    filterMode: readFilterMode(input.rasterFilterMode) ?? current.filterMode,
    monochromeThreshold:
      input.monochromeThreshold === undefined
        ? current.monochromeThreshold
        : requireNumber(input.monochromeThreshold),
    resize,
  });
}

function readDetailMode(value: unknown): RasterDetailMode | undefined {
  if (value === undefined) {
    return undefined;
  }
  switch (value) {
    case RasterDetailMode.None:
      return RasterDetailMode.None;
    case RasterDetailMode.Sharpen:
      return RasterDetailMode.Sharpen;
    case RasterDetailMode.Smooth:
      return RasterDetailMode.Smooth;
    default:
      throw new TypeError("Raster detail mode is invalid.");
  }
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
        widthPixels: run.widthPixels,
      });
    },
    inputSchema: emptyObjectSchema,
    name: WebMcpToolName.ConvertCurrentImage,
  });
}

function requireConfigureInput(input: unknown): {
  colorPrecision: number;
  filterSpeckle: number;
  pathPrecision: number;
  scalePercent: number;
} {
  if (!isRecord(input)) {
    throw new TypeError("Conversion tool input must be an object.");
  }
  return {
    colorPrecision: requireNumber(input.colorPrecision),
    filterSpeckle: requireNumber(input.filterSpeckle),
    pathPrecision: requireNumber(input.pathPrecision),
    scalePercent: requireNumber(input.scalePercent),
  };
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
