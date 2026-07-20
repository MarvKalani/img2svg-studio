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
  cornerThreshold: number;
  curveFitting: CurveFittingMode;
  filterSpeckle: number;
  hierarchical: HierarchicalMode;
  layerDifference: number;
  lengthThreshold: number;
  maxIterations: number;
  pathPrecision: number;
  preprocessing: RasterPreprocessingOptions;
  scalePercent: number;
  shapeDetection: ShapeDetectionOptions;
  spliceThreshold: number;
}

export interface ConversionOptionsInput {
  colorPrecision: number;
  cornerThreshold?: number;
  curveFitting?: CurveFittingMode;
  filterSpeckle: number;
  hierarchical?: HierarchicalMode;
  layerDifference?: number;
  lengthThreshold?: number;
  maxIterations?: number;
  pathPrecision?: number;
  preprocessing?: RasterPreprocessingOptions;
  scalePercent: number;
  shapeDetection?: ShapeDetectionOptions;
  spliceThreshold?: number;
}

export const CurveFittingMode = {
  Pixel: "pixel",
  Polygon: "polygon",
  Spline: "spline",
} as const;

export type CurveFittingMode = (typeof CurveFittingMode)[keyof typeof CurveFittingMode];

export const HierarchicalMode = {
  Cutout: "cutout",
  Stacked: "stacked",
} as const;

export type HierarchicalMode = (typeof HierarchicalMode)[keyof typeof HierarchicalMode];

export interface PixelDimensions {
  heightPixels: number;
  widthPixels: number;
}

export const defaultConversionOptions: Readonly<ConversionOptions> = Object.freeze({
  colorPrecision: 6,
  cornerThreshold: 60,
  curveFitting: CurveFittingMode.Spline,
  filterSpeckle: 4,
  hierarchical: HierarchicalMode.Stacked,
  layerDifference: 16,
  lengthThreshold: 4,
  maxIterations: 10,
  pathPrecision: 2,
  preprocessing: defaultRasterPreprocessingOptions,
  scalePercent: 100,
  shapeDetection: defaultShapeDetectionOptions,
  spliceThreshold: 45,
});

export function createConversionOptions(input: ConversionOptionsInput): ConversionOptions {
  if (
    !isIntegerWithin(input.colorPrecision, 1, 8) ||
    !isIntegerWithin(input.cornerThreshold ?? 60, 0, 180) ||
    !isCurveFittingMode(input.curveFitting ?? CurveFittingMode.Spline) ||
    !isIntegerWithin(input.filterSpeckle, 0, 1_000) ||
    !isHierarchicalMode(input.hierarchical ?? HierarchicalMode.Stacked) ||
    !isIntegerWithin(input.layerDifference ?? 16, 0, 255) ||
    !isTenthWithin(input.lengthThreshold ?? 4, 3.5, 10) ||
    !isIntegerWithin(input.maxIterations ?? 10, 1, 20) ||
    !isIntegerWithin(input.pathPrecision ?? 2, 0, 4) ||
    !isIntegerWithin(input.scalePercent, 10, 400) ||
    !isIntegerWithin(input.spliceThreshold ?? 45, 0, 180)
  ) {
    throw new ConversionFailure(ConversionFailureCode.InvalidOptions);
  }

  return {
    colorPrecision: input.colorPrecision,
    cornerThreshold: input.cornerThreshold ?? 60,
    curveFitting: input.curveFitting ?? CurveFittingMode.Spline,
    filterSpeckle: input.filterSpeckle,
    hierarchical: input.hierarchical ?? HierarchicalMode.Stacked,
    layerDifference: input.layerDifference ?? 16,
    lengthThreshold: input.lengthThreshold ?? 4,
    maxIterations: input.maxIterations ?? 10,
    pathPrecision: input.pathPrecision ?? 2,
    preprocessing: createRasterPreprocessingOptions(
      input.preprocessing ?? defaultRasterPreprocessingOptions,
    ),
    scalePercent: input.scalePercent,
    shapeDetection: createShapeDetectionOptions(
      input.shapeDetection ?? defaultShapeDetectionOptions,
    ),
    spliceThreshold: input.spliceThreshold ?? 45,
  };
}

function isCurveFittingMode(value: string): value is CurveFittingMode {
  return Object.values(CurveFittingMode).some((candidate) => candidate === value);
}

function isHierarchicalMode(value: string): value is HierarchicalMode {
  return Object.values(HierarchicalMode).some((candidate) => candidate === value);
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

function isTenthWithin(value: number, minimum: number, maximum: number): boolean {
  return Number.isInteger(value * 10) && value >= minimum && value <= maximum;
}
