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

  const renderOpacity = (): void => {
    const bPercent = elements.slider.valueAsNumber;
    elements.layerA.style.opacity = String((100 - bPercent) / 100);
    elements.layerB.style.opacity = String(bPercent / 100);
    elements.sliderValue.textContent = `${String(bPercent)} % B`;
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
    elements.layerA.replaceChildren(renderSource(comparedRuns.a));
    elements.layerB.replaceChildren(renderSource(comparedRuns.b));
    renderDownload(elements.downloadA, comparedRuns.a, "A");
    renderDownload(elements.downloadB, comparedRuns.b, "B");
    viewport.reset();
    renderOpacity();
  };

  elements.slider.addEventListener("input", renderOpacity);
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
  const svgNamespace = "http://www.w3.org/2000/svg";
  const normalized = document.createElementNS(svgNamespace, "svg");
  const source = parseSvgDocument(run.svg);
  normalized.setAttribute("viewBox", "0 0 1 1");
  normalized.setAttribute("preserveAspectRatio", "xMidYMid meet");
  normalized.dataset.sourceViewBox = source.getAttribute("viewBox") ?? "";

  source.setAttribute("x", "0");
  source.setAttribute("y", "0");
  source.setAttribute("width", "1");
  source.setAttribute("height", "1");
  source.setAttribute("preserveAspectRatio", "xMidYMid meet");
  normalized.append(source);
  return normalized;
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
