import { describe, expect, it } from "vitest";
import { browserModelManifest, totalModelBytes, validateModelManifest } from "./model-manifest";

describe("browser model manifest", () => {
  it("Given published MODNet and SAM entries, when validated, then revisions, artifacts, IO, runtime, and commercial licenses are complete", () => {
    const validatedModels = validateModelManifest(browserModelManifest);
    const [modnet, slimSam] = validatedModels;
    if (!modnet || !slimSam) {
      throw new Error("The browser model manifest must contain MODNet and SlimSAM");
    }

    expect(validatedModels.map((model) => model.id)).toEqual(["modnet", "slimsam"]);
    expect(totalModelBytes(modnet)).toBe(25_889_088);
    expect(totalModelBytes(slimSam)).toBe(20_721_620);
  });

  it.each([
    ["missing revision", (model: Record<string, unknown>) => delete model.revision],
    ["missing files", (model: Record<string, unknown>) => (model.files = [])],
    [
      "missing checksum",
      (model: Record<string, unknown>) => {
        const files = model.files as Record<string, unknown>[];
        files[0]!.sha256 = "";
      },
    ],
    [
      "missing size",
      (model: Record<string, unknown>) => {
        const files = model.files as Record<string, unknown>[];
        files[0]!.bytes = 0;
      },
    ],
    [
      "non-commercial license",
      (model: Record<string, unknown>) => (model.license = "cc-by-nc-4.0"),
    ],
    ["missing input contract", (model: Record<string, unknown>) => (model.inputs = [])],
    [
      "missing runtime version",
      (model: Record<string, unknown>) => {
        const runtime = model.runtime as Record<string, unknown>;
        runtime.transformersVersion = "";
      },
    ],
  ])("Given %s, when validated, then the model entry is rejected", (_case, makeInvalid) => {
    const invalidManifest = structuredClone(browserModelManifest) as unknown as Record<
      string,
      unknown
    >[];
    makeInvalid(invalidManifest[0]!);

    expect(() => validateModelManifest(invalidManifest)).toThrowError();
  });
});
