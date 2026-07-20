import { describe, expect, test } from "vitest";
import { defaultConversionOptions } from "../conversion/conversion-options";
import type { ConversionRun } from "../history/history-store";
import { ImageVersionKind } from "../image/image-version";
import { createCompareSelection } from "./compare-selection";
import { originalSource, runSource } from "./comparison-source";

describe("compare selection", () => {
  test("Given two runs, when assigned to A and B, then both immutable snapshots remain distinct", () => {
    const selection = createCompareSelection();
    const firstRun = run(1);
    const secondRun = run(2);

    selection.assign("a", runSource(firstRun));
    const comparedRuns = selection.assign("b", runSource(secondRun));

    expect(comparedRuns).toEqual({ a: runSource(firstRun), b: runSource(secondRun) });
    expect(Object.isFrozen(comparedRuns)).toBe(true);
  });

  test("Given a run already in A, when assigned to B, then it moves instead of occupying both slots", () => {
    const selection = createCompareSelection();
    const firstRun = run(1);
    selection.assign("a", runSource(firstRun));

    expect(selection.assign("b", runSource(firstRun))).toEqual({
      a: undefined,
      b: runSource(firstRun),
    });
  });

  test("Given two compared runs, when the input image changes, then both slots are cleared", () => {
    const selection = createCompareSelection();
    selection.assign("a", runSource(run(1)));
    selection.assign("b", runSource(run(2)));

    expect(selection.clear()).toEqual({});
    expect(selection.current()).toEqual({});
  });

  test("Given the original and one run, when assigned to A and B, then both comparison sources remain selectable", () => {
    const selection = createCompareSelection();
    const original = originalSource({
      file: new File([], "circle.png", { type: "image/png" }),
      metadata: {
        fileName: "circle.png",
        heightPixels: 256,
        mimeType: "image/png",
        previewUrl: "blob:circle",
        sizeBytes: 0,
        widthPixels: 256,
      },
      version: { id: 1, kind: ImageVersionKind.Original },
    });
    const converted = runSource(run(1));

    selection.assign("a", original);

    expect(selection.assign("b", converted)).toEqual({ a: original, b: converted });
  });
});

function run(id: number): ConversionRun {
  return Object.freeze({
    circleCount: 0,
    durationMilliseconds: 10,
    ellipseCount: 0,
    fileName: "circle.png",
    heightPixels: 256,
    id,
    inputVersion: { id: 1, kind: ImageVersionKind.Original },
    lineCount: 0,
    options: defaultConversionOptions,
    pathCount: 1,
    polygonCount: 0,
    rectangleCount: 0,
    svg: "<svg></svg>",
    widthPixels: 256,
  });
}
