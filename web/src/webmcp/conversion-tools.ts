import type { ConversionController } from "../conversion/conversion-controller";
import { createConversionOptions, type ConversionOptions } from "../conversion/conversion-options";
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
    scalePercent: Object.freeze({ maximum: 400, minimum: 10, type: "integer" }),
  }),
  required: Object.freeze(["colorPrecision", "filterSpeckle", "scalePercent"]),
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
      "Set visible color precision, speckle filter, and scale using the same Studio validation.",
    execute: (input: unknown) => {
      try {
        const values = requireConfigureInput(input);
        const options = createConversionOptions({
          ...services.readOptions(),
          ...values,
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

function convertCurrentImageTool(services: ConversionToolServices): WebMcpTool {
  return Object.freeze({
    annotations: Object.freeze({ readOnlyHint: false, untrustedContentHint: true }),
    description: "Convert the loaded image through the visible Studio workflow and create a run.",
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
  scalePercent: number;
} {
  if (!isRecord(input)) {
    throw new TypeError("Conversion tool input must be an object.");
  }
  return {
    colorPrecision: requireNumber(input.colorPrecision),
    filterSpeckle: requireNumber(input.filterSpeckle),
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
