import { describe, expect, test, vi } from "vitest";
import { createSelectionActivity, SelectionTool } from "./selection-activity";

describe("selection activity", () => {
  test("Given one active selection tool, when another tries to start, then ownership stays exclusive until release", () => {
    const activity = createSelectionActivity();
    const listener = vi.fn();
    activity.subscribe(listener);

    expect(activity.acquire(SelectionTool.MagicWand)).toBe(true);
    expect(activity.acquire(SelectionTool.SmartSelect)).toBe(false);
    expect(activity.active()).toBe(SelectionTool.MagicWand);
    activity.release(SelectionTool.SmartSelect);
    expect(activity.active()).toBe(SelectionTool.MagicWand);
    activity.release(SelectionTool.MagicWand);
    expect(activity.acquire(SelectionTool.SmartSelect)).toBe(true);
    expect(listener).toHaveBeenCalledTimes(3);
  });
});
