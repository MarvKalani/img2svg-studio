import type { ConversionRun } from "../history/history-store";
import type { LoadedImage } from "../image/image-store";

export const ComparisonSourceKind = {
  Original: "original",
  Run: "run",
} as const;

export interface OriginalComparisonSource {
  readonly image: LoadedImage;
  readonly kind: typeof ComparisonSourceKind.Original;
}

export interface RunComparisonSource {
  readonly kind: typeof ComparisonSourceKind.Run;
  readonly run: ConversionRun;
}

export type ComparisonSource = OriginalComparisonSource | RunComparisonSource;

export function originalSource(image: LoadedImage): OriginalComparisonSource {
  return Object.freeze({ image, kind: ComparisonSourceKind.Original });
}

export function runSource(run: ConversionRun): RunComparisonSource {
  return Object.freeze({ kind: ComparisonSourceKind.Run, run });
}

export function comparisonSourceKey(source: ComparisonSource): string {
  return source.kind === ComparisonSourceKind.Original
    ? `original-${String(source.image.version.id)}`
    : `run-${String(source.run.id)}`;
}

export function comparisonSourceLabel(source: ComparisonSource): string {
  return source.kind === ComparisonSourceKind.Original
    ? "Original"
    : `Run ${String(source.run.id)}`;
}
