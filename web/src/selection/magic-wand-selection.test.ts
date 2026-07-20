import { describe, expect, test } from "vitest";
import type { RasterPixels } from "../conversion/read-raster-pixels";
import { createMagicWandMask, removeMagicWandSelection } from "./magic-wand-selection";

describe("magic wand selection", () => {
  test("Given disconnected matching colors, when one region is selected, then the wand does not cross a different color", () => {
    const input = raster([[white, black, white]]);

    const mask = createMagicWandMask(input, {
      sensitivityPercent: 0,
      xPixels: 0,
      yPixels: 0,
    });

    expect([...mask.selected]).toEqual([1, 0, 0]);
    expect(mask.selectedPixelCount).toBe(1);
  });

  test("Given an anti-aliased edge, when sensitivity increases, then nearby seed colors join without leaking into the object", () => {
    const input = raster([[white, nearWhite, gray, black]]);

    const exact = createMagicWandMask(input, {
      sensitivityPercent: 0,
      xPixels: 0,
      yPixels: 0,
    });
    const tolerant = createMagicWandMask(input, {
      sensitivityPercent: 10,
      xPixels: 0,
      yPixels: 0,
    });

    expect([...exact.selected]).toEqual([1, 0, 0, 0]);
    expect([...tolerant.selected]).toEqual([1, 1, 0, 0]);
  });

  test("Given a visible selection, when it is removed, then only selected alpha changes and the source remains untouched", () => {
    const input = raster([
      [white, white],
      [black, black],
    ]);
    const mask = createMagicWandMask(input, {
      sensitivityPercent: 0,
      xPixels: 0,
      yPixels: 0,
    });

    const result = removeMagicWandSelection(input, mask);

    expect([...result.rgba]).toEqual([
      255, 255, 255, 0, 255, 255, 255, 0, 0, 0, 0, 255, 0, 0, 0, 255,
    ]);
    expect([...input.rgba]).toEqual([
      255, 255, 255, 255, 255, 255, 255, 255, 0, 0, 0, 255, 0, 0, 0, 255,
    ]);
  });
});

type Rgba = readonly [red: number, green: number, blue: number, alpha: number];

const black: Rgba = [0, 0, 0, 255];
const gray: Rgba = [180, 180, 180, 255];
const nearWhite: Rgba = [240, 240, 240, 255];
const white: Rgba = [255, 255, 255, 255];

function raster(rows: readonly (readonly Rgba[])[]): RasterPixels {
  const widthPixels = rows[0]?.length ?? 0;
  if (widthPixels === 0 || rows.some((row) => row.length !== widthPixels)) {
    throw new Error("The test raster must be rectangular and non-empty.");
  }
  return {
    heightPixels: rows.length,
    rgba: new Uint8Array(rows.flat(2)),
    widthPixels,
  };
}
