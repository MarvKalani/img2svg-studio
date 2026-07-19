import { parseSvgDocument } from "../conversion/svg-document";
import type { ConversionOptions } from "../conversion/conversion-options";
import type { HistoryStore, NewConversionRun, ConversionRun } from "./history-store";
import { restoreSelectedRunOptions } from "./restore-run";

export interface HistoryController {
  record(input: NewConversionRun): void;
}

export function initializeHistory(
  store: HistoryStore,
  applyOptions: (options: ConversionOptions) => void,
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
    elements.statusImage.textContent = `Run ${String(run.id)} ausgewählt · ${String(run.widthPixels)} × ${String(run.heightPixels)} SVG`;
  };

  const render = (): void => {
    const runs = store.runs();
    const selectedRunId = store.selected()?.id;
    elements.content.replaceChildren(
      ...runs.map((run) =>
        runCard(run, run.id === selectedRunId, () => {
          const selected = store.select(run.id);
          if (selected) {
            showRun(selected);
            render();
          }
        }),
      ),
    );
    elements.variantCount.textContent = `${String(runs.length)} ${runs.length === 1 ? "Variante" : "Varianten"}`;
    elements.restoreButton.hidden = runs.length === 0;
  };

  return {
    record: (input) => {
      store.add(input);
      render();
    },
  };
}

function runCard(run: ConversionRun, selected: boolean, selectRun: () => void): HTMLButtonElement {
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
  dimensions.textContent = `${String(run.widthPixels)} × ${String(run.heightPixels)}`;
  const metrics = document.createElement("small");
  metrics.textContent = `${String(run.pathCount)} ${run.pathCount === 1 ? "Pfad" : "Pfade"} · ${String(run.durationMilliseconds)} ms`;

  button.append(thumbnail, title, dimensions, metrics);
  button.addEventListener("click", selectRun);
  return button;
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
