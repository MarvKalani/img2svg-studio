import { readdir, readFile } from "node:fs/promises";
import { extname, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";

export interface SourceLinePolicy {
  maximumLines: number;
  rootDirectory: string;
}

export interface OversizedSourceFile {
  lineCount: number;
  path: string;
}

const ignoredDirectoryNames = new Set([
  ".git",
  "artifacts",
  "coverage",
  "dist",
  "node_modules",
  "playwright-report",
  "target",
  "test-results",
  "wasm-pkg",
]);

const sourceExtensions = new Set([
  ".cjs",
  ".css",
  ".html",
  ".js",
  ".jsx",
  ".mjs",
  ".rs",
  ".ts",
  ".tsx",
]);

export async function findOversizedSourceFiles(
  policy: SourceLinePolicy,
): Promise<OversizedSourceFile[]> {
  const absoluteRoot = resolve(policy.rootDirectory);
  const sourcePaths = await collectSourcePaths(absoluteRoot);
  const oversizedFiles: OversizedSourceFile[] = [];

  for (const sourcePath of sourcePaths) {
    const source = await readFile(sourcePath, "utf8");
    const lineCount = countLines(source);

    if (lineCount > policy.maximumLines) {
      oversizedFiles.push({
        lineCount,
        path: relative(absoluteRoot, sourcePath),
      });
    }
  }

  return oversizedFiles.sort((left, right) => left.path.localeCompare(right.path));
}

async function collectSourcePaths(directory: string): Promise<string[]> {
  const directoryEntries = await readdir(directory, { withFileTypes: true });
  const sourcePaths: string[] = [];

  for (const directoryEntry of directoryEntries) {
    const entryPath = resolve(directory, directoryEntry.name);

    if (directoryEntry.isDirectory()) {
      if (!ignoredDirectoryNames.has(directoryEntry.name)) {
        sourcePaths.push(...(await collectSourcePaths(entryPath)));
      }
      continue;
    }

    if (directoryEntry.isFile() && sourceExtensions.has(extname(directoryEntry.name))) {
      sourcePaths.push(entryPath);
    }
  }

  return sourcePaths;
}

function countLines(source: string): number {
  const contentWithoutFinalNewline = source.endsWith("\n") ? source.slice(0, -1) : source;
  return contentWithoutFinalNewline.length === 0
    ? 0
    : contentWithoutFinalNewline.split(/\r?\n/u).length;
}

async function runSourceLineCheck(): Promise<void> {
  const oversizedFiles = await findOversizedSourceFiles({
    maximumLines: 1000,
    rootDirectory: process.cwd(),
  });

  if (oversizedFiles.length > 0) {
    const details = oversizedFiles
      .map(({ lineCount, path }) => `${path}: ${lineCount} lines`)
      .join("\n");
    throw new Error(`Handwritten source files exceed 1000 lines:\n${details}`);
  }

  console.log("Source line limit: passed");
}

const executedPath = process.argv[1];
if (executedPath && import.meta.url === pathToFileURL(executedPath).href) {
  await runSourceLineCheck();
}
