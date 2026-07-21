import { readFileSync } from "node:fs";

import sharp from "sharp";

import {
  convert_rgba as convertRgba,
  initSync as initializeWasmModule,
} from "../../web/src/wasm-pkg/img2svg_wasm.js";
import {
  createVectorizeOptions,
  type DetailLevel,
  type VectorizeMode,
} from "./vectorize-options.js";

const maximumEncodedBytes = 25 * 1024 * 1024;
const maximumDecodedPixels = 16_777_216;
const wasmBinaryUrl = new URL("../../web/src/wasm-pkg/img2svg_wasm_bg.wasm", import.meta.url);

export type VectorizeErrorCode =
  | "conversion_failed"
  | "image_too_large"
  | "invalid_image"
  | "invalid_image_input"
  | "invalid_parameters";

export class VectorizeError extends Error {
  readonly code: VectorizeErrorCode;

  constructor(code: VectorizeErrorCode, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "VectorizeError";
    this.code = code;
  }
}

export interface RasterImageInput {
  imageBase64?: string;
  imageBytes?: Uint8Array;
}

export interface VectorizeRequest extends RasterImageInput {
  colorCount: number;
  detailLevel: DetailLevel;
  mode: VectorizeMode;
  scalePercent?: number;
}

export interface VectorizeResult extends Record<string, unknown> {
  parameters: Readonly<{
    colorCount: number;
    detailLevel: DetailLevel;
    mode: VectorizeMode;
    scalePercent: number;
  }>;
  stats: Readonly<{
    byteSize: number;
    circleCount: number;
    ellipseCount: number;
    heightPixels: number;
    lineCount: number;
    outputHeightPixels: number;
    outputWidthPixels: number;
    pathCount: number;
    polygonCount: number;
    rectangleCount: number;
    widthPixels: number;
  }>;
  svg: string;
}

let wasmReady = false;
const vtracerDefaults = Object.freeze({
  cornerThresholdDegrees: 60,
  curveFittingModeCode: 2,
  hierarchicalModeCode: 0,
  layerDifference: 16,
  lengthThresholdTenths: 40,
  maxIterations: 10,
  spliceThresholdDegrees: 45,
});

export async function vectorizeImage(request: VectorizeRequest): Promise<VectorizeResult> {
  let options;
  try {
    options = createVectorizeOptions(request);
  } catch (error) {
    throw new VectorizeError("invalid_parameters", "Conversion parameters are invalid.", {
      cause: error,
    });
  }

  const encodedImage = readEncodedImage(request);
  const decoded = await decodeAndQuantize(encodedImage, options.colorCount);
  initializeWasm();

  let svg: string;
  try {
    svg = convertRgba(
      decoded.rgba,
      decoded.widthPixels,
      decoded.heightPixels,
      options.colorPrecision,
      options.filterSpeckle,
      options.pathPrecision,
      vtracerDefaults.hierarchicalModeCode,
      vtracerDefaults.curveFittingModeCode,
      vtracerDefaults.layerDifference,
      vtracerDefaults.cornerThresholdDegrees,
      vtracerDefaults.lengthThresholdTenths,
      vtracerDefaults.maxIterations,
      vtracerDefaults.spliceThresholdDegrees,
      options.scalePercent,
      options.shapeDetectionFlags,
    );
  } catch (error) {
    throw new VectorizeError("conversion_failed", "The image could not be vectorized.", {
      cause: error,
    });
  }

  return Object.freeze({
    parameters: Object.freeze({
      colorCount: options.colorCount,
      detailLevel: options.detailLevel,
      mode: options.mode,
      scalePercent: options.scalePercent,
    }),
    stats: readSvgStatistics(svg, decoded.widthPixels, decoded.heightPixels),
    svg,
  });
}

