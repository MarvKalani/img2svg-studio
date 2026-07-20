import { describe, expect, test } from "vitest";
import { translateGermanText } from "./localization";

describe("German to English UI translation", () => {
  test.each([
    ["Variante übernehmen", "Accept variant"],
    ["  Noch kein Bild  ", "  No image yet  "],
    ["3 Varianten", "3 variants"],
    ["1 Pfad · 2 Kreise", "1 path · 2 circles"],
    ["Run 4 ausgewählt · 512 × 512 SVG", "Run 4 selected · 512 × 512 SVG"],
    ["Geladenes Rasterbild logo.png", "Loaded raster image logo.png"],
    ["Entladen", "Unload"],
    ["19,76 MiB · Apache-2.0", "19.76 MiB · Apache-2.0"],
    ["Maske mit 3 Punkten aktualisiert · WebGPU", "Mask updated with 3 points · WebGPU"],
  ])("translates %s", (german, english) => {
    expect(translateGermanText(german)).toBe(english);
  });
});
