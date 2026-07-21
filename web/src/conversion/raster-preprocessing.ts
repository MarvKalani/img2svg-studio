import { ConversionFailure, ConversionFailureCode } from "./conversion-failure";
import type { PixelDimensions } from "./conversion-options";

export const RasterFilterMode = {
  Color: "color",
  Grayscale: "grayscale",
  Monochrome: "monochrome",
} as const;

export type RasterFilterMode = (typeof RasterFilterMode)[keyof typeof RasterFilterMode];

export const RasterResizeKind = {
  Original: "original",
  Percentage: "percentage",
  TargetHeight: "target-height",
} as const;

export type RasterResizeOptions =
  | { readonly kind: typeof RasterResizeKind.Original }
  | { readonly kind: typeof RasterResizeKind.Percentage; readonly percent: number }
  | { readonly heightPixels: number; readonly kind: typeof RasterResizeKind.TargetHeight };

export interface RasterDetailOptions {
  readonly sharpenStrength: number;
  readonly smoothStrength: number;
}

export interface RasterPreprocessingOptions extends RasterDetailOptions {
  readonly filterMode: RasterFilterMode;
  readonly monochromeThreshold: number;
  readonly resize: RasterResizeOptions;
}

export const rasterTargetHeights = Object.freeze([576, 720, 1080, 2160] as const);
export const rasterScalePercentages = Object.freeze([25, 50, 75, 125, 150, 200, 400] as const);

export interface RasterResizePreset {
  readonly id: string;
  readonly label: string;
  readonly resize: RasterResizeOptions;
}

export const rasterResizePresets: readonly RasterResizePreset[] = Object.freeze([
  preset("original", "Originalgröße", { kind: RasterResizeKind.Original }),
  ...rasterScalePercentages.map((percent) =>
    preset(`percent-${String(percent)}`, `${String(percent)} %`, {
      kind: RasterResizeKind.Percentage,
      percent,
    }),
  ),
  preset("height-576", "576 px Höhe", {
    heightPixels: 576,
    kind: RasterResizeKind.TargetHeight,
  }),
  preset("height-720", "720 px Höhe · HD", {
    heightPixels: 720,
    kind: RasterResizeKind.TargetHeight,
  }),
  preset("height-1080", "1080 px Höhe · Full HD", {
    heightPixels: 1080,
    kind: RasterResizeKind.TargetHeight,
  }),
  preset("height-2160", "2160 px Höhe · UHD", {
    heightPixels: 2160,
    kind: RasterResizeKind.TargetHeight,
  }),
]);

export const defaultRasterPreprocessingOptions: RasterPreprocessingOptions = Object.freeze({
  filterMode: RasterFilterMode.Color,
  monochromeThreshold: 128,
  resize: Object.freeze({ kind: RasterResizeKind.Original }),
  sharpenStrength: 0,
  smoothStrength: 0,
});

const maximumPreparedPixelCount = 16_777_216;

export function createRasterPreprocessingOptions(
  input: RasterPreprocessingOptions,
): RasterPreprocessingOptions {
  if (
    !Object.values(RasterFilterMode).includes(input.filterMode) ||
    !Number.isInteger(input.monochromeThreshold) ||
    input.monochromeThreshold < 0 ||
    input.monochromeThreshold > 255 ||
    !isPercentage(input.sharpenStrength) ||
    !isPercentage(input.smoothStrength)
  ) {
    throw new ConversionFailure(ConversionFailureCode.InvalidOptions);
  }

  return Object.freeze({
    filterMode: input.filterMode,
    monochromeThreshold: input.monochromeThreshold,
    resize: validateResize(input.resize),
    sharpenStrength: input.sharpenStrength,
    smoothStrength: input.smoothStrength,
  });
}

export function readRasterResizePreset(presetId: string): RasterResizeOptions {
  const preset = rasterResizePresets.find((candidate) => candidate.id === presetId);
  if (!preset) {
    throw new ConversionFailure(ConversionFailureCode.InvalidOptions);
  }
  return preset.resize;
}

export function rasterResizePresetId(resize: RasterResizeOptions): string {
  const preset = rasterResizePresets.find((candidate) => sameResize(candidate.resize, resize));
  if (!preset) {
    throw new ConversionFailure(ConversionFailureCode.InvalidOptions);
  }
  return preset.id;
}

