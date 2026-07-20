import { describe, expect, test } from "vitest";
import { defaultConversionOptions } from "./conversion-options";
import {
  ConversionPresetId,
  conversionPresets,
  customConversionPresetId,
  matchingConversionPresetId,
  readConversionPreset,
} from "./conversion-presets";

describe("conversion presets", () => {
  test("Given the Studio profiles, when listed, then every purpose is unique and preserves original raster size", () => {
    expect(conversionPresets.map((preset) => preset.id)).toEqual([
      ConversionPresetId.Balanced,
      ConversionPresetId.Logo,
      ConversionPresetId.Illustration,
      ConversionPresetId.Photo,
      ConversionPresetId.Monochrome,
    ]);
    expect(new Set(conversionPresets.map((preset) => preset.label)).size).toBe(
      conversionPresets.length,
    );
    expect(conversionPresets.map((preset) => preset.options.preprocessing.resize)).toEqual(
      conversionPresets.map(() => ({ kind: "original" })),
    );
  });

  test("Given canonical or adjusted options, when matched, then the preset or custom state is explicit", () => {
    expect(matchingConversionPresetId(defaultConversionOptions)).toBe(ConversionPresetId.Balanced);
    expect(matchingConversionPresetId({ ...defaultConversionOptions, colorPrecision: 6 })).toBe(
      customConversionPresetId,
    );
    expect(readConversionPreset(ConversionPresetId.Photo).options).toMatchObject({
      colorPrecision: 8,
      preprocessing: { detailMode: "smooth", resize: { kind: "original" } },
    });
    expect(() => readConversionPreset("unknown")).toThrow("Unknown conversion preset.");
  });
});
