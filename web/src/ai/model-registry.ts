import {
  totalModelBytes,
  type BrowserExecutionBackend,
  type BrowserModelDefinition,
  type BrowserModelId,
} from "./model-manifest";

export type ModelRegistryState =
  | Readonly<{ status: "not-loaded" }>
  | Readonly<{ downloadedBytes: number; status: "downloading"; totalBytes: number }>
  | Readonly<{ status: "initializing" }>
  | Readonly<{ backend: BrowserExecutionBackend; status: "ready" }>
  | Readonly<{ status: "unloading" }>
  | Readonly<{ message: string; status: "error" }>;

export interface ModelRegistrySnapshot {
  readonly model: BrowserModelDefinition;
  readonly state: ModelRegistryState;
}

export type ModelLoadUpdate =
  | Readonly<{ downloadedBytes: number; phase: "downloading" }>
  | Readonly<{ phase: "initializing" }>;

export interface LoadedBrowserModel {
  readonly backend: BrowserExecutionBackend;
  readonly modelId: BrowserModelId;
  dispose(): Promise<void>;
}

export interface ModelLoadContext {
  readonly signal: AbortSignal;
}

export interface ModelLoader {
  load(
    model: BrowserModelDefinition,
    report: (update: ModelLoadUpdate) => void,
    context: ModelLoadContext,
  ): Promise<LoadedBrowserModel>;
}

export interface ModelRegistry {
  load(modelId: BrowserModelId): Promise<ModelRegistrySnapshot>;
  retry(modelId: BrowserModelId): Promise<ModelRegistrySnapshot>;
  snapshot(modelId: BrowserModelId): ModelRegistrySnapshot;
  snapshots(): readonly ModelRegistrySnapshot[];
  subscribe(listener: (snapshot: ModelRegistrySnapshot) => void): () => void;
  unload(modelId: BrowserModelId): Promise<ModelRegistrySnapshot>;
  withLoadedModel<Result>(
    modelId: BrowserModelId,
    operation: (model: LoadedBrowserModel) => Promise<Result>,
  ): Promise<Result>;
}

