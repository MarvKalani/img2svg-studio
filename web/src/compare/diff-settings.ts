import type { ConversionOptions } from "../conversion/conversion-options";
import { nativeShapeSchema } from "../conversion/shape-options";
import {
  formatRasterDetail,
  formatRasterFilter,
  formatRasterResize,
} from "../conversion/raster-preprocessing";

export interface ConversionSettingRow {
  readonly a: string;
  readonly b: string;
  readonly key: string;
  readonly label: string;
}

interface EvaluatedSetting extends ConversionSettingRow {
  different: boolean;
}

interface ConversionSettingSchema {
  evaluate(a: Readonly<ConversionOptions>, b: Readonly<ConversionOptions>): EvaluatedSetting;
}

const conversionSettingSchema: readonly ConversionSettingSchema[] = Object.freeze([
  setting(
    "preprocessing.resize",
    "Rastergröße",
    (options) => formatRasterResize(options.preprocessing.resize),
    String,
  ),
  setting(
    "preprocessing.filterMode",
    "Rasterfilter",
    (options) => formatRasterFilter(options.preprocessing.filterMode),
    String,
  ),
  setting(
    "preprocessing.detailMode",
    "Detailfilter",
    (options) => formatRasterDetail(options.preprocessing.detailMode),
    String,
  ),
  setting(
    "preprocessing.monochromeThreshold",
    "Schwarzweiß-Schwellwert",
    (options) => options.preprocessing.monochromeThreshold,
    String,
  ),
  setting(
    "colorPrecision",
    "Farbpräzision",
    (options) => options.colorPrecision,
    (value) => `${String(value)} Bit`,
  ),
  setting(
    "filterSpeckle",
    "Speckle-Filter",
    (options) => options.filterSpeckle,
    (value) => `${String(value)} px`,
  ),
  setting(
    "pathPrecision",
    "Pfadpräzision",
    (options) => options.pathPrecision,
    (value) => `${String(value)} Stellen`,
  ),
  setting(
    "scalePercent",
    "Zielgröße",
    (options) => options.scalePercent,
    (value) => `${String(value)} %`,
  ),
  setting(
    "shapeDetection.enabled",
    "Formerkennung",
    (options) => options.shapeDetection.enabled,
    formatBoolean,
  ),
  ...nativeShapeSchema.map((shape) =>
    setting(
      `shapeDetection.types.${shape.key}`,
      `${shape.label} erkennen`,
      (options) => options.shapeDetection.types[shape.key],
      formatBoolean,
    ),
  ),
]);

export function compareConversionSettings(
  a: Readonly<ConversionOptions>,
  b: Readonly<ConversionOptions>,
  onlyDifferences: boolean,
): readonly ConversionSettingRow[] {
  return Object.freeze(
    conversionSettingSchema
      .map((schema) => schema.evaluate(a, b))
      .filter((evaluated) => !onlyDifferences || evaluated.different)
      .map((evaluated) =>
        Object.freeze({
          a: evaluated.a,
          b: evaluated.b,
          key: evaluated.key,
          label: evaluated.label,
        }),
      ),
  );
}

function setting<Value extends number | boolean | string>(
  key: string,
  label: string,
  read: (options: Readonly<ConversionOptions>) => Value,
  format: (value: Value) => string,
): ConversionSettingSchema {
  return {
    evaluate: (a, b) => {
      const aValue = read(a);
      const bValue = read(b);
      return {
        a: format(aValue),
        b: format(bValue),
        different: aValue !== bValue,
        key,
        label,
      };
    },
  };
}

function formatBoolean(value: boolean): string {
  return value ? "An" : "Aus";
}
