import { ConversionFailure, ConversionFailureCode } from "./conversion-failure";
import {
  createShapeDetectionOptions,
  defaultShapeDetectionOptions,
  type ShapeDetectionOptions,
} from "./shape-options";
import {
  createRasterPreprocessingOptions,
  defaultRasterPreprocessingOptions,
  type RasterPreprocessingOptions,
} from "./raster-preprocessing";

export interface ConversionOptions {
  colorPrecision: number;
  filterSpeckle: number;
  preprocessing: RasterPreprocessingOptions;
  scalePercent: number;
  shapeDetection: ShapeDetectionOptions;
}

export interface ConversionOptionsInput {
  colorPrecision: number;
  filterSpeckle: number;
  preprocessing?: RasterPreprocessingOptions;
  scalePercent: number;
  shapeDetection?: ShapeDetectionOptions;
}

export interface PixelDimensions {
  heightPixels: number;
  widthPixels: number;
}

export const defaultConversionOptions: Readonly<ConversionOptions> = Object.freeze({
  colorPrecision: 7,
  filterSpeckle: 4,
  preprocessing: defaultRasterPreprocessingOptions,
  scalePercent: 100,
  shapeDetection: defaultShapeDetectionOptions,
});

export function createConversionOptions(input: ConversionOptionsInput): ConversionOptions {
  if (
    !isIntegerWithin(input.colorPrecision, 1, 8) ||
    !isIntegerWithin(input.filterSpeckle, 0, 1_000) ||
    !isIntegerWithin(input.scalePercent, 10, 400)
  ) {
    throw new ConversionFailure(ConversionFailureCode.InvalidOptions);
  }

  return {
    colorPrecision: input.colorPrecision,
    filterSpeckle: input.filterSpeckle,
    preprocessing: createRasterPreprocessingOptions(
      input.preprocessing ?? defaultRasterPreprocessingOptions,
    ),
    scalePercent: input.scalePercent,
    shapeDetection: createShapeDetectionOptions(
      input.shapeDetection ?? defaultShapeDetectionOptions,
    ),
  };
}

export function scaledDimensions(
  sourceWidthPixels: number,
  sourceHeightPixels: number,
  options: ConversionOptions,
): PixelDimensions {
  if (
    !Number.isSafeInteger(sourceWidthPixels) ||
    !Number.isSafeInteger(sourceHeightPixels) ||
    sourceWidthPixels < 1 ||
    sourceHeightPixels < 1
  ) {
    throw new ConversionFailure(ConversionFailureCode.InvalidDimensions);
  }

  return {
    heightPixels: Math.max(1, Math.round((sourceHeightPixels * options.scalePercent) / 100)),
    widthPixels: Math.max(1, Math.round((sourceWidthPixels * options.scalePercent) / 100)),
  };
}

function isIntegerWithin(value: number, minimum: number, maximum: number): boolean {
  return Number.isInteger(value) && value >= minimum && value <= maximum;
}
