import { describe, expect, test, vi } from "vitest";

import { downloadImageFile } from "./image-input.js";
import { VectorizeError } from "./vectorize-service.js";

const fileReference = Object.freeze({
  download_url: "https://files.example.test/image.png",
  file_id: "file_fixture",
});

describe("ChatGPT file input", () => {
  test("Given an authorized temporary HTTPS reference, when downloaded, then redirects are rejected and bytes are returned", async () => {
    const fetchFile = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(new Uint8Array([1, 2, 3]), {
        headers: { "content-length": "3", "content-type": "image/png" },
      }),
    );

    await expect(downloadImageFile(fileReference, fetchFile)).resolves.toEqual(
      new Uint8Array([1, 2, 3]),
    );
    expect(fetchFile).toHaveBeenCalledWith(
      new URL(fileReference.download_url),
      expect.objectContaining({ redirect: "error", signal: expect.any(AbortSignal) }),
    );
  });

  test("Given a non-HTTPS reference, when download starts, then it is rejected before fetch", async () => {
    const fetchFile = vi.fn<typeof fetch>();

    await expect(
      downloadImageFile(
        { ...fileReference, download_url: "http://files.example.test/a.png" },
        fetchFile,
      ),
    ).rejects.toEqual(expect.objectContaining<VectorizeError>({ code: "invalid_image_input" }));
    expect(fetchFile).not.toHaveBeenCalled();
  });

  test("Given a declared body above 25 MB, when download starts, then it is rejected before reading", async () => {
    const fetchFile = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(new Uint8Array([1]), {
        headers: { "content-length": String(25 * 1024 * 1024 + 1) },
      }),
    );

    await expect(downloadImageFile(fileReference, fetchFile)).rejects.toEqual(
      expect.objectContaining<VectorizeError>({ code: "image_too_large" }),
    );
  });
});
