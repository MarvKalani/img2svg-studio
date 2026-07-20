import type { RasterPixels } from "../conversion/read-raster-pixels";

export interface MagicWandRequest {
  readonly sensitivityPercent: number;
  readonly xPixels: number;
  readonly yPixels: number;
}

export interface MagicWandMask {
  readonly heightPixels: number;
  readonly selected: Uint8Array<ArrayBuffer>;
  readonly selectedPixelCount: number;
  readonly widthPixels: number;
}

const PixelState = Object.freeze({
  Queued: 1,
  Rejected: 2,
  Selected: 3,
  Unvisited: 0,
} as const);

export function createMagicWandMask(input: RasterPixels, request: MagicWandRequest): MagicWandMask {
  const pixelCount = validateRaster(input);
  validateRequest(request, input);
  const seedIndex = request.yPixels * input.widthPixels + request.xPixels;
  const seedOffset = seedIndex * 4;
  const channelTolerance = (request.sensitivityPercent / 100) * 255;
  const states = new Uint8Array(pixelCount);
  const selected = new Uint8Array(pixelCount);
  const pending = new Int32Array(pixelCount);
  pending[0] = seedIndex;
  let pendingLength = 1;
  states[seedIndex] = PixelState.Queued;
  let selectedPixelCount = 0;

  while (pendingLength > 0) {
    const pixelIndex = pending[(pendingLength -= 1)] ?? seedIndex;
    const pixelOffset = pixelIndex * 4;
    // Every candidate is compared with the clicked color so tolerance cannot leak through a gradient.
    if (!matchesSeed(input.rgba, pixelOffset, seedOffset, channelTolerance)) {
      states[pixelIndex] = PixelState.Rejected;
      continue;
    }
    states[pixelIndex] = PixelState.Selected;
    selected[pixelIndex] = 1;
    selectedPixelCount += 1;
    pendingLength = appendConnectedNeighbors(
      pending,
      states,
      pendingLength,
      pixelIndex,
      input.widthPixels,
      input.heightPixels,
    );
  }

  return Object.freeze({
    heightPixels: input.heightPixels,
    selected,
    selectedPixelCount,
    widthPixels: input.widthPixels,
  });
}

export function removeMagicWandSelection(input: RasterPixels, mask: MagicWandMask): RasterPixels {
  const pixelCount = validateRaster(input);
  if (
    mask.widthPixels !== input.widthPixels ||
    mask.heightPixels !== input.heightPixels ||
    mask.selected.length !== pixelCount
  ) {
    throw new Error("Die Zauberstab-Maske passt nicht zum Eingabebild.");
  }
  const rgba = new Uint8Array(input.rgba);
  for (let pixelIndex = 0; pixelIndex < pixelCount; pixelIndex += 1) {
    if ((mask.selected[pixelIndex] ?? 0) !== 0) {
      rgba[pixelIndex * 4 + 3] = 0;
    }
  }
  return { heightPixels: input.heightPixels, rgba, widthPixels: input.widthPixels };
}

function matchesSeed(
  rgba: Uint8Array,
  pixelOffset: number,
  seedOffset: number,
  tolerance: number,
): boolean {
  for (let channel = 0; channel < 4; channel += 1) {
    if (
      Math.abs((rgba[pixelOffset + channel] ?? 0) - (rgba[seedOffset + channel] ?? 0)) > tolerance
    ) {
      return false;
    }
  }
  return true;
}

function appendConnectedNeighbors(
  pending: Int32Array,
  states: Uint8Array,
  pendingLength: number,
  pixelIndex: number,
  widthPixels: number,
  heightPixels: number,
): number {
  const xPixels = pixelIndex % widthPixels;
  const yPixels = Math.floor(pixelIndex / widthPixels);
  if (xPixels > 0) {
    pendingLength = enqueue(pending, states, pendingLength, pixelIndex - 1);
  }
  if (xPixels + 1 < widthPixels) {
    pendingLength = enqueue(pending, states, pendingLength, pixelIndex + 1);
  }
  if (yPixels > 0) {
    pendingLength = enqueue(pending, states, pendingLength, pixelIndex - widthPixels);
  }
  if (yPixels + 1 < heightPixels) {
    pendingLength = enqueue(pending, states, pendingLength, pixelIndex + widthPixels);
  }
  return pendingLength;
}

function enqueue(
  pending: Int32Array,
  states: Uint8Array,
  pendingLength: number,
  pixelIndex: number,
): number {
  if (states[pixelIndex] === PixelState.Unvisited) {
    states[pixelIndex] = PixelState.Queued;
    pending[pendingLength] = pixelIndex;
    return pendingLength + 1;
  }
  return pendingLength;
}

function validateRaster(input: RasterPixels): number {
  const pixelCount = input.widthPixels * input.heightPixels;
  if (
    !Number.isSafeInteger(input.widthPixels) ||
    !Number.isSafeInteger(input.heightPixels) ||
    input.widthPixels < 1 ||
    input.heightPixels < 1 ||
    input.rgba.length !== pixelCount * 4
  ) {
    throw new Error("Der Zauberstab benötigt gültige Rasterdaten.");
  }
  return pixelCount;
}

function validateRequest(request: MagicWandRequest, input: RasterPixels): void {
  if (
    !Number.isInteger(request.xPixels) ||
    !Number.isInteger(request.yPixels) ||
    request.xPixels < 0 ||
    request.xPixels >= input.widthPixels ||
    request.yPixels < 0 ||
    request.yPixels >= input.heightPixels ||
    !Number.isFinite(request.sensitivityPercent) ||
    request.sensitivityPercent < 0 ||
    request.sensitivityPercent > 100
  ) {
    throw new Error("Zauberstab-Punkt oder Empfindlichkeit ist ungültig.");
  }
}
