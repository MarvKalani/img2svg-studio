import type { ConversionRun, NewConversionRun } from "../history/history-store";
import type { LoadedImage } from "../image/image-store";

export const ComparisonSourceKind = {
  Draft: "draft",
  Original: "original",
  Run: "run",
} as const;

export interface DraftComparisonSource {
  readonly kind: typeof ComparisonSourceKind.Draft;
  readonly run: Readonly<NewConversionRun>;
}

export interface OriginalComparisonSource {
  readonly image: LoadedImage;
  readonly kind: typeof ComparisonSourceKind.Original;
}

export interface RunComparisonSource {
  readonly kind: typeof ComparisonSourceKind.Run;
  readonly run: ConversionRun;
}

export type ConvertedComparisonSource = DraftComparisonSource | RunComparisonSource;
export type ComparisonSource =
  | DraftComparisonSource
  | OriginalComparisonSource
  | RunComparisonSource;

export function draftSource(run: NewConversionRun): DraftComparisonSource {
  return Object.freeze({ kind: ComparisonSourceKind.Draft, run });
}

export function originalSource(image: LoadedImage): OriginalComparisonSource {
  return Object.freeze({ image, kind: ComparisonSourceKind.Original });
}

export function runSource(run: ConversionRun): RunComparisonSource {
  return Object.freeze({ kind: ComparisonSourceKind.Run, run });
}

export function comparisonSourceKey(source: ComparisonSource): string {
  switch (source.kind) {
    case ComparisonSourceKind.Draft:
      return "draft";
    case ComparisonSourceKind.Original:
      return `original-${String(source.image.version.id)}`;
    case ComparisonSourceKind.Run:
      return `run-${String(source.run.id)}`;
  }
}

export function comparisonSourceLabel(source: ComparisonSource): string {
  switch (source.kind) {
    case ComparisonSourceKind.Draft:
      return "Entwurf";
    case ComparisonSourceKind.Original:
      return "Original";
    case ComparisonSourceKind.Run:
      return `Run ${String(source.run.id)}`;
  }
}
