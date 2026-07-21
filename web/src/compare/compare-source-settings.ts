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

  const runSource = isConvertedSource(a) ? a : asConvertedSource(b);
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
        a: isConvertedSource(a) ? row.a : "—",
        b: isConvertedSource(b) ? row.b : "—",
      }),
    ),
  ]);
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

function sourceDescription(source: ComparisonSource): string {
  return source.kind === ComparisonSourceKind.Original
    ? `Original · V${String(source.image.version.id)}`
    : `${comparisonSourceLabel(source)} · ${formatImageVersion(source.run.inputVersion)}`;
}
