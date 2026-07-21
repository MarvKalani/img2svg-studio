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
  test("Given the Studio profiles, when listed, then every purpose and measured resize is explicit", () => {
    expect(conversionPresets.map((preset) => preset.id)).toEqual([
      ConversionPresetId.Balanced,
      ConversionPresetId.Logo,
      ConversionPresetId.Topography,
      ConversionPresetId.Illustration,
      ConversionPresetId.Photo,
      ConversionPresetId.Monochrome,
    ]);
    expect(new Set(conversionPresets.map((preset) => preset.label)).size).toBe(
      conversionPresets.length,
    );
    expect(conversionPresets.map((preset) => preset.options.preprocessing.resize)).toEqual([
      { kind: "original" },
      { kind: "original" },
      { kind: "percentage", percent: 75 },
      { kind: "original" },
      { kind: "original" },
      { kind: "original" },
    ]);
  });

  test("Given canonical or adjusted options, when matched, then the preset or custom state is explicit", () => {
    expect(matchingConversionPresetId(defaultConversionOptions)).toBe(ConversionPresetId.Balanced);
    expect(matchingConversionPresetId({ ...defaultConversionOptions, colorPrecision: 5 })).toBe(
      customConversionPresetId,
    );
    expect(readConversionPreset(ConversionPresetId.Photo).options).toMatchObject({
      colorPrecision: 8,
      preprocessing: { resize: { kind: "original" }, smoothStrength: 100 },
    });
    expect(() => readConversionPreset("unknown")).toThrow("Unknown conversion preset.");
  });
});
