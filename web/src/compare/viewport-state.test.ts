import { describe, expect, test } from "vitest";
import { initialViewport, panViewport, pinchViewport, zoomViewportAt } from "./viewport-state";

describe("synchronized comparison viewport", () => {
  test("Given an anchored comparison point, when zooming, then that point stays under the pointer", () => {
    const zoomed = zoomViewportAt(initialViewport, 2, { x: 75, y: 25 }, { x: 50, y: 50 });

    expect(zoomed).toEqual({ offsetX: -25, offsetY: 25, scale: 2 });
  });

  test("Given a zoomed comparison, when panning, then one shared offset moves both sources", () => {
    expect(panViewport({ offsetX: 10, offsetY: -5, scale: 2 }, 12, 8)).toEqual({
      offsetX: 22,
      offsetY: 3,
      scale: 2,
    });
  });

  test("Given a pinch exceeds the supported range, when zooming, then scale remains usable", () => {
    expect(zoomViewportAt(initialViewport, 20, { x: 50, y: 50 }, { x: 50, y: 50 }).scale).toBe(8);
    expect(zoomViewportAt(initialViewport, 0.01, { x: 50, y: 50 }, { x: 50, y: 50 }).scale).toBe(
      0.25,
    );
  });

  test("Given two touch points, when their midpoint moves and distance doubles, then pinch pans and zooms one viewport", () => {
    const pinched = pinchViewport(
      initialViewport,
      50,
      100,
      { x: 50, y: 50 },
      { x: 60, y: 60 },
      { x: 50, y: 50 },
    );

    expect(pinched).toEqual({ offsetX: 10, offsetY: 10, scale: 2 });
  });
});
