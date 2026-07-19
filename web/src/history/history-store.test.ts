import { describe, expect, test } from "vitest";
import { defaultConversionOptions } from "../conversion/conversion-options";
import { ImageVersionKind } from "../image/image-version";
import { createHistoryStore, type NewConversionRun } from "./history-store";

describe("history store", () => {
  test("Given eleven successful conversions, when recorded, then only the ten newest immutable runs remain", () => {
    const store = createHistoryStore();

    for (let runNumber = 1; runNumber <= 11; runNumber += 1) {
      store.add(runInput(runNumber));
    }

    const runs = store.runs();
    expect(runs).toHaveLength(10);
    expect(runs.map((run) => run.id)).toEqual([11, 10, 9, 8, 7, 6, 5, 4, 3, 2]);
    expect(Object.isFrozen(runs)).toBe(true);
    expect(runs.every((run) => Object.isFrozen(run) && Object.isFrozen(run.options))).toBe(true);
    expect(
      runs.every(
        (run) =>
          Object.isFrozen(run.options.shapeDetection) &&
          Object.isFrozen(run.options.shapeDetection.types),
      ),
    ).toBe(true);
  });

  test("Given stored runs, when an older run is selected, then its snapshot stays unchanged", () => {
    const store = createHistoryStore();
    const source = runInput(1);
    const stored = store.add(source);
    source.options.scalePercent = 50;

    const selected = store.select(stored.id);

    expect(selected).toBe(stored);
    expect(selected?.options.scalePercent).toBe(100);
    expect(store.selected()?.id).toBe(stored.id);
  });
});

function runInput(runNumber: number): NewConversionRun {
  return {
    circleCount: 0,
    durationMilliseconds: runNumber,
    ellipseCount: 0,
    fileName: "circle.png",
    heightPixels: 256,
    inputVersion: { id: 1, kind: ImageVersionKind.Original },
    lineCount: 0,
    options: { ...defaultConversionOptions },
    pathCount: 1,
    polygonCount: 0,
    rectangleCount: 0,
    svg: `<svg data-run="${String(runNumber)}"></svg>`,
    widthPixels: 256,
  };
}
