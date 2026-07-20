import { createLogoDemoOptions } from "../demo/logo-demo-profile";
import {
  createConversionOptions,
  defaultConversionOptions,
  type ConversionOptions,
} from "./conversion-options";
import {
  RasterDetailMode,
  RasterFilterMode,
  RasterResizeKind,
  type RasterResizeOptions,
} from "./raster-preprocessing";

export const ConversionPresetId = {
  Balanced: "balanced",
  Illustration: "illustration",
  Logo: "logo",
  Monochrome: "monochrome",
  Photo: "photo",
} as const;

export type ConversionPresetId = (typeof ConversionPresetId)[keyof typeof ConversionPresetId];

export const customConversionPresetId = "custom";

export interface ConversionPreset {
  readonly id: ConversionPresetId;
  readonly label: string;
  readonly options: Readonly<ConversionOptions>;
}

export const conversionPresets: readonly ConversionPreset[] = Object.freeze([
  preset(ConversionPresetId.Balanced, "Ausgewogen", defaultConversionOptions),
  preset(ConversionPresetId.Logo, "Logo / Icon", createLogoDemoOptions()),
  preset(
    ConversionPresetId.Illustration,
    "Illustration",
    options({ colorPrecision: 7, filterSpeckle: 8, pathPrecision: 1 }),
  ),
  preset(
    ConversionPresetId.Photo,
    "Foto / detailreich",
    options({
      colorPrecision: 8,
      detailMode: RasterDetailMode.Smooth,
      filterSpeckle: 4,
      pathPrecision: 2,
    }),
  ),
  preset(
    ConversionPresetId.Monochrome,
    "Schwarzweiß / Laser",
    options({
      colorPrecision: 1,
      filterMode: RasterFilterMode.Monochrome,
      filterSpeckle: 4,
      pathPrecision: 1,
    }),
  ),
]);

export function readConversionPreset(id: string): ConversionPreset {
  const selected = conversionPresets.find((candidate) => candidate.id === id);
  if (!selected) {
    throw new TypeError("Unknown conversion preset.");
  }
  return selected;
}

export function matchingConversionPresetId(
  options: Readonly<ConversionOptions>,
): ConversionPresetId | typeof customConversionPresetId {
  return (
    conversionPresets.find((preset) => sameOptions(preset.options, options))?.id ??
    customConversionPresetId
  );
}

function options({
  colorPrecision,
  detailMode = RasterDetailMode.None,
  filterMode = RasterFilterMode.Color,
  filterSpeckle,
  pathPrecision,
}: {
  readonly colorPrecision: number;
  readonly detailMode?: RasterDetailMode;
  readonly filterMode?: RasterFilterMode;
  readonly filterSpeckle: number;
  readonly pathPrecision: number;
}): ConversionOptions {
  return createConversionOptions({
    colorPrecision,
    filterSpeckle,
    pathPrecision,
    preprocessing: {
      detailMode,
      filterMode,
      monochromeThreshold: 128,
      resize: { kind: RasterResizeKind.Original },
    },
    scalePercent: 100,
  });
}

function preset(
  id: ConversionPresetId,
  label: string,
  options: Readonly<ConversionOptions>,
): ConversionPreset {
  return Object.freeze({ id, label, options });
}

function sameOptions(a: Readonly<ConversionOptions>, b: Readonly<ConversionOptions>): boolean {
  return (
    a.colorPrecision === b.colorPrecision &&
    a.filterSpeckle === b.filterSpeckle &&
    a.pathPrecision === b.pathPrecision &&
    a.scalePercent === b.scalePercent &&
    a.preprocessing.detailMode === b.preprocessing.detailMode &&
    a.preprocessing.filterMode === b.preprocessing.filterMode &&
    a.preprocessing.monochromeThreshold === b.preprocessing.monochromeThreshold &&
    sameResize(a.preprocessing.resize, b.preprocessing.resize) &&
    a.shapeDetection.enabled === b.shapeDetection.enabled &&
    a.shapeDetection.types.circle === b.shapeDetection.types.circle &&
    a.shapeDetection.types.ellipse === b.shapeDetection.types.ellipse &&
    a.shapeDetection.types.line === b.shapeDetection.types.line &&
    a.shapeDetection.types.polygon === b.shapeDetection.types.polygon &&
    a.shapeDetection.types.rectangle === b.shapeDetection.types.rectangle
  );
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
