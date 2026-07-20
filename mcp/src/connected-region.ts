export interface RasterPixels {
  readonly heightPixels: number;
  readonly rgba: Uint8Array;
  readonly widthPixels: number;
}

export interface ConnectedRegion {
  readonly mask: Uint8Array;
  readonly pixelCount: number;
}

export function selectConnectedRegion(
  raster: RasterPixels,
  seedIndex: number,
  sensitivityPercent: number,
): ConnectedRegion {
  const totalPixels = raster.widthPixels * raster.heightPixels;
  if (
    raster.rgba.length !== totalPixels * 4 ||
    !Number.isSafeInteger(seedIndex) ||
    seedIndex < 0 ||
    seedIndex >= totalPixels ||
    !Number.isFinite(sensitivityPercent) ||
    sensitivityPercent < 0 ||
    sensitivityPercent > 100
  ) {
    throw new TypeError("Invalid connected-region input.");
  }

  const seedOffset = seedIndex * 4;
  const tolerance = (sensitivityPercent / 100) * 255;
  const visited = new Uint8Array(totalPixels);
  const mask = new Uint8Array(totalPixels);
  const pending = new Int32Array(totalPixels);
  pending[0] = seedIndex;
  visited[seedIndex] = 1;
  let pendingLength = 1;
  let pixelCount = 0;

  while (pendingLength > 0) {
    const pixelIndex = pending[(pendingLength -= 1)] ?? seedIndex;
    if (!matchesSeed(raster.rgba, pixelIndex * 4, seedOffset, tolerance)) {
      continue;
    }
    mask[pixelIndex] = 1;
    pixelCount += 1;
    pendingLength = appendNeighbors(
      pending,
      visited,
      pendingLength,
      pixelIndex,
      raster.widthPixels,
      raster.heightPixels,
    );
  }
  return { mask, pixelCount };
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

function appendNeighbors(
  pending: Int32Array,
  visited: Uint8Array,
  pendingLength: number,
  pixelIndex: number,
  widthPixels: number,
  heightPixels: number,
): number {
  const xPixels = pixelIndex % widthPixels;
  const yPixels = Math.floor(pixelIndex / widthPixels);
  if (xPixels > 0) pendingLength = enqueue(pending, visited, pendingLength, pixelIndex - 1);
  if (xPixels + 1 < widthPixels)
    pendingLength = enqueue(pending, visited, pendingLength, pixelIndex + 1);
  if (yPixels > 0)
    pendingLength = enqueue(pending, visited, pendingLength, pixelIndex - widthPixels);
  if (yPixels + 1 < heightPixels)
    pendingLength = enqueue(pending, visited, pendingLength, pixelIndex + widthPixels);
  return pendingLength;
}

function enqueue(
  pending: Int32Array,
  visited: Uint8Array,
  pendingLength: number,
  pixelIndex: number,
): number {
  if (visited[pixelIndex] !== 0) return pendingLength;
  visited[pixelIndex] = 1;
  pending[pendingLength] = pixelIndex;
  return pendingLength + 1;
}
