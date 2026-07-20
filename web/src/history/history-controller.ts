import { parseSvgDocument } from "../conversion/svg-document";
import type { ConversionOptions } from "../conversion/conversion-options";
import type { CompareController } from "../compare/compare-controller";
import type { CompareSlot } from "../compare/compare-selection";
import { ComparisonSourceKind, originalSource, runSource } from "../compare/comparison-source";
import type { HistoryStore, NewConversionRun, ConversionRun } from "./history-store";
import { formatImageVersion } from "../image/image-version";
import type { LoadedImage } from "../image/image-store";
import { restoreSelectedRunOptions } from "./restore-run";

export interface HistoryController {
  assignComparison(slot: CompareSlot, runId: number): ConversionRun | undefined;
  assignOriginalComparison(slot: CompareSlot): boolean;
  clearComparison(): void;
  record(input: NewConversionRun): ConversionRun;
  runs(): readonly ConversionRun[];
  select(runId: number): ConversionRun | undefined;
  selected(): ConversionRun | undefined;
  setOriginal(image: LoadedImage): void;
}

export function initializeHistory(
  store: HistoryStore,
  applyOptions: (options: ConversionOptions) => void,
  compareController: CompareController,
): HistoryController {
  const elements = readElements();
  let originalImage: LoadedImage | undefined;
  let originalSelected = false;

  elements.restoreButton.addEventListener("click", () => {
    const restoredOptions = restoreSelectedRunOptions(store, applyOptions);
    if (restoredOptions) {
      elements.statusImage.textContent = `Einstellungen von Run ${String(store.selected()?.id)} übernommen`;
    }
  });

  const showRun = (run: ConversionRun): void => {
    elements.output.replaceChildren(parseSvgDocument(run.svg));
    elements.rasterPreview.hidden = true;
    elements.output.hidden = false;
    elements.downloadButton.hidden = false;
    elements.downloadButton.dataset.sourceFileName = run.fileName;
    elements.statusImage.textContent = `Run ${String(run.id)} ausgewählt · ${String(run.widthPixels)} × ${String(run.heightPixels)} SVG`;
  };

  const showOriginal = (image: LoadedImage): void => {
    elements.output.replaceChildren();
    elements.output.hidden = true;
    elements.rasterPreview.src = image.metadata.previewUrl;
    elements.rasterPreview.alt = `Geladenes Rasterbild ${image.file.name}`;
    elements.rasterPreview.hidden = false;
    elements.downloadButton.hidden = true;
    delete elements.downloadButton.dataset.sourceFileName;
    elements.statusImage.textContent = `Original ausgewählt · ${String(image.metadata.widthPixels)} × ${String(image.metadata.heightPixels)} Raster`;
  };

  const clearComparison = (): void => {
    compareController.clear();
    render();
  };

  const select = (runId: number): ConversionRun | undefined => {
    const selected = store.select(runId);
    if (selected) {
      originalSelected = false;
      clearComparison();
      showRun(selected);
    }
    return selected;
  };

  const assignComparison = (slot: CompareSlot, runId: number): ConversionRun | undefined => {
    const run = store.runs().find((candidate) => candidate.id === runId);
    if (run) {
      compareController.assign(slot, runSource(run));
      render();
    }
    return run;
  };

  const assignOriginalComparison = (slot: CompareSlot): boolean => {
    if (!originalImage) {
      return false;
    }
    compareController.assign(slot, originalSource(originalImage));
    render();
    return true;
  };

  const render = (): void => {
    const runs = store.runs();
    const selectedRunId = store.selected()?.id;
    const comparedRuns = compareController.current();
    elements.content.replaceChildren(
      ...(originalImage
        ? [
            originalItem(
              originalImage,
              originalSelected,
              comparedRuns.a?.kind === ComparisonSourceKind.Original,
              comparedRuns.b?.kind === ComparisonSourceKind.Original,
              () => {
                originalSelected = true;
                clearComparison();
                showOriginal(originalImage!);
              },
              (slot) => {
                compareController.assign(slot, originalSource(originalImage!));
                render();
                focusOriginalCompareButton(elements.content, slot);
              },
            ),
          ]
        : []),
      ...runs.map((run) =>
        runItem(
          run,
          run.id === selectedRunId,
          comparedRuns.a?.kind === ComparisonSourceKind.Run && comparedRuns.a.run.id === run.id,
          comparedRuns.b?.kind === ComparisonSourceKind.Run && comparedRuns.b.run.id === run.id,
          () => {
            select(run.id);
          },
          (slot) => {
            assignComparison(slot, run.id);
            focusCompareButton(elements.content, run.id, slot);
          },
        ),
      ),
    );
    elements.variantCount.textContent = `${String(runs.length)} ${runs.length === 1 ? "Variante" : "Varianten"}`;
    elements.restoreButton.hidden = runs.length === 0 || originalSelected;
  };

  return {
    assignComparison,
    assignOriginalComparison,
    clearComparison,
    record: (input) => {
      const run = store.add(input);
      originalSelected = false;
      render();
      return run;
    },
    runs: store.runs,
    select,
    selected: store.selected,
    setOriginal: (image) => {
      const sourceChanged = originalImage?.version.id !== image.version.id;
      if (originalImage && sourceChanged) {
        store.clear();
      }
      originalImage = image;
      if (sourceChanged) {
        originalSelected = true;
      }
      render();
    },
  };
}

