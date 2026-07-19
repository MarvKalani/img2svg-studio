import type { ConversionOptions } from "../conversion/conversion-options";

type ConversionOptionKey = keyof ConversionOptions;

interface ConversionSettingSchema {
  format(value: number): string;
  key: ConversionOptionKey;
  label: string;
}

export interface ConversionSettingRow {
  readonly a: string;
  readonly b: string;
  readonly key: ConversionOptionKey;
  readonly label: string;
}

const conversionSettingSchema: readonly ConversionSettingSchema[] = Object.freeze([
  { key: "colorPrecision", label: "Farbpräzision", format: (value) => `${String(value)} Bit` },
  { key: "filterSpeckle", label: "Speckle-Filter", format: (value) => `${String(value)} px` },
  { key: "scalePercent", label: "Zielgröße", format: (value) => `${String(value)} %` },
]);

export function compareConversionSettings(
  a: Readonly<ConversionOptions>,
  b: Readonly<ConversionOptions>,
  onlyDifferences: boolean,
): readonly ConversionSettingRow[] {
  return Object.freeze(
    conversionSettingSchema
      .filter((setting) => !onlyDifferences || a[setting.key] !== b[setting.key])
      .map((setting) =>
        Object.freeze({
          a: setting.format(a[setting.key]),
          b: setting.format(b[setting.key]),
          key: setting.key,
          label: setting.label,
        }),
      ),
  );
}
