import { describe, expect, test } from "vitest";
import { defaultConversionOptions, type ConversionOptions } from "../conversion/conversion-options";
import { compareConversionSettings } from "./diff-settings";

const a: ConversionOptions = { ...defaultConversionOptions };
const b: ConversionOptions = { ...defaultConversionOptions, colorPrecision: 5 };

describe("conversion settings diff", () => {
  test("Given only color precision differs, when only differences are requested, then exactly that formatted row remains", () => {
    expect(compareConversionSettings(a, b, true)).toEqual([
      { a: "7 Bit", b: "5 Bit", key: "colorPrecision", label: "Farbpräzision" },
    ]);
  });

  test("Given two runs, when all settings are requested, then canonical schema order formats all rows", () => {
    const rows = compareConversionSettings(a, b, false);

    expect(rows.map((row) => row.label)).toEqual([
      "Rastergröße",
      "Rasterfilter",
      "Schwarzweiß-Schwellwert",
      "Farbpräzision",
      "Speckle-Filter",
      "Zielgröße",
      "Formerkennung",
      "Kreis erkennen",
      "Rechteck erkennen",
      "Ellipse erkennen",
      "Linie erkennen",
      "Polygon erkennen",
    ]);
    expect(Object.isFrozen(rows)).toBe(true);
    expect(rows.every(Object.isFrozen)).toBe(true);
  });
});
