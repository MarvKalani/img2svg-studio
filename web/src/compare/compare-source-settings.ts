import { formatImageVersion } from "../image/image-version";
import { compareConversionSettings, type ConversionSettingRow } from "./diff-settings";
import {
  ComparisonSourceKind,
  comparisonSourceLabel,
  type ComparisonSource,
  type ConvertedComparisonSource,
} from "./comparison-source";
import { compareRunSettings } from "./compare-run-settings";

export function compareSourceSettings(
  a: ComparisonSource,
  b: ComparisonSource,
  onlyDifferences: boolean,
): readonly ConversionSettingRow[] {
  if (isConvertedSource(a) && isConvertedSource(b)) {
    return compareRunSettings(a.run, b.run, onlyDifferences);
  }

  if (isRasterSource(a) && isRasterSource(b)) {
    return Object.freeze([sourceRow(a, b)]);
  }

  const runSource = isConvertedSource(a) ? a : asConvertedSource(b);
  const conversionRows = compareConversionSettings(
    runSource.run.options,
    runSource.run.options,
    false,
  );
  return Object.freeze([
    sourceRow(a, b),
    ...conversionRows.map((row) =>
      Object.freeze({
        ...row,
        a: isConvertedSource(a) ? row.a : "—",
        b: isConvertedSource(b) ? row.b : "—",
      }),
    ),
  ]);
}

function sourceRow(a: ComparisonSource, b: ComparisonSource): ConversionSettingRow {
  return Object.freeze({
    a: sourceDescription(a),
    b: sourceDescription(b),
    key: "source",
    label: "Quelle",
  });
}

function asConvertedSource(source: ComparisonSource): ConvertedComparisonSource {
  if (!isConvertedSource(source)) {
    throw new Error("A comparison requires at least one converted source.");
  }
  return source;
}

function isConvertedSource(source: ComparisonSource): source is ConvertedComparisonSource {
  return source.kind === ComparisonSourceKind.Draft || source.kind === ComparisonSourceKind.Run;
}

function isRasterSource(
  source: ComparisonSource,
): source is Extract<
  ComparisonSource,
  { kind: typeof ComparisonSourceKind.Original | typeof ComparisonSourceKind.Processed }
> {
  return (
    source.kind === ComparisonSourceKind.Original || source.kind === ComparisonSourceKind.Processed
  );
}

function sourceDescription(source: ComparisonSource): string {
  switch (source.kind) {
    case ComparisonSourceKind.Original:
      return `Original · V${String(source.image.version.id)}`;
    case ComparisonSourceKind.Processed:
      return `Verarbeitet · ${formatImageVersion(source.image.version)}`;
    case ComparisonSourceKind.Draft:
    case ComparisonSourceKind.Run:
      return `${comparisonSourceLabel(source)} · ${formatImageVersion(source.run.inputVersion)}`;
  }
}
