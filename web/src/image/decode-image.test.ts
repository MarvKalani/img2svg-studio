import { describe, expect, test } from "vitest";
import {
  ImageLoadErrorCode,
  decodeImage,
  type ImageDecodePorts,
  type ImageFileInput,
} from "./decode-image";

describe("decodeImage", () => {
  test("Given a PNG, when decoded, then its dimensions and local preview are returned", async () => {
    let bitmapClosed = false;
    const ports: ImageDecodePorts = {
      createPreviewUrl: () => "blob:circle-preview",
      decodeBitmap: async () => ({
        close: () => {
          bitmapClosed = true;
        },
        height: 256,
        width: 256,
      }),
    };

    const result = await decodeImage(createFile("circle.png", "image/png"), ports);

    expect(result).toEqual({
      image: {
        fileName: "circle.png",
        heightPixels: 256,
        mimeType: "image/png",
        previewUrl: "blob:circle-preview",
        sizeBytes: 4,
        widthPixels: 256,
      },
      ok: true,
    });
    expect(bitmapClosed).toBe(true);
  });

  test("Given an unsupported file, when decoded, then it is rejected before browser decoding", async () => {
    let decoderCalled = false;
    const ports: ImageDecodePorts = {
      createPreviewUrl: () => "blob:unused",
      decodeBitmap: async () => {
        decoderCalled = true;
        throw new Error("must not run");
      },
    };

    const result = await decodeImage(createFile("notes.txt", "text/plain"), ports);

    expect(result).toEqual({
      error: {
        code: ImageLoadErrorCode.UnsupportedFormat,
        message: "Bitte wähle ein PNG-, JPEG- oder WebP-Bild.",
      },
      ok: false,
    });
    expect(decoderCalled).toBe(false);
  });

  test("Given damaged PNG bytes, when browser decoding fails, then a useful error is returned", async () => {
    const ports: ImageDecodePorts = {
      createPreviewUrl: () => "blob:unused",
      decodeBitmap: async () => {
        throw new Error("invalid image bytes");
      },
    };

    const result = await decodeImage(createFile("broken.png", "image/png"), ports);

    expect(result).toEqual({
      error: {
        code: ImageLoadErrorCode.DecodeFailed,
        message: "Das Bild ist beschädigt oder kann nicht gelesen werden.",
      },
      ok: false,
    });
  });
});

function createFile(fileName: string, mimeType: string): ImageFileInput {
  return { name: fileName, size: 4, type: mimeType };
}
