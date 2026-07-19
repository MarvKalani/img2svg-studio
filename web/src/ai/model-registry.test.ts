import { describe, expect, it, vi } from "vitest";
import { browserModelManifest } from "./model-manifest";
import {
  createModelRegistry,
  type LoadedBrowserModel,
  type ModelLoadUpdate,
  type ModelLoader,
} from "./model-registry";

describe("model registry", () => {
  it("Given a controlled loader, when load fails, retries, and unloads in parallel, then work is deduplicated and disposal runs once", async () => {
    const firstAttempt = deferred<LoadedBrowserModel>();
    const retryAttempt = deferred<LoadedBrowserModel>();
    const attempts = [firstAttempt, retryAttempt];
    const reporters: ((update: ModelLoadUpdate) => void)[] = [];
    const dispose = vi.fn(async () => undefined);
    const loader: ModelLoader = {
      load: vi.fn((_model, report) => {
        reporters.push(report);
        return attempts.shift()!.promise;
      }),
    };
    const registry = createModelRegistry(browserModelManifest, loader);
    let retryFromError: ReturnType<typeof registry.retry> | undefined;
    registry.subscribe((snapshot) => {
      if (snapshot.state.status === "error" && !retryFromError) {
        retryFromError = registry.retry("modnet");
      }
    });

    const firstLoad = registry.load("modnet");
    const duplicateLoad = registry.load("modnet");

    expect(duplicateLoad).toBe(firstLoad);
    expect(loader.load).toHaveBeenCalledTimes(1);
    reporters[0]!({ phase: "downloading", downloadedBytes: 12_944_544 });
    expect(registry.snapshot("modnet").state).toMatchObject({
      status: "downloading",
      downloadedBytes: 12_944_544,
      totalBytes: 25_889_088,
    });
    firstAttempt.reject(new Error("controlled download failed"));
    await firstLoad;
    expect(registry.snapshot("modnet").state).toEqual({
      status: "error",
      message: "controlled download failed",
    });

    const retry = retryFromError;
    expect(retry).toBeDefined();
    await Promise.resolve();
    reporters[1]!({ phase: "initializing" });
    expect(registry.snapshot("modnet").state).toEqual({ status: "initializing" });
    retryAttempt.resolve({ backend: "webgpu", dispose });
    await retry!;
    expect(loader.load).toHaveBeenCalledTimes(2);
    expect(registry.snapshot("modnet").state).toEqual({
      status: "ready",
      backend: "webgpu",
    });

    const firstUnload = registry.unload("modnet");
    const duplicateUnload = registry.unload("modnet");

    expect(duplicateUnload).toBe(firstUnload);
    await firstUnload;
    expect(dispose).toHaveBeenCalledTimes(1);
    expect(registry.snapshot("modnet").state).toEqual({ status: "not-loaded" });
  });
});

interface Deferred<Value> {
  promise: Promise<Value>;
  reject(error: Error): void;
  resolve(value: Value): void;
}

function deferred<Value>(): Deferred<Value> {
  let resolvePromise!: (value: Value) => void;
  let rejectPromise!: (error: Error) => void;
  const promise = new Promise<Value>((resolve, reject) => {
    resolvePromise = resolve;
    rejectPromise = reject;
  });
  return { promise, reject: rejectPromise, resolve: resolvePromise };
}
