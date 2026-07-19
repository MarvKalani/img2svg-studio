import { describe, expect, test, vi } from "vitest";
import { ImageVersionKind } from "./image-version";
import { createImageStore } from "./image-store";

describe("image store", () => {
  test("Given no original, when an AI result is appended, then the invalid version chain is rejected", () => {
    const store = createImageStore();

    expect(() => store.appendAiVersion(imageFile("orphan.png"), metadata("blob:orphan"))).toThrow(
      "requires an original image",
    );
  });

  test("Given an original and an AI result, when the original is restored, then versions stay explicit and only the derived preview is released", () => {
    const revokePreviewUrl = vi.fn();
    const store = createImageStore(revokePreviewUrl);
    const original = store.replaceOriginal(imageFile("portrait.png"), metadata("blob:original"));
    const derived = store.appendAiVersion(
      imageFile("portrait-freigestellt.png"),
      metadata("blob:derived"),
    );

    expect(original.version).toEqual({ id: 1, kind: ImageVersionKind.Original });
    expect(derived.version).toEqual({ id: 2, kind: ImageVersionKind.AiResult });
    expect(store.original()).toBe(original);
    expect(store.restoreOriginal()).toBe(original);
    expect(store.current()).toBe(original);
    expect(revokePreviewUrl).toHaveBeenCalledExactlyOnceWith("blob:derived");
  });

  test("Given an active AI result, when a new original replaces it, then both old preview URLs are released once", () => {
    const revokePreviewUrl = vi.fn();
    const store = createImageStore(revokePreviewUrl);
    store.replaceOriginal(imageFile("first.png"), metadata("blob:first"));
    store.appendAiVersion(imageFile("first-ai.png"), metadata("blob:first-ai"));

    const next = store.replaceOriginal(imageFile("next.png"), metadata("blob:next"));

    expect(next.version).toEqual({ id: 3, kind: ImageVersionKind.Original });
    expect(revokePreviewUrl.mock.calls).toEqual([["blob:first-ai"], ["blob:first"]]);
  });
});

function imageFile(name: string): File {
  return new File([new Uint8Array([0])], name, { type: "image/png" });
}

function metadata(previewUrl: string) {
  return {
    fileName: "portrait.png",
    heightPixels: 256,
    mimeType: "image/png" as const,
    previewUrl,
    sizeBytes: 1,
    widthPixels: 256,
  };
}
