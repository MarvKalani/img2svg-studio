import { parseSvgDocument } from "../conversion/svg-document";
import { downloadSvgFile, svgFileName } from "../conversion/svg-download";
import type { ConversionRun } from "../history/history-store";
import type { ComparedRuns, CompareSelection, CompareSlot } from "./compare-selection";
import { compareSourceSettings } from "./compare-source-settings";
import {
  ComparisonSourceKind,
  comparisonSourceLabel,
  type ComparisonSource,
} from "./comparison-source";
import { initializeViewport } from "./viewport-controller";

export interface CompareController {
  assign(slot: CompareSlot, source: ComparisonSource): void;
  clear(): void;
  current(): ComparedRuns;
}

export function initializeCompare(selection: CompareSelection): CompareController {
  const elements = readElements();
  const viewport = initializeViewport();

  const renderSplit = (): void => {
    const aPercent = elements.slider.valueAsNumber;
    const bPercent = 100 - aPercent;
    elements.layerA.style.clipPath = `inset(0 ${String(bPercent)}% 0 0)`;
    elements.layerB.style.clipPath = `inset(0 0 0 ${String(aPercent)}%)`;
    elements.divider.style.left = `${String(aPercent)}%`;
    elements.divider.setAttribute("aria-valuenow", String(aPercent));
    elements.divider.setAttribute("aria-valuetext", `${String(aPercent)} Prozent A`);
    elements.sliderValue.textContent = `${String(aPercent)} % A · ${String(bPercent)} % B`;
  };

  const renderSettings = (): void => {
    const comparedRuns = selection.current();
    elements.settingsBody.replaceChildren();
    if (!comparedRuns.a || !comparedRuns.b) {
      elements.settingsEmpty.textContent = "Noch keine Varianten zum Vergleichen.";
      elements.settingsEmpty.hidden = false;
      return;
    }

    const rows = compareSourceSettings(
      comparedRuns.a,
      comparedRuns.b,
      elements.onlyDifferences.checked,
    );
    elements.settingsBody.replaceChildren(...rows.map(settingRow));
    elements.settingsEmpty.textContent = "Keine Parameterunterschiede.";
    elements.settingsEmpty.hidden = rows.length > 0;
  };

  const render = (): void => {
    const comparedRuns = selection.current();
    const complete = comparedRuns.a !== undefined && comparedRuns.b !== undefined;
    elements.output.hidden = !complete;
    elements.stage.classList.toggle("compare-active", complete);
    viewport.setEnabled(complete);
    renderSettings();
    if (!complete) {
      return;
    }

    elements.labelA.textContent = `A · ${comparisonSourceLabel(comparedRuns.a)}`;
    elements.labelB.textContent = `B · ${comparisonSourceLabel(comparedRuns.b)}`;
    elements.contentA.replaceChildren(renderSource(comparedRuns.a));
    elements.contentB.replaceChildren(renderSource(comparedRuns.b));
    renderDownload(elements.downloadA, comparedRuns.a, "A");
    renderDownload(elements.downloadB, comparedRuns.b, "B");
    viewport.reset();
    renderSplit();
  };

  elements.slider.addEventListener("input", renderSplit);
  initializeDividerDrag(elements, renderSplit);
  elements.onlyDifferences.addEventListener("change", renderSettings);
  elements.downloadA.addEventListener("click", () =>
    downloadComparedSource(selection.current().a, "a"),
  );
  elements.downloadB.addEventListener("click", () =>
    downloadComparedSource(selection.current().b, "b"),
  );

  return {
    assign: (slot, run) => {
      selection.assign(slot, run);
      render();
    },
    clear: () => {
      selection.clear();
      render();
    },
    current: selection.current,
  };
}

function downloadComparedSource(source: ComparisonSource | undefined, slot: CompareSlot): void {
  if (!source || source.kind !== ComparisonSourceKind.Run) {
    return;
  }
  const { run } = source;

  downloadSvgFile({
    bytes: run.svg,
    fileName: svgFileName(run.fileName).replace(/\.svg$/u, `-${slot}-run-${String(run.id)}.svg`),
  });
}

function renderDownload(
  button: HTMLButtonElement,
  source: ComparisonSource,
  slot: "A" | "B",
): void {
  const isRun = source.kind === ComparisonSourceKind.Run;
  button.hidden = !isRun;
  button.disabled = !isRun;
  button.textContent = `SVG ${slot}`;
}

