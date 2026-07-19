import { describe, expect, test } from "vitest";
import { defaultConversionOptions } from "../conversion/conversion-options";
import type { ConversionRun } from "../history/history-store";
import { createCompareSelection } from "./compare-selection";

describe("compare selection", () => {
  test("Given two runs, when assigned to A and B, then both immutable snapshots remain distinct", () => {
    const selection = createCompareSelection();
    const firstRun = run(1);
    const secondRun = run(2);

    selection.assign("a", firstRun);
    const comparedRuns = selection.assign("b", secondRun);

    expect(comparedRuns).toEqual({ a: firstRun, b: secondRun });
    expect(Object.isFrozen(comparedRuns)).toBe(true);
  });

  test("Given a run already in A, when assigned to B, then it moves instead of occupying both slots", () => {
    const selection = createCompareSelection();
    const firstRun = run(1);
    selection.assign("a", firstRun);

    expect(selection.assign("b", firstRun)).toEqual({ a: undefined, b: firstRun });
  });
});

function run(id: number): ConversionRun {
  return Object.freeze({
    circleCount: 0,
    durationMilliseconds: 10,
    fileName: "circle.png",
    heightPixels: 256,
    id,
    options: defaultConversionOptions,
    pathCount: 1,
    svg: "<svg></svg>",
    widthPixels: 256,
  });
}
