import { describe, expect, test, vi } from "vitest";
import { createHistoryStore, type NewConversionRun } from "./history-store";
import { restoreSelectedRunOptions } from "./restore-run";

describe("restore run options", () => {
  test("Given two different runs, when the older one is restored, then its validated snapshot is applied without mutation", () => {
    const store = createHistoryStore();
    const olderRun = store.add(runInput(7, 4, 100));
    const newerRun = store.add(runInput(4, 12, 50));
    const applyOptions = vi.fn();
    store.select(olderRun.id);

    const restoredOptions = restoreSelectedRunOptions(store, applyOptions);

    expect(restoredOptions).toEqual({ colorPrecision: 7, filterSpeckle: 4, scalePercent: 100 });
    expect(applyOptions).toHaveBeenCalledExactlyOnceWith(restoredOptions);
    expect(store.runs()).toEqual([newerRun, olderRun]);
    expect(store.selected()).toBe(olderRun);
    expect(restoredOptions).not.toBe(olderRun.options);
  });

  test("Given no selected run, when restore is requested, then no options are applied", () => {
    const applyOptions = vi.fn();

    expect(restoreSelectedRunOptions(createHistoryStore(), applyOptions)).toBeUndefined();
    expect(applyOptions).not.toHaveBeenCalled();
  });
});

function runInput(
  colorPrecision: number,
  filterSpeckle: number,
  scalePercent: number,
): NewConversionRun {
  return {
    durationMilliseconds: 20,
    fileName: "circle.png",
    heightPixels: 256,
    options: { colorPrecision, filterSpeckle, scalePercent },
    pathCount: 1,
    svg: "<svg></svg>",
    widthPixels: 256,
  };
}
