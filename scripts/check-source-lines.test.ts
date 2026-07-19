import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { findOversizedSourceFiles } from "./check-source-lines";

describe("source line policy", () => {
  test("Given a handwritten source with 1001 lines, when checked, then the file is rejected", async () => {
    const temporaryDirectory = await mkdtemp(join(tmpdir(), "img2svg-lines-"));
    const oversizedSourcePath = join(temporaryDirectory, "oversized.ts");

    try {
      await writeFile(oversizedSourcePath, "const line = 1;\n".repeat(1001), "utf8");

      const oversizedFiles = await findOversizedSourceFiles({
        maximumLines: 1000,
        rootDirectory: temporaryDirectory,
      });

      expect(oversizedFiles).toEqual([{ lineCount: 1001, path: "oversized.ts" }]);
    } finally {
      await rm(temporaryDirectory, { force: true, recursive: true });
    }
  });
});
