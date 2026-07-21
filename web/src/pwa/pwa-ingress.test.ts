import { describe, expect, test, vi } from "vitest";

import { serviceWorkerScriptUrl, startPwaIngress, type PwaBrowserPort } from "./pwa-ingress";

function createBrowserPort(overrides: Partial<PwaBrowserPort> = {}): PwaBrowserPort {
  return {
    consumeLaunchFiles: vi.fn(),
    fetchSharedImage: vi.fn(),
    readSharedImageToken: () => undefined,
    registerServiceWorker: vi.fn(),
    removeSharedImageToken: vi.fn(),
    ...overrides,
  };
}

describe("PWA image ingress", () => {
  test("Given the current release, when the worker URL is created, then its update key matches the visible version", () => {
    expect(serviceWorkerScriptUrl()).toBe("/service-worker.js?version=260721.17");
  });

  test("Given a shared-image token, when the app starts, then the bridged file is loaded and the URL is cleaned", async () => {
    const sharedFile = new File([new Uint8Array([1, 2, 3])], "candy.png", {
      type: "image/png",
    });
    const loadOriginal = vi.fn().mockResolvedValue(true);
    const browser = createBrowserPort({
      fetchSharedImage: vi.fn().mockResolvedValue(sharedFile),
      readSharedImageToken: () => "shared-123",
    });

    await startPwaIngress({ loadOriginal, reportError: vi.fn() }, browser);

    expect(browser.registerServiceWorker).toHaveBeenCalledOnce();
    expect(browser.fetchSharedImage).toHaveBeenCalledWith("shared-123");
    expect(loadOriginal).toHaveBeenCalledWith(sharedFile);
    expect(browser.removeSharedImageToken).toHaveBeenCalledOnce();
  });

  test("Given a desktop file launch, when Chrome supplies the file, then the same image loader is reused", async () => {
    const launchedFile = new File([new Uint8Array([4, 5, 6])], "opened.webp", {
      type: "image/webp",
    });
    let launchConsumer: ((files: readonly File[]) => Promise<void>) | undefined;
    const browser = createBrowserPort({
      consumeLaunchFiles: (consumer) => {
        launchConsumer = consumer;
      },
    });
    const loadOriginal = vi.fn().mockResolvedValue(true);

    await startPwaIngress({ loadOriginal, reportError: vi.fn() }, browser);
    await launchConsumer?.([launchedFile]);

    expect(loadOriginal).toHaveBeenCalledWith(launchedFile);
  });

  test("Given an expired share, when no file can be fetched, then the user sees one useful error", async () => {
    const reportError = vi.fn();
    const browser = createBrowserPort({
      fetchSharedImage: vi.fn().mockRejectedValue(new Error("missing")),
      readSharedImageToken: () => "expired-123",
    });

    await startPwaIngress({ loadOriginal: vi.fn(), reportError }, browser);

    expect(reportError).toHaveBeenCalledWith(
      "Das geteilte Bild konnte nicht geöffnet werden. Bitte teile es erneut.",
    );
    expect(browser.removeSharedImageToken).toHaveBeenCalledOnce();
  });

  test("Given service-worker registration is unavailable, when the normal page starts, then manual use remains available", async () => {
    const browser = createBrowserPort({
      registerServiceWorker: vi.fn().mockRejectedValue(new Error("registration blocked")),
    });

    await expect(
      startPwaIngress({ loadOriginal: vi.fn(), reportError: vi.fn() }, browser),
    ).resolves.toBeUndefined();
  });
});
