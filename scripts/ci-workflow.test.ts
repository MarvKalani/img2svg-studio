import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";

const projectRoot = resolve(import.meta.dirname, "..");

describe("quality workflow", () => {
  test("Given the repository checkout, when CI is inspected, then it runs the local check command", async () => {
    const workflow = await readFile(resolve(projectRoot, ".github/workflows/check.yml"), "utf8");
    const packageDocument: unknown = JSON.parse(
      await readFile(resolve(projectRoot, "package.json"), "utf8"),
    );

    expect(workflow).toContain("run: npm run check");
    expect(readCheckScript(packageDocument)).toBe(
      "npm run format:check && npm run lint && npm run check:lines && npm run typecheck && npm run test:all && npm run build && npm run check:rust",
    );
  });
});

function readCheckScript(packageDocument: unknown): unknown {
  if (!isRecord(packageDocument) || !isRecord(packageDocument.scripts)) {
    return undefined;
  }

  return packageDocument.scripts.check;
}

function isRecord(candidate: unknown): candidate is Record<string, unknown> {
  return typeof candidate === "object" && candidate !== null;
}
