import { ConversionFailure, ConversionFailureCode } from "./conversion-failure";

export interface NativeShapeTypes {
  circle: boolean;
  ellipse: boolean;
  line: boolean;
  polygon: boolean;
  rectangle: boolean;
}

export type NativeShapeType = keyof NativeShapeTypes;

export interface ShapeDetectionOptions {
  enabled: boolean;
  types: Readonly<NativeShapeTypes>;
}

export interface NativeShapeDefinition {
  key: NativeShapeType;
  label: string;
}

export const nativeShapeSchema: readonly NativeShapeDefinition[] = Object.freeze([
  Object.freeze({ key: "circle", label: "Kreis" }),
  Object.freeze({ key: "rectangle", label: "Rechteck" }),
  Object.freeze({ key: "ellipse", label: "Ellipse" }),
  Object.freeze({ key: "line", label: "Linie" }),
  Object.freeze({ key: "polygon", label: "Polygon" }),
]);

export const defaultShapeDetectionOptions: Readonly<ShapeDetectionOptions> = Object.freeze({
  enabled: false,
  types: Object.freeze({
    circle: true,
    ellipse: true,
    line: true,
    polygon: true,
    rectangle: true,
  }),
});

// A dedicated bit preserves the difference between disabled detection and enabled detection with
// every type unchecked across the narrow WASM boundary.
const shapeDetectionEnabledFlag = 1 << 5;
const nativeShapeFlags: Readonly<Record<NativeShapeType, number>> = Object.freeze({
  circle: 1 << 0,
  rectangle: 1 << 1,
  ellipse: 1 << 2,
  line: 1 << 3,
  polygon: 1 << 4,
});

export function createShapeDetectionOptions(input: ShapeDetectionOptions): ShapeDetectionOptions {
  if (
    typeof input.enabled !== "boolean" ||
    nativeShapeSchema.some((shape) => typeof input.types[shape.key] !== "boolean")
  ) {
    throw new ConversionFailure(ConversionFailureCode.InvalidOptions);
  }

  return {
    enabled: input.enabled,
    types: { ...input.types },
  };
}

export function shapeDetectionFlags(options: Readonly<ShapeDetectionOptions>): number {
  if (!options.enabled) {
    return 0;
  }

  return nativeShapeSchema.reduce(
    (flags, shape) => flags | (options.types[shape.key] ? nativeShapeFlags[shape.key] : 0),
    shapeDetectionEnabledFlag,
  );
}
