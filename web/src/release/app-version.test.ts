import { describe, expect, test } from "vitest";
import { appVersion } from "./app-version";

describe("dated app version", () => {
  test("Given the current revision on 21 July 2026, when the release is identified, then YYMMDD and the daily revision are visible", () => {
    expect(appVersion).toBe("260721.03");
    expect(appVersion).toMatch(/^\d{6}\.\d{2}$/);
  });
});
