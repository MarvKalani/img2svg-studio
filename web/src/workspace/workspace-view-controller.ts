import type { ImageStore, LoadedImage } from "../image/image-store";

export const WorkspaceViewMode = {
  Comparison: "comparison",
  Original: "original",
  Processed: "processed",
  Svg: "svg",
} as const;

export type WorkspaceViewMode = (typeof WorkspaceViewMode)[keyof typeof WorkspaceViewMode];

export interface WorkspaceViewController {
  current(): WorkspaceViewMode;
  rasterEditingEnabled(): boolean;
  rasterSource(): LoadedImage | undefined;
  showComparison(): void;
  showOriginal(): void;
  showProcessed(): void;
  showSvg(): void;
  subscribe(listener: (mode: WorkspaceViewMode) => void): () => void;
}

export function isRasterEditingMode(mode: WorkspaceViewMode): boolean {
  return mode === WorkspaceViewMode.Original || mode === WorkspaceViewMode.Processed;
}

export function initializeWorkspaceView(imageStore: ImageStore): WorkspaceViewController {
  const elements = readElements();
  const listeners = new Set<(mode: WorkspaceViewMode) => void>();
  let currentMode: WorkspaceViewMode = WorkspaceViewMode.Svg;

  const activate = (mode: WorkspaceViewMode): void => {
    currentMode = mode;
    elements.stage.dataset.viewMode = mode;
    for (const [buttonMode, button] of elements.buttons) {
      const active = buttonMode === mode;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    }
    for (const listener of listeners) {
      listener(mode);
    }
  };

  const showRaster = (mode: WorkspaceViewMode, image: LoadedImage | undefined): void => {
    activate(mode);
    elements.label.textContent = mode === WorkspaceViewMode.Original ? "Original" : "Verarbeitet";
    elements.output.hidden = true;
    elements.download.hidden = true;
    elements.placeholder.hidden = image !== undefined;
    elements.raster.hidden = image === undefined;
    if (image) {
      elements.raster.src = image.metadata.previewUrl;
      elements.raster.alt = `${elements.label.textContent} ${image.file.name}`;
    }
  };

  const controller: WorkspaceViewController = Object.freeze({
    current: () => currentMode,
    rasterEditingEnabled: () => isRasterEditingMode(currentMode),
    rasterSource: () =>
      currentMode === WorkspaceViewMode.Original
        ? imageStore.original()
        : currentMode === WorkspaceViewMode.Processed
          ? imageStore.current()
          : undefined,
    showComparison: () => {
      activate(WorkspaceViewMode.Comparison);
      elements.label.textContent = "A · Variante";
    },
    showOriginal: () => showRaster(WorkspaceViewMode.Original, imageStore.original()),
    showProcessed: () => showRaster(WorkspaceViewMode.Processed, imageStore.current()),
    showSvg: () => {
      activate(WorkspaceViewMode.Svg);
      const hasSvg = elements.output.childElementCount > 0;
      elements.label.textContent = "SVG";
      elements.raster.hidden = true;
      elements.output.hidden = !hasSvg;
      elements.placeholder.hidden = hasSvg;
      elements.download.hidden = !hasSvg;
    },
    subscribe: (listener: (mode: WorkspaceViewMode) => void) => {
      listeners.add(listener);
      listener(currentMode);
      return () => listeners.delete(listener);
    },
  });

  elements.buttons.get(WorkspaceViewMode.Svg)?.addEventListener("click", controller.showSvg);
  elements.buttons
    .get(WorkspaceViewMode.Processed)
    ?.addEventListener("click", controller.showProcessed);
  elements.buttons
    .get(WorkspaceViewMode.Original)
    ?.addEventListener("click", controller.showOriginal);
  elements.buttons
    .get(WorkspaceViewMode.Comparison)
    ?.addEventListener("click", controller.showComparison);
  controller.showSvg();
  return controller;
}

interface WorkspaceViewElements {
  readonly buttons: ReadonlyMap<WorkspaceViewMode, HTMLButtonElement>;
  readonly download: HTMLButtonElement;
  readonly label: HTMLElement;
  readonly output: HTMLElement;
  readonly placeholder: HTMLElement;
  readonly raster: HTMLImageElement;
  readonly stage: HTMLElement;
}

function readElements(): WorkspaceViewElements {
  return {
    buttons: new Map([
      [WorkspaceViewMode.Svg, requireElement("#view-svg", HTMLButtonElement)],
      [WorkspaceViewMode.Processed, requireElement("#view-processed", HTMLButtonElement)],
      [WorkspaceViewMode.Original, requireElement("#view-original", HTMLButtonElement)],
      [WorkspaceViewMode.Comparison, requireElement("#view-comparison", HTMLButtonElement)],
    ]),
    download: requireElement("#download-svg", HTMLButtonElement),
    label: requireElement("#primary-preview-label", HTMLElement),
    output: requireElement("#svg-output", HTMLElement),
    placeholder: requireElement("#workspace-empty", HTMLElement),
    raster: requireElement("#workspace-raster-preview", HTMLImageElement),
    stage: requireElement("#comparison-stage", HTMLElement),
  };
}

function requireElement<ElementType extends Element>(
  selector: string,
  constructor: new () => ElementType,
): ElementType {
  const element = document.querySelector(selector);
  if (!(element instanceof constructor)) {
    throw new Error(`Required workspace view element is missing: ${selector}`);
  }
  return element;
}
