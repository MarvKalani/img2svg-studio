import { describe, expect, test } from "vitest";
import { isRasterEditingMode, WorkspaceViewMode } from "./workspace-view-controller";

describe("raster editing workspace context", () => {
  test("Given each workspace mode, when raster editing availability is evaluated, then only raster views allow pixel tools", () => {
    expect(isRasterEditingMode(WorkspaceViewMode.Original)).toBe(true);
    expect(isRasterEditingMode(WorkspaceViewMode.Processed)).toBe(true);
    expect(isRasterEditingMode(WorkspaceViewMode.Comparison)).toBe(false);
    expect(isRasterEditingMode(WorkspaceViewMode.Svg)).toBe(false);
  });
});