function settingRow(setting: ReturnType<typeof compareSourceSettings>[number]): HTMLElement {
  const row = document.createElement("div");
  row.setAttribute("role", "row");
  row.dataset.settingKey = setting.key;
  row.dataset.testid = "diff-setting-row";
  row.append(settingCell(setting.label), settingCell(setting.a), settingCell(setting.b));
  return row;
}

function settingCell(value: string): HTMLElement {
  const cell = document.createElement("span");
  cell.setAttribute("role", "cell");
  cell.textContent = value;
  return cell;
}

function normalizedSvg(run: ConversionRun): SVGSVGElement {
  const source = parseSvgDocument(run.svg);
  if (!(source instanceof SVGSVGElement)) {
    throw new TypeError("Conversion output must have an SVG root element.");
  }
  source.dataset.sourceViewBox = source.getAttribute("viewBox") ?? "";
  source.setAttribute("width", "100%");
  source.setAttribute("height", "100%");
  source.setAttribute("preserveAspectRatio", "xMidYMid meet");
  return source;
}

function initializeDividerDrag(elements: CompareElements, render: () => void): void {
  let activePointerId: number | undefined;
  const updateFromPointer = (clientX: number): void => {
    const bounds = elements.canvas.getBoundingClientRect();
    const percent = Math.round(((clientX - bounds.left) / bounds.width) * 100);
    elements.slider.value = String(Math.min(100, Math.max(0, percent)));
    render();
  };

  elements.divider.addEventListener("pointerdown", (event) => {
    event.stopPropagation();
    activePointerId = event.pointerId;
    elements.divider.setPointerCapture(event.pointerId);
    updateFromPointer(event.clientX);
  });
  elements.divider.addEventListener("pointermove", (event) => {
    if (event.pointerId === activePointerId) {
      updateFromPointer(event.clientX);
    }
  });
  const release = (event: PointerEvent): void => {
    if (event.pointerId === activePointerId) {
      activePointerId = undefined;
    }
  };
  elements.divider.addEventListener("pointerup", release);
  elements.divider.addEventListener("pointercancel", release);
  elements.divider.addEventListener("keydown", (event) => {
    const delta = event.key === "ArrowLeft" ? -1 : event.key === "ArrowRight" ? 1 : 0;
    if (delta === 0) {
      return;
    }
    event.preventDefault();
    elements.slider.value = String(elements.slider.valueAsNumber + delta);
    render();
  });
}

function renderSource(source: ComparisonSource): SVGSVGElement | HTMLImageElement {
  if (source.kind === ComparisonSourceKind.Run) {
    return normalizedSvg(source.run);
  }
  const image = document.createElement("img");
  image.alt = `Original ${source.image.file.name}`;
  image.draggable = false;
  image.src = source.image.metadata.previewUrl;
  return image;
}

interface CompareElements {
  canvas: HTMLElement;
  contentA: HTMLElement;
  contentB: HTMLElement;
  divider: HTMLButtonElement;
  downloadA: HTMLButtonElement;
  downloadB: HTMLButtonElement;
  labelA: HTMLElement;
  labelB: HTMLElement;
  layerA: HTMLElement;
  layerB: HTMLElement;
  output: HTMLElement;
  onlyDifferences: HTMLInputElement;
  settingsBody: HTMLElement;
  settingsEmpty: HTMLParagraphElement;
  slider: HTMLInputElement;
  sliderValue: HTMLOutputElement;
  stage: HTMLElement;
}

function readElements(): CompareElements {
  return {
    canvas: requireElement("#compare-canvas", HTMLElement),
    contentA: requireElement("#compare-content-a", HTMLElement),
    contentB: requireElement("#compare-content-b", HTMLElement),
    divider: requireElement("#compare-split-divider", HTMLButtonElement),
    downloadA: requireElement("#download-compare-a", HTMLButtonElement),
    downloadB: requireElement("#download-compare-b", HTMLButtonElement),
    labelA: requireElement("#compare-label-a", HTMLElement),
    labelB: requireElement("#compare-label-b", HTMLElement),
    layerA: requireElement("#compare-layer-a", HTMLElement),
    layerB: requireElement("#compare-layer-b", HTMLElement),
    output: requireElement("#compare-output", HTMLElement),
    onlyDifferences: requireElement("#only-differences", HTMLInputElement),
    settingsBody: requireElement("#diff-settings-body", HTMLElement),
    settingsEmpty: requireElement("#diff-settings-empty", HTMLParagraphElement),
    slider: requireElement("#compare-slider", HTMLInputElement),
    sliderValue: requireElement("#compare-slider-value", HTMLOutputElement),
    stage: requireElement("#comparison-stage", HTMLElement),
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
