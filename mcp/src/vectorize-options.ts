export const VectorizeMode: Readonly<{ Shapes: "shapes"; Trace: "trace" }> = Object.freeze({
  Shapes: "shapes",
  Trace: "trace",
} as const);

export type VectorizeMode = (typeof VectorizeMode)[keyof typeof VectorizeMode];

export const DetailLevel: Readonly<{ High: "high"; Low: "low"; Medium: "medium" }> = Object.freeze({
  High: "high",
  Low: "low",
  Medium: "medium",
} as const);

export type DetailLevel = (typeof DetailLevel)[keyof typeof DetailLevel];

export interface VectorizeOptionInput {
  colorCount: number;
  detailLevel: unknown;
  mode: unknown;
}

export interface VectorizeOptions {
  colorCount: number;
  colorPrecision: number;
  detailLevel: DetailLevel;
  filterSpeckle: number;
  mode: VectorizeMode;
  pathPrecision: number;
  shapeDetectionFlags: number;
}

const allNativeShapeFlags = 0b11_1111;
const filterSpeckleByDetail: Readonly<Record<DetailLevel, number>> = Object.freeze({
  [DetailLevel.High]: 1,
  [DetailLevel.Low]: 8,
  [DetailLevel.Medium]: 4,
});
const pathPrecisionByDetail: Readonly<Record<DetailLevel, number>> = Object.freeze({
  [DetailLevel.High]: 2,
  [DetailLevel.Low]: 0,
  [DetailLevel.Medium]: 1,
});

export function createVectorizeOptions(input: VectorizeOptionInput): VectorizeOptions {
  if (
    !Number.isSafeInteger(input.colorCount) ||
    input.colorCount < 2 ||
    input.colorCount > 256 ||
    !isDetailLevel(input.detailLevel) ||
    !isVectorizeMode(input.mode)
  ) {
    throw new TypeError("invalid_parameters");
  }

  return Object.freeze({
    colorCount: input.colorCount,
    // Palette reduction happens before tracing, so the engine must preserve all resulting bytes.
    colorPrecision: 8,
    detailLevel: input.detailLevel,
    filterSpeckle: filterSpeckleByDetail[input.detailLevel],
    mode: input.mode,
    pathPrecision: pathPrecisionByDetail[input.detailLevel],
    shapeDetectionFlags: input.mode === VectorizeMode.Shapes ? allNativeShapeFlags : 0,
  });
}

function isDetailLevel(value: unknown): value is DetailLevel {
  return value === DetailLevel.High || value === DetailLevel.Low || value === DetailLevel.Medium;
}

function isVectorizeMode(value: unknown): value is VectorizeMode {
  return value === VectorizeMode.Shapes || value === VectorizeMode.Trace;
}
