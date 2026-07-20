import { access, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { describe, expect, test } from "vitest";

const projectRoot = resolve(import.meta.dirname, "..");
const submissionDocuments = [
  "README.md",
  "LICENSE.md",
  "SYMBIOSIS.md",
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
    expect(submission).toContain("Business Source License 1.1");
  });

  test("Given the owner license decision, when the repository is inspected, then the grant and social pact are explicit", async () => {
    const license = await readDocument("LICENSE.md");
    const readme = await readDocument("README.md");
    const submission = await readDocument("docs/SUBMISSION.md");
    const symbiosis = await readDocument("SYMBIOSIS.md");

    expect(license).toContain("Business Source License 1.1");
    expect(license).toContain("**Licensed Work:** img2svg Studio");
    expect(license).toContain("**Change Date:** 2030-07-20");
    expect(license).toContain("**Change License:** Apache License, Version 2.0");
    expect(readme).toContain("[Business Source License 1.1](LICENSE.md)");
    expect(submission).toContain("Business Source License 1.1");
    expect(symbiosis).toContain("The legal license remains authoritative");
    expect(symbiosis).toContain("[SYMBIOSIS]");
  });

  test("Given the tracing foundation, when publication notices are inspected, then Studio and upstream rights are separated", async () => {
    const license = await readDocument("LICENSE.md");
    const inventory = await readDocument("docs/THIRD_PARTY.md");
    const publicPage = await readDocument("web/public/licenses.html");
    const vtracerLicense = await readDocument("THIRD_PARTY_LICENSES/VTRACER-MIT.txt");
    const visioncortexLicense = await readDocument("THIRD_PARTY_LICENSES/VISIONCORTEX-MIT.txt");
    const visioncortexAttributions = await readDocument(
      "THIRD_PARTY_LICENSES/VISIONCORTEX-ATTRIBUTIONS.md",
    );

    expect(license).toContain("Third-party components are excluded from the Licensed Work");
    expect(inventory).toContain("VTracer 0.6.5");
    expect(inventory).toContain("THIRD_PARTY_LICENSES/VTRACER-MIT.txt");
    expect(inventory).toContain("THIRD_PARTY_LICENSES/VISIONCORTEX-MIT.txt");
    expect(inventory).not.toContain("VTracer is not copied");
    expect(publicPage).toContain("VTracer 0.6.5");
    expect(publicPage).toContain("visioncortex 0.8.10");
    expect(publicPage).toContain("THIRD_PARTY_LICENSES/VTRACER-MIT.txt");
    expect(publicPage).toContain("THIRD_PARTY_LICENSES/VISIONCORTEX-MIT.txt");
    expect(vtracerLicense).toContain("Copyright (c) 2024 TSANG, Hao Fung");
    expect(visioncortexLicense).toContain("Copyright (c) 2026 TSANG, Hao Fung");
    expect(visioncortexAttributions).toContain("# Simplify.js");
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