function originalItem(
  image: LoadedImage,
  selected: boolean,
  comparedAsA: boolean,
  comparedAsB: boolean,
  selectOriginal: () => void,
  compareOriginal: (slot: CompareSlot) => void,
): HTMLElement {
  const item = document.createElement("article");
  item.className = "history-item history-original-item";
  const button = document.createElement("button");
  button.type = "button";
  button.className = "history-card";
  button.dataset.testid = "history-original-card";
  button.setAttribute("aria-pressed", String(selected));

  const thumbnail = document.createElement("span");
  thumbnail.className = "history-thumbnail";
  thumbnail.setAttribute("aria-hidden", "true");
  const preview = document.createElement("img");
  preview.src = image.metadata.previewUrl;
  preview.alt = "";
  thumbnail.append(preview);

  const title = document.createElement("strong");
  title.textContent = "Original";
  const dimensions = document.createElement("span");
  dimensions.textContent = `${String(image.metadata.widthPixels)} × ${String(image.metadata.heightPixels)} · Raster`;
  const version = document.createElement("small");
  version.textContent = formatImageVersion(image.version);
  button.append(thumbnail, title, dimensions, version);
  button.addEventListener("click", selectOriginal);

  const actions = document.createElement("div");
  actions.className = "history-compare-actions";
  actions.append(
    originalCompareButton("a", comparedAsA, compareOriginal),
    originalCompareButton("b", comparedAsB, compareOriginal),
  );
  item.append(button, actions);
  return item;
}

function runItem(
  run: ConversionRun,
  selected: boolean,
  comparedAsA: boolean,
  comparedAsB: boolean,
  selectRun: () => void,
  compareRun: (slot: CompareSlot) => void,
): HTMLElement {
  const item = document.createElement("article");
  item.className = "history-item";
  const button = document.createElement("button");
  button.type = "button";
  button.className = "history-card";
  button.dataset.testid = "history-card";
  button.dataset.runId = String(run.id);
  button.setAttribute("aria-pressed", String(selected));

  const thumbnail = document.createElement("span");
  thumbnail.className = "history-thumbnail";
  thumbnail.setAttribute("aria-hidden", "true");
  thumbnail.append(parseSvgDocument(run.svg));

  const title = document.createElement("strong");
  title.textContent = `Run ${String(run.id)}`;
  const dimensions = document.createElement("span");
  dimensions.textContent = `${String(run.widthPixels)} × ${String(run.heightPixels)} · ${formatImageVersion(run.inputVersion)}`;
  const metrics = document.createElement("small");
  metrics.textContent = `${shapeMetrics(run)} · ${String(run.durationMilliseconds)} ms`;

  button.append(thumbnail, title, dimensions, metrics);
  button.addEventListener("click", selectRun);

  const actions = document.createElement("div");
  actions.className = "history-compare-actions";
  actions.append(
    compareButton(run, "a", comparedAsA, compareRun),
    compareButton(run, "b", comparedAsB, compareRun),
  );
  item.append(button, actions);
  return item;
}

