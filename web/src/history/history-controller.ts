import { parseSvgDocument } from "../conversion/svg-document";
import type { ConversionOptions } from "../conversion/conversion-options";
import type { CompareController } from "../compare/compare-controller";
import type { CompareSlot } from "../compare/compare-selection";
import type { HistoryStore, NewConversionRun, ConversionRun } from "./history-store";
import { formatImageVersion } from "../image/image-version";
import { restoreSelectedRunOptions } from "./restore-run";

export interface HistoryController {
  assignComparison(slot: CompareSlot, runId: number): ConversionRun | undefined;
  clearComparison(): void;
  record(input: NewConversionRun): ConversionRun;
  runs(): readonly ConversionRun[];
  select(runId: number): ConversionRun | undefined;
  selected(): ConversionRun | undefined;
}

export function initializeHistory(
  store: HistoryStore,
  applyOptions: (options: ConversionOptions) => void,
  compareController: CompareController,
): HistoryController {
  const elements = readElements();

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

  const clearComparison = (): void => {
    compareController.clear();
    render();
  };

  const select = (runId: number): ConversionRun | undefined => {
    const selected = store.select(runId);
    if (selected) {
      clearComparison();
      showRun(selected);
    }
    return selected;
  };

  const assignComparison = (slot: CompareSlot, runId: number): ConversionRun | undefined => {
    const run = store.runs().find((candidate) => candidate.id === runId);
    if (run) {
      compareController.assign(slot, run);
      render();
    }
    return run;
  };

  const render = (): void => {
    const runs = store.runs();
    const selectedRunId = store.selected()?.id;
    const comparedRuns = compareController.current();
    elements.content.replaceChildren(
      ...runs.map((run) =>
        runItem(
          run,
          run.id === selectedRunId,
          comparedRuns.a?.id === run.id,
          comparedRuns.b?.id === run.id,
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
    elements.restoreButton.hidden = runs.length === 0;
  };

  return {
    assignComparison,
    clearComparison,
    record: (input) => {
      const run = store.add(input);
      render();
      return run;
    },
    runs: store.runs,
    select,
    selected: store.selected,
  };
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

function focusCompareButton(content: HTMLElement, runId: number, slot: CompareSlot): void {
  const button = content.querySelector(
    `[data-compare-run-id="${String(runId)}"][data-compare-slot="${slot}"]`,
  );
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
