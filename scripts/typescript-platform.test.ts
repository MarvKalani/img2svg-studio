import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";

const projectRoot = resolve(import.meta.dirname, "..");

describe("TypeScript 7 platform contract", () => {
  test("Given the July 2026 toolchain, when dependencies are inspected, then stable native TypeScript is pinned", async () => {
    const rootPackage = await readJsonObject("package.json");
    const webPackage = await readJsonObject("web/package.json");

    expect(readProperty(rootPackage, "devDependencies", "typescript")).toBe("7.0.2");
    expect(readProperty(webPackage, "devDependencies", "typescript")).toBe("7.0.2");
    expect(readProperty(rootPackage, "scripts", "typecheck")).not.toContain("--checkers");
    expect(readProperty(rootPackage, "scripts", "typecheck:watch")).toContain("--watch");
  });

  test("Given all TypeScript projects, when configuration is inspected, then native-safe module and type boundaries stay explicit", async () => {
    const rootOptions = await readCompilerOptions("tsconfig.json");
    const webOptions = await readCompilerOptions("web/tsconfig.json");
    const mcpOptions = await readCompilerOptions("mcp/tsconfig.json");

    for (const options of [rootOptions, webOptions, mcpOptions]) {
      expect(options).toMatchObject({
        erasableSyntaxOnly: true,
        libReplacement: false,
        module: "ESNext",
        moduleDetection: "force",
        moduleResolution: "Bundler",
        noUncheckedSideEffectImports: true,
        skipLibCheck: true,
        strict: true,
        types: ["node"],
        verbatimModuleSyntax: true,
      });
    }
    expect(webOptions.lib).toEqual(["ES2024", "DOM"]);
    expect(mcpOptions).toMatchObject({ isolatedDeclarations: true, rootDir: "src" });
  });
});

async function readCompilerOptions(path: string): Promise<Record<string, unknown>> {
  const document = await readJsonObject(path);
  const options = document.compilerOptions;
  if (!isRecord(options)) throw new TypeError(`${path} has no compilerOptions object.`);
  return options;
}

async function readJsonObject(path: string): Promise<Record<string, unknown>> {
  const parsed: unknown = JSON.parse(await readFile(resolve(projectRoot, path), "utf8"));
  if (!isRecord(parsed)) throw new TypeError(`${path} must contain a JSON object.`);
  return parsed;
}

function readProperty(source: Record<string, unknown>, group: string, property: string): unknown {
  const values = source[group];
  return isRecord(values) ? values[property] : undefined;
}

function isRecord(candidate: unknown): candidate is Record<string, unknown> {
  return typeof candidate === "object" && candidate !== null;
}
