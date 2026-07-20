import { createConversionOptions, type ConversionOptions } from "../conversion/conversion-options";
import {
  RasterDetailMode,
  RasterFilterMode,
  RasterResizeKind,
} from "../conversion/raster-preprocessing";

export function createTopographyDemoOptions(): ConversionOptions {
  return createConversionOptions({
    colorPrecision: 6,
    filterSpeckle: 12,
    pathPrecision: 1,
    preprocessing: {
      detailMode: RasterDetailMode.None,
      filterMode: RasterFilterMode.Color,
      monochromeThreshold: 128,
      resize: { kind: RasterResizeKind.Percentage, percent: 75 },
    },
    scalePercent: 100,
  });
}
