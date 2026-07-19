import { describe, expect, it, vi } from "vitest";
import { createModnetAdapter, type ModnetSession } from "./modnet-adapter";
import {
  modelArtifactUrl,
  prepareModelArtifactCache,
  type ModelArtifactCache,
  type ModelArtifactProgress,
} from "./model-artifact-cache";
import { browserModelManifest, type BrowserModelDefinition } from "./model-manifest";
import { createModelRegistry, type LoadedBrowserModel, type ModelLoader } from "./model-registry";

describe("model lifecycle", () => {
  it("Given active inference, when unload is requested twice, then it waits and disposes once", async () => {
    const inference = deferred<void>();
    const dispose = vi.fn(async () => undefined);
    const loadedModel: LoadedBrowserModel = { backend: "webgpu", dispose, modelId: "modnet" };
    const loader: ModelLoader = { load: vi.fn(async () => loadedModel) };
    const registry = createModelRegistry(browserModelManifest, loader);
    await registry.load("modnet");

    const activeInference = registry.withLoadedModel("modnet", async () => {
      await inference.promise;
      return "finished";
    });
    const firstUnload = registry.unload("modnet");
    const duplicateUnload = registry.unload("modnet");

    expect(duplicateUnload).toBe(firstUnload);
    expect(registry.snapshot("modnet").state).toEqual({ status: "unloading" });
    expect(dispose).not.toHaveBeenCalled();

    inference.resolve();
    await expect(activeInference).resolves.toBe("finished");
    await firstUnload;
    expect(dispose).toHaveBeenCalledOnce();
    expect(registry.snapshot("modnet").state).toEqual({ status: "not-loaded" });
  });

  it("Given an active download, when it is cancelled, then it returns to loadable state", async () => {
    const dispose = vi.fn(async () => undefined);
    let attempt = 0;
    const loader: ModelLoader = {
      load: vi.fn(async (_model, _report, context) => {
        attempt += 1;
        if (attempt === 1) {
          await rejectOnAbort(context.signal);
        }
        return { backend: "wasm" as const, dispose, modelId: "modnet" as const };
      }),
    };
    const registry = createModelRegistry(browserModelManifest, loader);

    const download = registry.load("modnet");
    const cancellation = registry.unload("modnet");
    await Promise.all([download, cancellation]);

    expect(registry.snapshot("modnet").state).toEqual({ status: "not-loaded" });
    await registry.load("modnet");
    expect(registry.snapshot("modnet").state).toEqual({ backend: "wasm", status: "ready" });
  });

  it("Given an offline initialization error, when retried, then it leaves error and becomes ready", async () => {
    let attempt = 0;
    const loader: ModelLoader = {
      load: vi.fn(async (_model, report) => {
        attempt += 1;
        report({ phase: "initializing" });
        if (attempt === 1) {
          throw new Error("Netzwerk nicht erreichbar.");
        }
        return {
          backend: "webgpu" as const,
          dispose: async () => undefined,
          modelId: "modnet" as const,
        };
      }),
    };
    const registry = createModelRegistry(browserModelManifest, loader);

    await registry.load("modnet");
    expect(registry.snapshot("modnet").state).toEqual({
      message: "Netzwerk nicht erreichbar.",
      status: "error",
    });

    await registry.retry("modnet");
    expect(registry.snapshot("modnet").state).toEqual({
      backend: "webgpu",
      status: "ready",
    });
  });

  it("Given a damaged cached artifact, when prepared, then it is replaced by verified bytes", async () => {
    const verifiedBytes = new Uint8Array([1, 2, 3, 4]);
    const model = await tinyModel(verifiedBytes);
    const artifactUrl = modelArtifactUrl(model, model.files[0]!);
    const memoryCache = createMemoryCache([[artifactUrl, new Response(new Uint8Array([9, 9]))]]);
    const fetchArtifact = vi.fn(async () => new Response(verifiedBytes, { status: 200 }));
    const progress: ModelArtifactProgress[] = [];

    await prepareModelArtifactCache(
      model,
      (update) => progress.push(update),
      new AbortController().signal,
      { cache: memoryCache.cache, fetchArtifact },
    );

    expect(memoryCache.deleteArtifact).toHaveBeenCalledWith(artifactUrl);
    expect(fetchArtifact).toHaveBeenCalledOnce();
    expect(progress.at(-1)).toEqual({
      file: "model.bin",
      loaded: verifiedBytes.length,
      status: "done",
    });
    await expect(memoryCache.cache.match(artifactUrl)).resolves.toBeDefined();
    const cached = await memoryCache.cache.match(artifactUrl);
    expect(new Uint8Array(await cached!.arrayBuffer())).toEqual(verifiedBytes);
  });

  it("Given repeated dispose calls, when MODNet owns one session, then the session closes once", async () => {
    const dispose = vi.fn(async () => undefined);
    const session: ModnetSession = {
      dispose,
      predictAlpha: async () => new Float32Array(),
    };
    const adapter = createModnetAdapter("wasm", session);

    await Promise.all([adapter.dispose(), adapter.dispose()]);

    expect(dispose).toHaveBeenCalledOnce();
  });

  it("Given a failed session close, when retried, then MODNet releases the session", async () => {
    const dispose = vi
      .fn<() => Promise<void>>()
      .mockRejectedValueOnce(new Error("Sitzung noch belegt."))
      .mockResolvedValueOnce(undefined);
    const adapter = createModnetAdapter("wasm", {
      dispose,
      predictAlpha: async () => new Float32Array(),
    });

    await expect(adapter.dispose()).rejects.toThrow("Sitzung noch belegt.");
    await expect(adapter.dispose()).resolves.toBeUndefined();

    expect(dispose).toHaveBeenCalledTimes(2);
  });

  it("Given an unexpected model that fails cleanup, when retried, then cleanup and load recover", async () => {
    const disposeUnexpected = vi
      .fn<() => Promise<void>>()
      .mockRejectedValueOnce(new Error("Freigabe fehlgeschlagen."))
      .mockResolvedValueOnce(undefined);
    const recoveredModel: LoadedBrowserModel = {
      backend: "webgpu",
      dispose: async (): Promise<void> => undefined,
      modelId: "modnet",
    };
    let attempt = 0;
    const loader: ModelLoader = {
      load: vi.fn(async () => {
        attempt += 1;
        return attempt === 1
          ? { backend: "wasm" as const, dispose: disposeUnexpected, modelId: "slimsam" as const }
          : recoveredModel;
      }),
    };
    const registry = createModelRegistry(browserModelManifest, loader);

    await registry.load("modnet");
    expect(registry.snapshot("modnet").state.status).toBe("error");

    await registry.retry("modnet");
    expect(disposeUnexpected).toHaveBeenCalledTimes(2);
    expect(registry.snapshot("modnet").state).toEqual({
      backend: "webgpu",
      status: "ready",
    });
  });
});