export function formatRasterFilter(mode: RasterFilterMode): string {
  const labels: Record<RasterFilterMode, string> = {
    [RasterFilterMode.Color]: "Farbe",
    [RasterFilterMode.Grayscale]: "Graustufen",
    [RasterFilterMode.Monochrome]: "Schwarzweiß",
  };
  return labels[mode];
}

export function formatRasterResize(resize: RasterResizeOptions): string {
  return (
    rasterResizePresets.find((preset) => sameResize(preset.resize, resize))?.label ?? "Ungültig"
  );
}

export function preprocessedDimensions(
  sourceWidthPixels: number,
  sourceHeightPixels: number,
  options: RasterPreprocessingOptions,
): PixelDimensions {
  if (
    !Number.isSafeInteger(sourceWidthPixels) ||
    !Number.isSafeInteger(sourceHeightPixels) ||
    sourceWidthPixels < 1 ||
    sourceHeightPixels < 1
  ) {
    throw new ConversionFailure(ConversionFailureCode.InvalidDimensions);
  }

  const dimensions = resizeDimensions(sourceWidthPixels, sourceHeightPixels, options.resize);
  if (dimensions.widthPixels * dimensions.heightPixels > maximumPreparedPixelCount) {
    throw new ConversionFailure(ConversionFailureCode.InvalidDimensions);
  }
  return dimensions;
}

export function applyRasterFilter(
  sourceRgba: Uint8Array,
  options: RasterPreprocessingOptions,
): Uint8Array<ArrayBuffer> {
  if (sourceRgba.length % 4 !== 0) {
    throw new ConversionFailure(ConversionFailureCode.PixelLength);
  }
  const rgba = new Uint8Array(sourceRgba);
  if (options.filterMode === RasterFilterMode.Color) {
    return rgba;
  }

  for (let offset = 0; offset < rgba.length; offset += 4) {
    const luminance =
      (77 * rgba[offset]! + 150 * rgba[offset + 1]! + 29 * rgba[offset + 2]! + 128) >> 8;
    const value =
      options.filterMode === RasterFilterMode.Monochrome
        ? luminance >= options.monochromeThreshold
          ? 255
          : 0
        : luminance;
    rgba[offset] = value;
    rgba[offset + 1] = value;
    rgba[offset + 2] = value;
  }
  return rgba;
}

export function applyRasterDetail(
  sourceRgba: Uint8Array,
  widthPixels: number,
  heightPixels: number,
  options: Readonly<RasterDetailOptions>,
): Uint8Array<ArrayBuffer> {
  const expectedLength = widthPixels * heightPixels * 4;
  if (
    !Number.isSafeInteger(widthPixels) ||
    !Number.isSafeInteger(heightPixels) ||
    widthPixels < 1 ||
    heightPixels < 1 ||
    sourceRgba.length !== expectedLength
  ) {
    throw new ConversionFailure(ConversionFailureCode.PixelLength);
  }
  if (options.smoothStrength === 0 && options.sharpenStrength === 0) {
    return new Uint8Array(sourceRgba);
  }

  let prepared = new Uint8Array(sourceRgba);
  if (options.smoothStrength > 0) {
    prepared = blendRgb(
      prepared,
      gaussianBlur(prepared, widthPixels, heightPixels),
      options.smoothStrength / 100,
    );
  }
  if (options.sharpenStrength === 0) {
    return prepared;
  }

  const blurred = gaussianBlur(prepared, widthPixels, heightPixels);
  const sharpened = new Uint8Array(prepared);
  for (let offset = 0; offset < prepared.length; offset += 4) {
    for (let channel = 0; channel < 3; channel += 1) {
      const source = prepared[offset + channel]!;
      sharpened[offset + channel] = clampChannel(
        source + (source - blurred[offset + channel]!) * (options.sharpenStrength / 100),
      );
    }
  }
  return sharpened;
}