function shapeMetrics(run: ConversionRun): string {
  const metrics = [`${String(run.pathCount)} ${run.pathCount === 1 ? "Pfad" : "Pfade"}`];
  if (run.circleCount > 0) {
    metrics.push(`${String(run.circleCount)} ${run.circleCount === 1 ? "Kreis" : "Kreise"}`);
  }
  if (run.rectangleCount > 0) {
    metrics.push(
      `${String(run.rectangleCount)} ${run.rectangleCount === 1 ? "Rechteck" : "Rechtecke"}`,
    );
  }
  if (run.ellipseCount > 0) {
    metrics.push(`${String(run.ellipseCount)} ${run.ellipseCount === 1 ? "Ellipse" : "Ellipsen"}`);
  }
  if (run.lineCount > 0) {
    metrics.push(`${String(run.lineCount)} ${run.lineCount === 1 ? "Linie" : "Linien"}`);
  }
  if (run.polygonCount > 0) {
    metrics.push(`${String(run.polygonCount)} ${run.polygonCount === 1 ? "Polygon" : "Polygone"}`);
  }
  return metrics.join(" · ");
}

function compareButton(
  run: ConversionRun,
  slot: CompareSlot,
  assigned: boolean,
  compareRun: (slot: CompareSlot) => void,
): HTMLButtonElement {
  const button = document.createElement("button");
  const label = slot.toUpperCase();
  button.type = "button";
  button.textContent = label;
  button.setAttribute("aria-label", `Run ${String(run.id)} als ${label} setzen`);
  button.setAttribute("aria-pressed", String(assigned));
  button.dataset.compareRunId = String(run.id);
  button.dataset.compareSlot = slot;
  button.addEventListener("click", () => compareRun(slot));
  return button;
}

function originalCompareButton(
  slot: CompareSlot,
  assigned: boolean,
  compareOriginal: (slot: CompareSlot) => void,
): HTMLButtonElement {
  const button = document.createElement("button");
  const label = slot.toUpperCase();
  button.type = "button";
  button.textContent = label;
  button.setAttribute("aria-label", `Original als ${label} setzen`);
  button.setAttribute("aria-pressed", String(assigned));
  button.dataset.compareOriginalSlot = slot;
  button.addEventListener("click", () => compareOriginal(slot));
  return button;
}

function focusCompareButton(content: HTMLElement, runId: number, slot: CompareSlot): void {
  const button = content.querySelector(
    `[data-compare-run-id="${String(runId)}"][data-compare-slot="${slot}"]`,
  );
  if (button instanceof HTMLButtonElement) {
    button.focus();
  }
}

function focusOriginalCompareButton(content: HTMLElement, slot: CompareSlot): void {
  const button = content.querySelector(`[data-compare-original-slot="${slot}"]`);
  if (button instanceof HTMLButtonElement) {
    button.focus();
  }
}

interface HistoryElements {
  content: HTMLElement;
  downloadButton: HTMLButtonElement;
  output: HTMLElement;
  rasterPreview: HTMLImageElement;
  restoreButton: HTMLButtonElement;
  statusImage: HTMLElement;
  variantCount: HTMLElement;
}

function readElements(): HistoryElements {
  return {
    content: requireElement("#history-content", HTMLElement),
    downloadButton: requireElement("#download-svg", HTMLButtonElement),
    output: requireElement("#svg-output", HTMLElement),
    rasterPreview: requireElement("#workspace-raster-preview", HTMLImageElement),
    restoreButton: requireElement("#restore-run-options", HTMLButtonElement),
    statusImage: requireElement("#status-image", HTMLElement),
    variantCount: requireElement("#status-variant-count", HTMLElement),
  };
}

interface ElementConstructor<ElementType extends Element> {
  new (): ElementType;
}

function requireElement<ElementType extends Element>(
  selector: string,
  constructor: ElementConstructor<ElementType>,
): ElementType {
  const element = document.querySelector(selector);
  if (!(element instanceof constructor)) {
    throw new Error(`Required element is missing: ${selector}`);
  }
  return element;
}
