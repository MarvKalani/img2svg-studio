export const ConversionOptionKey = {
  ColorPrecision: "colorPrecision",
  CornerThreshold: "cornerThreshold",
  CurveFitting: "curveFitting",
  FilterSpeckle: "filterSpeckle",
  Hierarchical: "hierarchical",
  LayerDifference: "layerDifference",
  LengthThreshold: "lengthThreshold",
  MaxIterations: "maxIterations",
  MonochromeThreshold: "monochromeThreshold",
  PathPrecision: "pathPrecision",
  Preset: "preset",
  RasterFilter: "rasterFilter",
  RasterResize: "rasterResize",
  RasterSharpenStrength: "rasterSharpenStrength",
  RasterSmoothStrength: "rasterSmoothStrength",
  ScalePercent: "scalePercent",
  ShapeCircle: "shapeCircle",
  ShapeDetection: "shapeDetection",
  ShapeEllipse: "shapeEllipse",
  ShapeLine: "shapeLine",
  ShapePolygon: "shapePolygon",
  ShapeRectangle: "shapeRectangle",
  SpliceThreshold: "spliceThreshold",
} as const;

export type ConversionOptionKey = (typeof ConversionOptionKey)[keyof typeof ConversionOptionKey];

const shapeOptionKeys: Readonly<Record<NativeShapeType, ConversionOptionKey>> = Object.freeze({
  circle: ConversionOptionKey.ShapeCircle,
  ellipse: ConversionOptionKey.ShapeEllipse,
  line: ConversionOptionKey.ShapeLine,
  polygon: ConversionOptionKey.ShapePolygon,
  rectangle: ConversionOptionKey.ShapeRectangle,
});

const conversionOptionKeys = new Set<string>(Object.values(ConversionOptionKey));

export function readConversionOptionKey(
  value: string | undefined,
): ConversionOptionKey | undefined {
  return value && conversionOptionKeys.has(value) ? (value as ConversionOptionKey) : undefined;
}

export function shapeOptionKey(shape: NativeShapeType): ConversionOptionKey {
  return shapeOptionKeys[shape];
}
import type { NativeShapeType } from "./shape-options";
