import { access, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { describe, expect, test } from "vitest";

const projectRoot = resolve(import.meta.dirname, "..");
const submissionDocuments = [
  "README.md",
  "docs/ARCHITECTURE.md",
  "docs/SUBMISSION.md",
  "docs/THIRD_PARTY.md",
] as const;

describe("submission documents", () => {
  test("Given the English judge materials, when inspected, then required guidance has no draft markers", async () => {
    const readme = await readDocument("README.md");
    const submission = await readDocument("docs/SUBMISSION.md");

    expect(readme).toContain("## Built with Codex and GPT-5.6");
    expect(readme).toContain("## Try the production build locally");
    expect(submission).toContain("## Ready-to-paste Devpost description");
    expect(submission).toContain("## Judge path");
    expect(submission).toContain("## Pre-existing work disclosure");
    expect(`${readme}\n${submission}`).not.toMatch(/\b(?:TODO|TBD)\b/u);
  });

  test("Given the official Developer Tools requirements, when the judge materials are inspected, then every submission field has explicit guidance", async () => {
    const readme = await readDocument("README.md");
    const submission = await readDocument("docs/SUBMISSION.md");

    expect(readme).toContain("## Supported platform and judge access");
    expect(readme).toContain("desktop Google Chrome 150 or newer on macOS, Windows and Linux");
    expect(readme).toContain("No account, API key or paid service is required");
    expect(submission).toContain("public YouTube");
    expect(submission).toContain("Codex `/feedback` Session ID");
    expect(submission).toContain("https://github.com/MarvKalani/img2svg-studio");
    expect(submission).toContain("## Pre-existing work disclosure");
    expect(submission).toContain("Apache-2.0 recommended");
  });

  test("Given the judge materials, when local links are resolved, then every target exists", async () => {
    const missingTargets: string[] = [];

    for (const documentPath of submissionDocuments) {
      const source = await readDocument(documentPath);
      for (const target of markdownLinkTargets(source)) {
        if (isExternalTarget(target)) {
          continue;
        }
        const targetWithoutFragment = target.split("#", 1)[0];
        if (!targetWithoutFragment) {
          continue;
        }
        const absoluteTarget = resolve(projectRoot, dirname(documentPath), targetWithoutFragment);
        try {
          await access(absoluteTarget);
        } catch {
          missingTargets.push(`${documentPath} -> ${target}`);
        }
      }
    }

    expect(missingTargets).toEqual([]);
  });
});

async function readDocument(path: string): Promise<string> {
  return readFile(resolve(projectRoot, path), "utf8");
}

function markdownLinkTargets(source: string): string[] {
  return [...source.matchAll(/!?\[[^\]]*\]\(([^)]+)\)/gu)].flatMap((match) =>
    match[1] ? [match[1]] : [],
  );
}

function isExternalTarget(target: string): boolean {
  return target.startsWith("https://") || target.startsWith("mailto:");
}
