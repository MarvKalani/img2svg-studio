import type { RasterPixels } from "../conversion/read-raster-pixels";

export const SamPointKind = Object.freeze({
  Negative: "negative",
  Positive: "positive",
} as const);

export type SamPointKind = (typeof SamPointKind)[keyof typeof SamPointKind];

export const MaskPolarity = Object.freeze({
  Inverted: "inverted",
  Selected: "selected",
} as const);

export type MaskPolarity = (typeof MaskPolarity)[keyof typeof MaskPolarity];

export interface SamPointInput {
  readonly kind: SamPointKind;
  readonly xPixels: number;
  readonly yPixels: number;
}

export interface SamSelectionPoint extends SamPointInput {}

export interface SamSelectionBounds {
  readonly heightPixels: number;
  readonly widthPixels: number;
}

export interface SamSelectionMask extends SamSelectionBounds {
  readonly selected: Uint8Array<ArrayBuffer>;
}

export function createSamPoint(
  input: SamPointInput,
  bounds: SamSelectionBounds,
): SamSelectionPoint {
  if (bounds.widthPixels < 1 || bounds.heightPixels < 1) {
    throw new Error("Die SAM-Auswahl benötigt gültige Bildmaße.");
  }
  return Object.freeze({
    kind: input.kind,
    xPixels: clamp(Math.round(input.xPixels), 0, bounds.widthPixels - 1),
    yPixels: clamp(Math.round(input.yPixels), 0, bounds.heightPixels - 1),
  });
}

export function applySelectionMask(
  input: RasterPixels,
  mask: SamSelectionMask,
  polarity: MaskPolarity,
): RasterPixels {
  const pixelCount = input.widthPixels * input.heightPixels;
  if (
    mask.widthPixels !== input.widthPixels ||
    mask.heightPixels !== input.heightPixels ||
    mask.selected.length !== pixelCount ||
    input.rgba.length !== pixelCount * 4
  ) {
    throw new Error("Die SAM-Maske passt nicht zum Eingabebild.");
  }

  const rgba = new Uint8Array(input.rgba);
  for (let pixelIndex = 0; pixelIndex < pixelCount; pixelIndex += 1) {
    const isSelected = (mask.selected[pixelIndex] ?? 0) !== 0;
    const keepPixel = polarity === MaskPolarity.Selected ? isSelected : !isSelected;
    if (!keepPixel) {
      rgba[pixelIndex * 4 + 3] = 0;
    }
  }
  return { heightPixels: input.heightPixels, rgba, widthPixels: input.widthPixels };
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}
