import { createConversionOptions, type ConversionOptions } from "../conversion/conversion-options";
import { RasterFilterMode, RasterResizeKind } from "../conversion/raster-preprocessing";

export function createTopographyDemoOptions(): ConversionOptions {
  return createConversionOptions({
    colorPrecision: 6,
    filterSpeckle: 12,
    pathPrecision: 1,
    preprocessing: {
      filterMode: RasterFilterMode.Color,
      monochromeThreshold: 128,
      resize: { kind: RasterResizeKind.Percentage, percent: 75 },
      sharpenStrength: 0,
      smoothStrength: 0,
    },
    scalePercent: 100,
  });
}
