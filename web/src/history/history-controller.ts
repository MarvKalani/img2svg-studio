import { parseSvgDocument } from "../conversion/svg-document";
import type { ConversionOptions } from "../conversion/conversion-options";
import type { CompareController } from "../compare/compare-controller";
import type { CompareSlot } from "../compare/compare-selection";
import {
  ComparisonSourceKind,
  draftSource,
  originalSource,
  runSource,
} from "../compare/comparison-source";
import type { HistoryStore, NewConversionRun, ConversionRun } from "./history-store";
import { formatImageVersion } from "../image/image-version";
import type { LoadedImage } from "../image/image-store";
import { restoreSelectedRunOptions } from "./restore-run";
import { formatByteSize, utf8ByteLength } from "../format-byte-size";

export interface HistoryController {
  assignComparison(slot: CompareSlot, runId: number): ConversionRun | undefined;
  assignOriginalComparison(slot: CompareSlot): boolean;
  clearComparison(): void;
  record(input: NewConversionRun): ConversionRun;
  remove(runId: number): ConversionRun | undefined;
  runs(): readonly ConversionRun[];
  select(runId: number): ConversionRun | undefined;
  selected(): ConversionRun | undefined;
  setDraft(input: NewConversionRun): void;
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
  let previewDraft: NewConversionRun | undefined;

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
    elements.statusImage.textContent = `Run ${String(run.id)} ausgewählt · ${String(run.widthPixels)} × ${String(run.heightPixels)} SVG · ${svgSize(run)}`;
  };

  const showOriginal = (image: LoadedImage): void => {
    elements.output.replaceChildren();
    elements.output.hidden = true;
    elements.rasterPreview.src = image.metadata.previewUrl;
    elements.rasterPreview.alt = `Geladenes Rasterbild ${image.file.name}`;
    elements.rasterPreview.hidden = false;
    elements.downloadButton.hidden = true;
    delete elements.downloadButton.dataset.sourceFileName;
    elements.statusImage.textContent = `Original ausgewählt · ${String(image.metadata.widthPixels)} × ${String(image.metadata.heightPixels)} Raster · ${formatByteSize(image.metadata.sizeBytes)}`;
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

  const remove = (runId: number): ConversionRun | undefined => {
    const wasSelected = store.selected()?.id === runId;
    const comparedRuns = compareController.current();
    const wasCompared = [comparedRuns.a, comparedRuns.b].some(
      (source) => source?.kind === ComparisonSourceKind.Run && source.run.id === runId,
    );
    const removed = store.remove(runId);
    if (!removed) {
      return undefined;
    }
    if (wasCompared) {
      compareController.clear();
    }
    if (wasSelected && originalImage) {
      originalSelected = true;
      showOriginal(originalImage);
    }
    render();
    elements.statusImage.textContent = wasSelected
      ? `Run ${String(runId)} gelöscht · Original ausgewählt`
      : `Run ${String(runId)} gelöscht`;
    return removed;
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
      ...(previewDraft
        ? [
            draftItem(
              previewDraft,
              comparedRuns.a?.kind === ComparisonSourceKind.Draft,
              comparedRuns.b?.kind === ComparisonSourceKind.Draft,
              (slot) => {
                compareController.assign(slot, draftSource(previewDraft!));
                render();
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
          () => {
            remove(run.id);
          },
        ),
      ),
    );
    const variantLabel = `${String(runs.length)} ${runs.length === 1 ? "Variante" : "Varianten"}`;
    elements.variantCount.textContent = previewDraft ? `${variantLabel} · 1 Entwurf` : variantLabel;
    elements.restoreButton.hidden = runs.length === 0 || originalSelected;
  };

  return {
    assignComparison,
    assignOriginalComparison,
    clearComparison,
    record: (input) => {
      const run = store.add(input);
      previewDraft = undefined;
      originalSelected = false;
      compareController.assign("b", runSource(run));
      render();
      return run;
    },
    remove,
    runs: store.runs,
    select,
    selected: store.selected,
    setDraft: (input) => {
      previewDraft = input;
      originalSelected = false;
      if (originalImage) {
        compareController.clear();
        compareController.assign("a", originalSource(originalImage));
        compareController.assign("b", draftSource(input));
      }
      render();
    },
    setOriginal: (image) => {
      const sourceChanged = originalImage?.version.id !== image.version.id;
      if (originalImage && sourceChanged) {
        store.clear();
      }
      originalImage = image;
      if (sourceChanged) {
        previewDraft = undefined;
        originalSelected = true;
      }
      render();
    },
  };
}

function draftItem(
  draft: NewConversionRun,
  comparedAsA: boolean,
  comparedAsB: boolean,
  compareDraft: (slot: CompareSlot) => void,
): HTMLElement {
  const item = document.createElement("article");
  item.className = "history-item history-draft-item";
  const card = document.createElement("div");
  card.className = "history-card";
  card.dataset.testid = "history-draft-card";

  const thumbnail = document.createElement("span");
  thumbnail.className = "history-thumbnail";
  thumbnail.setAttribute("aria-hidden", "true");
  thumbnail.append(parseSvgDocument(draft.svg));

  const title = document.createElement("strong");
  title.textContent = "Entwurf · ungespeichert";
  const dimensions = document.createElement("span");
  dimensions.textContent = `${String(draft.widthPixels)} × ${String(draft.heightPixels)} · ${formatImageVersion(draft.inputVersion)}`;
  const metrics = document.createElement("small");
  metrics.textContent = `${shapeMetrics(draft)} · ${svgSize(draft)} · ${String(draft.durationMilliseconds)} ms`;
  card.append(thumbnail, title, dimensions, metrics);

  const actions = document.createElement("div");
  actions.className = "history-compare-actions";
  actions.append(
    draftCompareButton("a", comparedAsA, compareDraft),
    draftCompareButton("b", comparedAsB, compareDraft),
  );
  item.append(card, actions);
  return item;
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
  dimensions.textContent = `${String(image.metadata.widthPixels)} × ${String(image.metadata.heightPixels)} · Raster · ${formatByteSize(image.metadata.sizeBytes)}`;
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
  removeRun: () => void,
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
  metrics.textContent = `${shapeMetrics(run)} · ${svgSize(run)} · ${String(run.durationMilliseconds)} ms`;

  button.append(thumbnail, title, dimensions, metrics);
  button.addEventListener("click", selectRun);

  const actions = document.createElement("div");
  actions.className = "history-compare-actions";
  actions.append(
    compareButton(run, "a", comparedAsA, compareRun),
    compareButton(run, "b", comparedAsB, compareRun),
    deleteButton(run, removeRun),
  );
  item.append(button, actions);
  return item;
}

function deleteButton(run: ConversionRun, removeRun: () => void): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "history-delete-button";
  button.textContent = "Löschen";
  button.setAttribute("aria-label", `Run ${String(run.id)} löschen`);
  button.addEventListener("click", removeRun);
  return button;
}

function shapeMetrics(run: Readonly<NewConversionRun>): string {
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

function svgSize(run: Readonly<NewConversionRun>): string {
  return formatByteSize(utf8ByteLength(run.svg));
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

function draftCompareButton(
  slot: CompareSlot,
  assigned: boolean,
  compareDraft: (slot: CompareSlot) => void,
): HTMLButtonElement {
  const button = document.createElement("button");
  const label = slot.toUpperCase();
  button.type = "button";
  button.textContent = label;
  button.setAttribute("aria-label", `Entwurf als ${label} setzen`);
  button.setAttribute("aria-pressed", String(assigned));
  button.addEventListener("click", () => compareDraft(slot));
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