function blendRgb(
  sourceRgba: Uint8Array,
  targetRgba: Uint8Array,
  targetWeight: number,
): Uint8Array<ArrayBuffer> {
  const blended = new Uint8Array(sourceRgba);
  for (let offset = 0; offset < sourceRgba.length; offset += 4) {
    for (let channel = 0; channel < 3; channel += 1) {
      const source = sourceRgba[offset + channel]!;
      blended[offset + channel] = clampChannel(
        source + (targetRgba[offset + channel]! - source) * targetWeight,
      );
    }
  }
  return blended;
}

function gaussianBlur(
  sourceRgba: Uint8Array,
  widthPixels: number,
  heightPixels: number,
): Uint8Array<ArrayBuffer> {
  const target = new Uint8Array(sourceRgba.length);
  const weights = [1, 2, 1] as const;
  for (let y = 0; y < heightPixels; y += 1) {
    for (let x = 0; x < widthPixels; x += 1) {
      const targetOffset = (y * widthPixels + x) * 4;
      for (let channel = 0; channel < 3; channel += 1) {
        let weightedChannel = 0;
        for (let kernelY = -1; kernelY <= 1; kernelY += 1) {
          for (let kernelX = -1; kernelX <= 1; kernelX += 1) {
            const sourceX = Math.min(widthPixels - 1, Math.max(0, x + kernelX));
            const sourceY = Math.min(heightPixels - 1, Math.max(0, y + kernelY));
            const sourceOffset = (sourceY * widthPixels + sourceX) * 4;
            weightedChannel +=
              sourceRgba[sourceOffset + channel]! * weights[kernelX + 1]! * weights[kernelY + 1]!;
          }
        }
        target[targetOffset + channel] = Math.round(weightedChannel / 16);
      }
      target[targetOffset + 3] = sourceRgba[targetOffset + 3]!;
    }
  }
  return target;
}

function clampChannel(value: number): number {
  return Math.min(255, Math.max(0, Math.round(value)));
}

function isPercentage(value: number): boolean {
  return Number.isInteger(value) && value >= 0 && value <= 100;
}

function validateResize(resize: RasterResizeOptions): RasterResizeOptions {
  switch (resize.kind) {
    case RasterResizeKind.Original:
      return Object.freeze({ kind: resize.kind });
    case RasterResizeKind.Percentage:
      if (!rasterScalePercentages.some((percent) => percent === resize.percent)) {
        throw new ConversionFailure(ConversionFailureCode.InvalidOptions);
      }
      return Object.freeze({ kind: resize.kind, percent: resize.percent });
    case RasterResizeKind.TargetHeight:
      if (!rasterTargetHeights.some((height) => height === resize.heightPixels)) {
        throw new ConversionFailure(ConversionFailureCode.InvalidOptions);
      }
      return Object.freeze({ heightPixels: resize.heightPixels, kind: resize.kind });
  }
}

function resizeDimensions(
  sourceWidthPixels: number,
  sourceHeightPixels: number,
  resize: RasterResizeOptions,
): PixelDimensions {
  switch (resize.kind) {
    case RasterResizeKind.Original:
      return { heightPixels: sourceHeightPixels, widthPixels: sourceWidthPixels };
    case RasterResizeKind.Percentage:
      return {
        heightPixels: Math.max(1, Math.round((sourceHeightPixels * resize.percent) / 100)),
        widthPixels: Math.max(1, Math.round((sourceWidthPixels * resize.percent) / 100)),
      };
    case RasterResizeKind.TargetHeight:
      return {
        heightPixels: resize.heightPixels,
        widthPixels: Math.max(
          1,
          Math.round((sourceWidthPixels * resize.heightPixels) / sourceHeightPixels),
        ),
      };
  }
}

function preset(id: string, label: string, resize: RasterResizeOptions): RasterResizePreset {
  return Object.freeze({ id, label, resize: validateResize(resize) });
}

function sameResize(a: RasterResizeOptions, b: RasterResizeOptions): boolean {
  if (a.kind !== b.kind) {
    return false;
  }
  switch (a.kind) {
    case RasterResizeKind.Original:
      return true;
    case RasterResizeKind.Percentage:
      return b.kind === RasterResizeKind.Percentage && a.percent === b.percent;
    case RasterResizeKind.TargetHeight:
      return b.kind === RasterResizeKind.TargetHeight && a.heightPixels === b.heightPixels;
  }
}
