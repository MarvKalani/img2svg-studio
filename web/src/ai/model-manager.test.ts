import { describe, expect, it } from "vitest";
import type { ModelRegistrySnapshot } from "./model-registry";
import { modelManagerPresentation } from "./model-manager";
import { browserModelManifest } from "./model-manifest";

describe("model manager DOM contract", () => {
  it.each([
    [{ status: "not-loaded" }, "Nicht geladen", "Laden", null],
    [
      { status: "downloading", downloadedBytes: 12_944_544, totalBytes: 25_889_088 },
      "50 % geladen",
      null,
      50,
    ],
    [{ status: "initializing" }, "Initialisierung …", null, null],
    [
      { status: "error", message: "controlled download failed" },
      "Fehler",
      "Erneut versuchen",
      null,
    ],
    [{ status: "ready", backend: "webgpu" }, "Bereit · WebGPU", "Entladen", null],
  ] as const)(
    "Given state $status, when presented, then its status, action, and progress are explicit",
    (state, statusText, actionLabel, progressPercent) => {
      const snapshot = {
        model: browserModelManifest[0]!,
        state,
      } as ModelRegistrySnapshot;

      expect(modelManagerPresentation(snapshot)).toMatchObject({
        actionLabel,
        errorMessage: state.status === "error" ? state.message : null,
        progressPercent,
        statusText,
      });
    },
  );
});
