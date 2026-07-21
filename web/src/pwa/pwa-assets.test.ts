import { readFileSync } from "node:fs";

import { describe, expect, test } from "vitest";

interface PwaManifest {
  display?: string;
  file_handlers?: readonly unknown[];
  icons?: readonly { sizes?: string }[];
  share_target?: { enctype?: string; method?: string };
}

const publicDirectory = new URL("../../public/", import.meta.url);

describe("PWA assets", () => {
  test("Given the production manifest, then install, share and desktop file entry points are declared", () => {
    const manifest = JSON.parse(
      readFileSync(new URL("manifest.webmanifest", publicDirectory), "utf8"),
    ) as PwaManifest;

    expect(manifest.display).toBe("standalone");
    expect(manifest.share_target).toMatchObject({
      enctype: "multipart/form-data",
      method: "POST",
    });
    expect(manifest.file_handlers).toHaveLength(1);
    expect(manifest.icons?.map((icon) => icon.sizes)).toEqual(
      expect.arrayContaining(["192x192", "512x512"]),
    );
  });

  test("Given the share-target worker, then shared bytes use a one-time cache bridge", () => {
    const workerSource = readFileSync(new URL("service-worker.js", publicDirectory), "utf8");

    expect(workerSource).toContain("new URL(self.location.href).searchParams.get");
    expect(workerSource).toContain("`${shareBridgePrefix}${workerVersion}`");
    expect(workerSource).not.toContain("img2svg-share-bridge-v1");
    expect(workerSource).toContain("request.formData()");
    expect(workerSource).toContain("cache.delete(request)");
    expect(workerSource).toContain("Response.redirect");
  });

  test("Given Cloudflare serves the build, then HTML revalidates while versioned assets stay immutable", () => {
    const headers = readFileSync(new URL("_headers", publicDirectory), "utf8");

    expect(headers).toContain("/*\n  Cache-Control: no-cache");
    expect(headers).toContain(
      "/assets/*\n  ! Cache-Control\n  Cache-Control: public, max-age=31556952, immutable",
    );
  });
});