export function createModelRegistry(
  models: readonly BrowserModelDefinition[],
  loader: ModelLoader,
): ModelRegistry {
  const modelsById = new Map(models.map((model) => [model.id, model]));
  const states = new Map<BrowserModelId, ModelRegistryState>(
    models.map((model) => [model.id, notLoadedState()]),
  );
  const loadedModels = new Map<BrowserModelId, LoadedBrowserModel>();
  const activeLoads = new Map<BrowserModelId, Promise<ModelRegistrySnapshot>>();
  const loadAbortControllers = new Map<BrowserModelId, AbortController>();
  const activeUnloads = new Map<BrowserModelId, Promise<ModelRegistrySnapshot>>();
  const activeOperations = new Map<BrowserModelId, Set<Promise<unknown>>>();
  const listeners = new Set<(snapshot: ModelRegistrySnapshot) => void>();

  const modelFor = (modelId: BrowserModelId): BrowserModelDefinition => {
    const model = modelsById.get(modelId);
    if (!model) {
      throw new Error(`Unknown browser model: ${modelId}`);
    }
    return model;
  };

  const snapshot = (modelId: BrowserModelId): ModelRegistrySnapshot =>
    Object.freeze({ model: modelFor(modelId), state: states.get(modelId) ?? notLoadedState() });

  const update = (modelId: BrowserModelId, state: ModelRegistryState): void => {
    states.set(modelId, Object.freeze(state));
    const current = snapshot(modelId);
    for (const listener of listeners) {
      listener(current);
    }
  };

  const performLoad = async (
    modelId: BrowserModelId,
    abortController: AbortController,
  ): Promise<ModelRegistrySnapshot> => {
    const model = modelFor(modelId);
    const totalBytes = totalModelBytes(model);
    update(modelId, { downloadedBytes: 0, status: "downloading", totalBytes });
    let loadedModel: LoadedBrowserModel;
    try {
      loadedModel = await loader.load(
        model,
        (loadUpdate) => {
          if (abortController.signal.aborted) {
            return;
          }
          if (loadUpdate.phase === "initializing") {
            update(modelId, { status: "initializing" });
            return;
          }
          update(modelId, {
            downloadedBytes: Math.min(Math.max(loadUpdate.downloadedBytes, 0), totalBytes),
            status: "downloading",
            totalBytes,
          });
        },
        { signal: abortController.signal },
      );
    } catch (error) {
      update(
        modelId,
        abortController.signal.aborted
          ? notLoadedState()
          : { message: errorMessage(error), status: "error" },
      );
      return snapshot(modelId);
    }

    if (abortController.signal.aborted) {
      try {
        await loadedModel.dispose();
        update(modelId, notLoadedState());
      } catch (error) {
        update(modelId, { message: errorMessage(error), status: "error" });
      }
      return snapshot(modelId);
    }
    if (loadedModel.modelId !== modelId) {
      try {
        await loadedModel.dispose();
      } catch (error) {
        // Keep the handle so retry can finish releasing the unexpected resource.
        loadedModels.set(modelId, loadedModel);
        update(modelId, {
          message: `Das unerwartete Modell konnte nicht freigegeben werden: ${errorMessage(error)}`,
          status: "error",
        });
        return snapshot(modelId);
      }
      update(modelId, {
        message: "Das geladene Modell hat eine falsche Kennung.",
        status: "error",
      });
      return snapshot(modelId);
    }

    loadedModels.set(modelId, loadedModel);
    update(modelId, { backend: loadedModel.backend, status: "ready" });
    return snapshot(modelId);
  };

  const load = (modelId: BrowserModelId): Promise<ModelRegistrySnapshot> => {
    const activeLoad = activeLoads.get(modelId);
    if (activeLoad) {
      return activeLoad;
    }
    const activeUnload = activeUnloads.get(modelId);
    if (activeUnload) {
      return activeUnload.then(() => load(modelId));
    }
    if (states.get(modelId)?.status === "ready") {
      return Promise.resolve(snapshot(modelId));
    }

    // One shared promise makes repeated UI and future agent commands one physical load.
    const abortController = new AbortController();
    loadAbortControllers.set(modelId, abortController);
    const loadPromise = performLoad(modelId, abortController).finally(() => {
      activeLoads.delete(modelId);
      loadAbortControllers.delete(modelId);
    });
    activeLoads.set(modelId, loadPromise);
    return loadPromise;
  };

  const performUnload = async (modelId: BrowserModelId): Promise<ModelRegistrySnapshot> => {
    update(modelId, { status: "unloading" });
    loadAbortControllers.get(modelId)?.abort();
    await activeLoads.get(modelId);

    const operations = activeOperations.get(modelId);
    if (operations && operations.size > 0) {
      await Promise.allSettled(operations);
    }

    const loadedModel = loadedModels.get(modelId);
    if (!loadedModel) {
      update(modelId, notLoadedState());
      return snapshot(modelId);
    }
    try {
      await loadedModel.dispose();
      loadedModels.delete(modelId);
      update(modelId, notLoadedState());
    } catch (error) {
      update(modelId, { message: errorMessage(error), status: "error" });
    }
    return snapshot(modelId);
  };

  const unload = (modelId: BrowserModelId): Promise<ModelRegistrySnapshot> => {
    const activeUnload = activeUnloads.get(modelId);
    if (activeUnload) {
      return activeUnload;
    }
    if (!loadedModels.has(modelId) && !activeLoads.has(modelId)) {
      return Promise.resolve(snapshot(modelId));
    }

    const unloadPromise = performUnload(modelId).finally(() => {
      activeUnloads.delete(modelId);
    });
    activeUnloads.set(modelId, unloadPromise);
    return unloadPromise;
  };

  const retry = (modelId: BrowserModelId): Promise<ModelRegistrySnapshot> => {
    if (states.get(modelId)?.status !== "error") {
      return Promise.resolve(snapshot(modelId));
    }
    if (loadedModels.has(modelId)) {
      return unload(modelId).then((unloaded) =>
        unloaded.state.status === "not-loaded" ? load(modelId) : unloaded,
      );
    }
    const finishingAttempt = activeLoads.get(modelId);
    return finishingAttempt ? finishingAttempt.then(() => load(modelId)) : load(modelId);
  };

  const withLoadedModel = async <Result>(
    modelId: BrowserModelId,
    operation: (model: LoadedBrowserModel) => Promise<Result>,
  ): Promise<Result> => {
    const loadedModel = loadedModels.get(modelId);
    if (!loadedModel || states.get(modelId)?.status !== "ready") {
      throw new Error("Das Modell ist nicht geladen.");
    }
    const operationPromise = Promise.resolve().then(() => operation(loadedModel));
    const operations = activeOperations.get(modelId) ?? new Set<Promise<unknown>>();
    activeOperations.set(modelId, operations);
    operations.add(operationPromise);
    return operationPromise.finally(() => {
      operations.delete(operationPromise);
      if (operations.size === 0) {
        activeOperations.delete(modelId);
      }
    });
  };

  return Object.freeze({
    load,
    retry,
    snapshot,
    snapshots: () => models.map((model) => snapshot(model.id)),
    subscribe: (listener: (current: ModelRegistrySnapshot) => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    unload,
    withLoadedModel,
  });
}

function notLoadedState(): ModelRegistryState {
  return Object.freeze({ status: "not-loaded" });
}

function errorMessage(error: unknown): string {
  return error instanceof Error && error.message.trim().length > 0
    ? error.message
    : "Das Modell konnte nicht geladen werden.";
}
