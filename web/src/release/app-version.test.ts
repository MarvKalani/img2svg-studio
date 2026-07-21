import { describe, expect, test } from "vitest";
import { appVersion, versionedAssetFileNames } from "./app-version";

describe("dated app version", () => {
  test("Given the current revision on 21 July 2026, when the release is identified, then YYMMDD and the daily revision are visible", () => {
    expect(appVersion).toBe("260721.13");
    expect(appVersion).toMatch(/^\d{6}\.\d{2}$/);
  });

  test("Given a production asset, when Vite names it, then the visible version busts its cache", () => {
    expect(versionedAssetFileNames).toEqual({
      asset: "assets/[name]-v260721.13-[hash][extname]",
      chunk: "assets/[name]-v260721.13-[hash].js",
      entry: "assets/[name]-v260721.13-[hash].js",
    });
  });
});
