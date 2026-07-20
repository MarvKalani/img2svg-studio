import { formatImageVersion } from "../image/image-version";
import { compareConversionSettings, type ConversionSettingRow } from "./diff-settings";
import {
  ComparisonSourceKind,
  comparisonSourceLabel,
  type ComparisonSource,
  type RunComparisonSource,
} from "./comparison-source";
import { compareRunSettings } from "./compare-run-settings";

export function compareSourceSettings(
  a: ComparisonSource,
  b: ComparisonSource,
  onlyDifferences: boolean,
): readonly ConversionSettingRow[] {
  if (a.kind === ComparisonSourceKind.Run && b.kind === ComparisonSourceKind.Run) {
    return compareRunSettings(a.run, b.run, onlyDifferences);
  }

  const runSource = a.kind === ComparisonSourceKind.Run ? a : asRunSource(b);
  const conversionRows = compareConversionSettings(
    runSource.run.options,
    runSource.run.options,
    false,
  );
  return Object.freeze([
    Object.freeze({
      a: sourceDescription(a),
      b: sourceDescription(b),
      key: "source",
      label: "Quelle",
    }),
    ...conversionRows.map((row) =>
      Object.freeze({
        ...row,
        a: a.kind === ComparisonSourceKind.Original ? "—" : row.a,
        b: b.kind === ComparisonSourceKind.Original ? "—" : row.b,
      }),
    ),
  ]);
}

function asRunSource(source: ComparisonSource): RunComparisonSource {
  if (source.kind !== ComparisonSourceKind.Run) {
    throw new Error("A comparison requires at least one conversion run.");
  }
  return source;
}

function sourceDescription(source: ComparisonSource): string {
  return source.kind === ComparisonSourceKind.Original
    ? `Original · V${String(source.image.version.id)}`
    : `${comparisonSourceLabel(source)} · ${formatImageVersion(source.run.inputVersion)}`;
}