async function tinyModel(bytes: Uint8Array<ArrayBuffer>): Promise<BrowserModelDefinition> {
  const template = browserModelManifest[0]!;
  return {
    ...template,
    files: [
      {
        bytes: bytes.length,
        path: "model.bin",
        sha256: await sha256(bytes),
      },
    ],
  };
}

async function sha256(bytes: Uint8Array<ArrayBuffer>): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function createMemoryCache(initial: readonly (readonly [string, Response])[]): Readonly<{
  cache: ModelArtifactCache;
  deleteArtifact: ReturnType<typeof vi.fn>;
}> {
  const entries = new Map(initial);
  const deleteArtifact = vi.fn(async (request: RequestInfo | URL) =>
    entries.delete(String(request)),
  );
  return {
    cache: {
      delete: deleteArtifact,
      match: async (request) => entries.get(String(request))?.clone(),
      put: async (request, response) => {
        entries.set(String(request), response.clone());
      },
    },
    deleteArtifact,
  };
}

function rejectOnAbort(signal: AbortSignal): Promise<never> {
  return new Promise((_, reject) => {
    signal.addEventListener("abort", () => reject(new DOMException("Abgebrochen", "AbortError")), {
      once: true,
    });
  });
}

interface Deferred<Value> {
  readonly promise: Promise<Value>;
  resolve(value: Value): void;
}

function deferred<Value>(): Deferred<Value> {
  let resolvePromise!: (value: Value) => void;
  const promise = new Promise<Value>((resolve) => {
    resolvePromise = resolve;
  });
  return { promise, resolve: resolvePromise };
}
