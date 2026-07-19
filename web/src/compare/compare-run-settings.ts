import type { ConversionRun } from "../history/history-store";
import { formatImageVersion } from "../image/image-version";
import { compareConversionSettings, type ConversionSettingRow } from "./diff-settings";

export function compareRunSettings(
  a: ConversionRun,
  b: ConversionRun,
  onlyDifferences: boolean,
): readonly ConversionSettingRow[] {
  const inputDiffers = a.inputVersion.id !== b.inputVersion.id;
  const inputRows: readonly ConversionSettingRow[] =
    onlyDifferences && !inputDiffers
      ? []
      : [
          Object.freeze({
            a: formatImageVersion(a.inputVersion),
            b: formatImageVersion(b.inputVersion),
            key: "inputVersion",
            label: "Eingabe",
          }),
        ];
  return Object.freeze([
    ...inputRows,
    ...compareConversionSettings(a.options, b.options, onlyDifferences),
  ]);
}
