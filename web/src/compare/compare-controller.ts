import { parseSvgDocument } from "../conversion/svg-document";
import type { ConversionRun } from "../history/history-store";
import type { ComparedRuns, CompareSelection, CompareSlot } from "./compare-selection";

export interface CompareController {
  assign(slot: CompareSlot, run: ConversionRun): void;
  current(): ComparedRuns;
}

export function initializeCompare(selection: CompareSelection): CompareController {
  const elements = readElements();

  const renderOpacity = (): void => {
    const bPercent = elements.slider.valueAsNumber;
    elements.layerA.style.opacity = String((100 - bPercent) / 100);
    elements.layerB.style.opacity = String(bPercent / 100);
    elements.sliderValue.textContent = `${String(bPercent)} % B`;
  };

  const render = (): void => {
    const comparedRuns = selection.current();
    const complete = comparedRuns.a !== undefined && comparedRuns.b !== undefined;
    elements.output.hidden = !complete;
    elements.stage.classList.toggle("compare-active", complete);
    if (!complete) {
      return;
    }

    elements.labelA.textContent = `A · Run ${String(comparedRuns.a.id)}`;
    elements.labelB.textContent = `B · Run ${String(comparedRuns.b.id)}`;
    elements.layerA.replaceChildren(normalizedSvg(comparedRuns.a));
    elements.layerB.replaceChildren(normalizedSvg(comparedRuns.b));
    renderOpacity();
  };

  elements.slider.addEventListener("input", renderOpacity);

  return {
    assign: (slot, run) => {
      selection.assign(slot, run);
      render();
    },
    current: selection.current,
  };
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

interface CompareElements {
  labelA: HTMLElement;
  labelB: HTMLElement;
  layerA: HTMLElement;
  layerB: HTMLElement;
  output: HTMLElement;
  slider: HTMLInputElement;
  sliderValue: HTMLOutputElement;
  stage: HTMLElement;
}

function readElements(): CompareElements {
  return {
    labelA: requireElement("#compare-label-a", HTMLElement),
    labelB: requireElement("#compare-label-b", HTMLElement),
    layerA: requireElement("#compare-layer-a", HTMLElement),
    layerB: requireElement("#compare-layer-b", HTMLElement),
    output: requireElement("#compare-output", HTMLElement),
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