export function readEncodedImage(request: RasterImageInput): Uint8Array {
  const suppliedInputs =
    Number(request.imageBytes !== undefined) + Number(request.imageBase64 !== undefined);
  if (suppliedInputs !== 1) {
    throw new VectorizeError(
      "invalid_image_input",
      "Provide exactly one image file or Base64 image.",
    );
  }

  const bytes = request.imageBytes ?? decodeBase64(request.imageBase64 ?? "");
  if (bytes.byteLength > maximumEncodedBytes) {
    throw new VectorizeError("image_too_large", "The encoded image exceeds 25 MB.");
  }
  if (bytes.byteLength === 0) {
    throw new VectorizeError("invalid_image", "The image is empty.");
  }
  return bytes;
}

export async function decodeRasterImage(encodedImage: Uint8Array): Promise<{
  heightPixels: number;
  rgba: Uint8Array;
  widthPixels: number;
}> {
  try {
    const { data, info } = await sharp(encodedImage, {
      failOn: "warning",
      limitInputPixels: maximumDecodedPixels,
    })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    if (info.width * info.height > maximumDecodedPixels) {
      throw new VectorizeError("image_too_large", "The decoded image exceeds 16,777,216 pixels.");
    }
    return { heightPixels: info.height, rgba: data, widthPixels: info.width };
  } catch (error) {
    if (error instanceof VectorizeError) {
      throw error;
    }
    throw new VectorizeError("invalid_image", "The image format or contents are invalid.", {
      cause: error,
    });
  }
}

function decodeBase64(value: string): Uint8Array {
  if (!isCanonicalBase64(value)) {
    throw new VectorizeError("invalid_image", "The Base64 image is invalid.");
  }
  return Buffer.from(value, "base64");
}

function isCanonicalBase64(value: string): boolean {
  return (
    value.length > 0 &&
    value.length % 4 === 0 &&
    /^(?:[A-Za-z\d+/]{4})*(?:[A-Za-z\d+/]{2}==|[A-Za-z\d+/]{3}=)?$/u.test(value)
  );
}

async function decodeAndQuantize(
  encodedImage: Uint8Array,
  colorCount: number,
): Promise<{ heightPixels: number; rgba: Uint8Array; widthPixels: number }> {
  try {
    const palettePng = await sharp(encodedImage, {
      failOn: "warning",
      limitInputPixels: maximumDecodedPixels,
    })
      .png({ colours: colorCount, dither: 0, palette: true })
      .toBuffer();
    const { data, info } = await sharp(palettePng, { limitInputPixels: maximumDecodedPixels })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    if (info.width * info.height > maximumDecodedPixels) {
      throw new VectorizeError("image_too_large", "The decoded image exceeds 16,777,216 pixels.");
    }
    return { heightPixels: info.height, rgba: data, widthPixels: info.width };
  } catch (error) {
    if (error instanceof VectorizeError) {
      throw error;
    }
    throw new VectorizeError("invalid_image", "The image format or contents are invalid.", {
      cause: error,
    });
  }
}

function initializeWasm(): void {
  if (wasmReady) {
    return;
  }
  initializeWasmModule({ module: readFileSync(wasmBinaryUrl) });
  wasmReady = true;
}

function readSvgStatistics(
  svg: string,
  widthPixels: number,
  heightPixels: number,
): VectorizeResult["stats"] {
  return Object.freeze({
    byteSize: Buffer.byteLength(svg),
    circleCount: countElements(svg, "circle"),
    ellipseCount: countElements(svg, "ellipse"),
    heightPixels,
    lineCount: countElements(svg, "line"),
    outputHeightPixels: readRootDimension(svg, "height"),
    outputWidthPixels: readRootDimension(svg, "width"),
    pathCount: countElements(svg, "path"),
    polygonCount: countElements(svg, "polygon"),
    rectangleCount: countElements(svg, "rect"),
    widthPixels,
  });
}

function countElements(svg: string, elementName: string): number {
  return [...svg.matchAll(new RegExp(`<${elementName}(?:\\s|>)`, "gu"))].length;
}

function readRootDimension(svg: string, name: "height" | "width"): number {
  const value = new RegExp(`^<svg\\b[^>]*\\s${name}="([0-9.]+)"`, "u").exec(svg)?.[1];
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new VectorizeError("conversion_failed", `The SVG has no valid ${name}.`);
  }
  return parsed;
}
