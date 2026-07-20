import "./model-manager.css";
import { type BrowserModelId, type BrowserModelPurpose, totalModelBytes } from "./model-manifest";
import type { ModelRegistry, ModelRegistrySnapshot } from "./model-registry";

type ModelAction = "load" | "retry" | "unload";

export interface ModelManagerPresentation {
  readonly action: ModelAction | null;
  readonly actionLabel: string | null;
  readonly errorMessage: string | null;
  readonly progressPercent: number | null;
  readonly statusText: string;
}

export function initializeModelManager(
  registry: ModelRegistry,
  visibleModelIds: ReadonlySet<BrowserModelId>,
): void {
  const manager = requireElement("#model-manager", HTMLElement);
  const toggle = requireElement("#model-manager-toggle", HTMLButtonElement);
  const render = (): void => {
    manager.replaceChildren(
      ...registry
        .snapshots()
        .filter((snapshot) => visibleModelIds.has(snapshot.model.id))
        .map((snapshot) => modelCard(snapshot, registry)),
    );
  };

  toggle.addEventListener("click", () => {
    const expanded = toggle.getAttribute("aria-expanded") === "true";
    toggle.setAttribute("aria-expanded", String(!expanded));
    manager.hidden = expanded;
  });
  registry.subscribe(render);
  render();
}

export function modelManagerPresentation(
  snapshot: ModelRegistrySnapshot,
): ModelManagerPresentation {
  switch (snapshot.state.status) {
    case "not-loaded":
      return presentation("Nicht geladen", "Laden", "load");
    case "downloading": {
      const progressPercent = Math.round(
        (snapshot.state.downloadedBytes / snapshot.state.totalBytes) * 100,
      );
      return {
        ...presentation(`${String(progressPercent)} % geladen`, "Abbrechen", "unload"),
        progressPercent,
      };
    }
    case "initializing":
      return presentation("Initialisierung …", "Abbrechen", "unload");
    case "ready":
      return presentation(`Bereit · ${backendLabel(snapshot.state.backend)}`, "Entladen", "unload");
    case "unloading":
      return presentation("Wird entladen …", null, null);
    case "error":
      return {
        ...presentation("Fehler", "Erneut versuchen", "retry"),
        errorMessage: snapshot.state.message,
      };
  }
}

function presentation(
  statusText: string,
  actionLabel: string | null,
  action: ModelAction | null,
): ModelManagerPresentation {
  return { action, actionLabel, errorMessage: null, progressPercent: null, statusText };
}

function modelCard(snapshot: ModelRegistrySnapshot, registry: ModelRegistry): HTMLElement {
  const view = modelManagerPresentation(snapshot);
  const card = document.createElement("div");
  card.className = "model-card";
  card.dataset.modelId = snapshot.model.id;
  card.dataset.modelState = snapshot.state.status;
  card.setAttribute("role", "listitem");

  const heading = document.createElement("div");
  heading.className = "model-heading";
  const icon = document.createElement("span");
  icon.className = "model-icon";
  icon.setAttribute("aria-hidden", "true");
  icon.textContent = snapshot.model.id === "modnet" ? "◌" : "⌁";
  const names = document.createElement("span");
  const title = document.createElement("strong");
  title.textContent = purposeLabel(snapshot.model.purpose);
  const modelName = document.createElement("small");
  modelName.textContent = snapshot.model.label;
  names.append(title, modelName);
  heading.append(icon, names);

  const metadata = document.createElement("small");
  metadata.className = "model-metadata";
  metadata.textContent = `${formatMebibytes(totalModelBytes(snapshot.model))} · Apache-2.0`;

  const status = document.createElement("output");
  status.className = "model-status";
  status.setAttribute("aria-live", "polite");
  status.textContent = view.statusText;

  card.append(heading, metadata, status);
  if (view.progressPercent !== null) {
    const progress = document.createElement("progress");
    progress.max = 100;
    progress.value = view.progressPercent;
    progress.setAttribute("aria-label", `${snapshot.model.label} Downloadfortschritt`);
    card.append(progress);
  }
  if (view.errorMessage) {
    const error = document.createElement("p");
    error.className = "model-error";
    error.setAttribute("role", "alert");
    error.textContent = view.errorMessage;
    card.append(error);
  }
  if (view.action && view.actionLabel) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "model-action";
    button.textContent = view.actionLabel;
    button.setAttribute("aria-label", `${view.actionLabel}: ${snapshot.model.label}`);
    button.addEventListener("click", () => {
      const operation =
        view.action === "load"
          ? registry.load(snapshot.model.id)
          : view.action === "retry"
            ? registry.retry(snapshot.model.id)
            : registry.unload(snapshot.model.id);
      void operation;
    });
    card.append(button);
  }
  return card;
}

function purposeLabel(purpose: BrowserModelPurpose): string {
  return purpose === "background-removal" ? "Hintergrund entfernen" : "Smart Select";
}

function backendLabel(backend: "wasm" | "webgpu"): string {
  return backend === "webgpu" ? "WebGPU" : "WASM";
}

function formatMebibytes(bytes: number): string {
  return `${(bytes / 1024 ** 2).toFixed(2).replace(".", ",")} MiB`;
}

function requireElement<T extends Element>(selector: string, constructor: new () => T): T {
  const element = document.querySelector(selector);
  if (!(element instanceof constructor)) {
    throw new Error(`Required model-manager element is missing: ${selector}`);
  }
  return element;
}
