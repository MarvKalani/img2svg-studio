export interface RgbaRaster {
  readonly heightPixels: number;
  readonly rgba: Uint8Array;
  readonly widthPixels: number;
}

export interface LogoQuality {
  readonly colorSimilarity: number;
  readonly silhouetteIntersectionOverUnion: number;
  readonly structuralSimilarity: number;
}

const foregroundChannelThreshold = 20;
const structuralTileSize = 8;

export function measureLogoQuality(reference: RgbaRaster, candidate: RgbaRaster): LogoQuality {
  validateComparableRasters(reference, candidate);
  let absoluteColorDifference = 0;
  let foregroundIntersection = 0;
  let foregroundUnion = 0;

  for (let offset = 0; offset < reference.rgba.length; offset += 4) {
    absoluteColorDifference +=
      Math.abs(reference.rgba[offset]! - candidate.rgba[offset]!) +
      Math.abs(reference.rgba[offset + 1]! - candidate.rgba[offset + 1]!) +
      Math.abs(reference.rgba[offset + 2]! - candidate.rgba[offset + 2]!);
    const referenceForeground = isForeground(reference.rgba, offset);
    const candidateForeground = isForeground(candidate.rgba, offset);
    foregroundIntersection += Number(referenceForeground && candidateForeground);
    foregroundUnion += Number(referenceForeground || candidateForeground);
  }

  const colorChannelCount = (reference.rgba.length / 4) * 3;
  return Object.freeze({
    colorSimilarity: 1 - absoluteColorDifference / (colorChannelCount * 255),
    silhouetteIntersectionOverUnion:
      foregroundUnion === 0 ? 1 : foregroundIntersection / foregroundUnion,
    structuralSimilarity: tiledStructuralSimilarity(reference, candidate),
  });
}

function tiledStructuralSimilarity(reference: RgbaRaster, candidate: RgbaRaster): number {
  let similaritySum = 0;
  let tileCount = 0;
  for (let top = 0; top < reference.heightPixels; top += structuralTileSize) {
    for (let left = 0; left < reference.widthPixels; left += structuralTileSize) {
      similaritySum += tileStructuralSimilarity(reference, candidate, left, top);
      tileCount += 1;
    }
  }
  return similaritySum / tileCount;
}

function tileStructuralSimilarity(
  reference: RgbaRaster,
  candidate: RgbaRaster,
  left: number,
  top: number,
): number {
  const right = Math.min(left + structuralTileSize, reference.widthPixels);
  const bottom = Math.min(top + structuralTileSize, reference.heightPixels);
  const referenceLuminances: number[] = [];
  const candidateLuminances: number[] = [];
  for (let y = top; y < bottom; y += 1) {
    for (let x = left; x < right; x += 1) {
      const offset = (y * reference.widthPixels + x) * 4;
      referenceLuminances.push(luminance(reference.rgba, offset));
      candidateLuminances.push(luminance(candidate.rgba, offset));
    }
  }

  const referenceMean = mean(referenceLuminances);
  const candidateMean = mean(candidateLuminances);
  let referenceVariance = 0;
  let candidateVariance = 0;
  let covariance = 0;
  for (let index = 0; index < referenceLuminances.length; index += 1) {
    const referenceDelta = referenceLuminances[index]! - referenceMean;
    const candidateDelta = candidateLuminances[index]! - candidateMean;
    referenceVariance += referenceDelta * referenceDelta;
    candidateVariance += candidateDelta * candidateDelta;
    covariance += referenceDelta * candidateDelta;
  }
  const divisor = Math.max(1, referenceLuminances.length - 1);
  referenceVariance /= divisor;
  candidateVariance /= divisor;
  covariance /= divisor;

  const luminanceStability = (0.01 * 255) ** 2;
  const contrastStability = (0.03 * 255) ** 2;
  return (
    ((2 * referenceMean * candidateMean + luminanceStability) *
      (2 * covariance + contrastStability)) /
    ((referenceMean ** 2 + candidateMean ** 2 + luminanceStability) *
      (referenceVariance + candidateVariance + contrastStability))
  );
}

function validateComparableRasters(reference: RgbaRaster, candidate: RgbaRaster): void {
  const validLength = reference.widthPixels * reference.heightPixels * 4;
  if (
    reference.widthPixels !== candidate.widthPixels ||
    reference.heightPixels !== candidate.heightPixels ||
    reference.rgba.length !== validLength ||
    candidate.rgba.length !== validLength ||
    validLength === 0
  ) {
    throw new TypeError("Logo quality requires equally sized, non-empty RGBA rasters.");
  }
}

function isForeground(rgba: Uint8Array, offset: number): boolean {
  return (
    rgba[offset]! > foregroundChannelThreshold ||
    rgba[offset + 1]! > foregroundChannelThreshold ||
    rgba[offset + 2]! > foregroundChannelThreshold
  );
}

function luminance(rgba: Uint8Array, offset: number): number {
  return (77 * rgba[offset]! + 150 * rgba[offset + 1]! + 29 * rgba[offset + 2]!) / 256;
}

function mean(values: readonly number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}
