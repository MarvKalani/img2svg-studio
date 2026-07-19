import type { DecodedImage } from "../image/decode-image";
import {
  createConversionOptions,
  defaultConversionOptions,
  scaledDimensions,
  type ConversionOptions,
} from "./conversion-options";

export interface ConversionOptionsController {
  apply(options: ConversionOptions): void;
  current(): ConversionOptions;
  showSourceDimensions(image: DecodedImage): void;
}

export function initializeConversionOptions(): ConversionOptionsController {
  const elements = readElements();
  let sourceDimensions: { heightPixels: number; widthPixels: number } | undefined;

  const current = (): ConversionOptions =>
    createConversionOptions({
      colorPrecision: elements.colorPrecision.valueAsNumber,
      filterSpeckle: elements.filterSpeckle.valueAsNumber,
      scalePercent: Number(elements.scalePercent.value),
    });

  const render = (): void => {
    const options = current();
    elements.colorPrecisionValue.textContent = `${String(options.colorPrecision)} Bit`;
    elements.filterSpeckleValue.textContent = `${String(options.filterSpeckle)} px`;
    if (sourceDimensions) {
      const target = scaledDimensions(
        sourceDimensions.widthPixels,
        sourceDimensions.heightPixels,
        options,
      );
      elements.targetDimensions.textContent = `${String(target.widthPixels)} × ${String(target.heightPixels)} px`;
    }
  };

  elements.colorPrecision.addEventListener("input", render);
  elements.filterSpeckle.addEventListener("input", render);
  elements.scalePercent.addEventListener("change", render);
  elements.colorPrecision.value = String(defaultConversionOptions.colorPrecision);
  elements.filterSpeckle.value = String(defaultConversionOptions.filterSpeckle);
  elements.scalePercent.value = String(defaultConversionOptions.scalePercent);
  render();

  return {
    apply: (options) => {
      const validatedOptions = createConversionOptions(options);
      elements.colorPrecision.value = String(validatedOptions.colorPrecision);
      elements.filterSpeckle.value = String(validatedOptions.filterSpeckle);
      elements.scalePercent.value = String(validatedOptions.scalePercent);
      render();
    },
    current,
    showSourceDimensions: (image) => {
      sourceDimensions = image;
      render();
    },
  };
}

interface ConversionOptionElements {
  colorPrecision: HTMLInputElement;
  colorPrecisionValue: HTMLOutputElement;
  filterSpeckle: HTMLInputElement;
  filterSpeckleValue: HTMLOutputElement;
  scalePercent: HTMLSelectElement;
  targetDimensions: HTMLOutputElement;
}

function readElements(): ConversionOptionElements {
  return {
    colorPrecision: requireElement("#color-precision", HTMLInputElement),
    colorPrecisionValue: requireElement("#color-precision-value", HTMLOutputElement),
    filterSpeckle: requireElement("#filter-speckle", HTMLInputElement),
    filterSpeckleValue: requireElement("#filter-speckle-value", HTMLOutputElement),
    scalePercent: requireElement("#scale-percent", HTMLSelectElement),
    targetDimensions: requireElement("#target-dimensions", HTMLOutputElement),
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
