import { createConversionOptions, type ConversionOptions } from "../conversion/conversion-options";
import { RasterFilterMode, RasterResizeKind } from "../conversion/raster-preprocessing";

export function createLogoDemoOptions(): ConversionOptions {
  return createConversionOptions({
    colorPrecision: 6,
    filterSpeckle: 4,
    preprocessing: {
      filterMode: RasterFilterMode.Color,
      monochromeThreshold: 128,
      resize: { heightPixels: 576, kind: RasterResizeKind.TargetHeight },
    },
    scalePercent: 100,
    shapeDetection: {
      enabled: true,
      types: {
        circle: false,
        ellipse: false,
        line: false,
        polygon: true,
        rectangle: false,
      },
    },
  });
}
