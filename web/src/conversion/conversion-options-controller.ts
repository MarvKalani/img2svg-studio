import type { DecodedImage } from "../image/decode-image";
import {
  createConversionOptions,
  defaultConversionOptions,
  scaledDimensions,
  type ConversionOptions,
} from "./conversion-options";
import {
  RasterFilterMode,
  createRasterPreprocessingOptions,
  preprocessedDimensions,
  rasterResizePresetId,
  rasterResizePresets,
  readRasterResizePreset,
  type RasterFilterMode as RasterFilterModeValue,
} from "./raster-preprocessing";
import {
  createShapeDetectionOptions,
  defaultShapeDetectionOptions,
  nativeShapeSchema,
  type NativeShapeType,
  type NativeShapeTypes,
} from "./shape-options";

export interface ConversionOptionsController {
  apply(options: ConversionOptions): void;
  current(): ConversionOptions;
  showSourceDimensions(image: DecodedImage): void;
}

export function initializeConversionOptions(): ConversionOptionsController {
  const elements = readElements();
  elements.rasterResize.replaceChildren(
    ...rasterResizePresets.map((preset) => new Option(preset.label, preset.id)),
  );
  const shapeTypeInputs = createShapeTypeInputs(elements.shapeTypeOptions);
  let sourceDimensions: { heightPixels: number; widthPixels: number } | undefined;

  const current = (): ConversionOptions =>
    createConversionOptions({
      colorPrecision: elements.colorPrecision.valueAsNumber,
      filterSpeckle: elements.filterSpeckle.valueAsNumber,
      preprocessing: createRasterPreprocessingOptions({
        filterMode: readRasterFilterMode(elements.rasterFilter.value),
        monochromeThreshold: elements.monochromeThreshold.valueAsNumber,
        resize: readRasterResizePreset(elements.rasterResize.value),
      }),
      scalePercent: Number(elements.scalePercent.value),
      shapeDetection: createShapeDetectionOptions({
        enabled: elements.shapeDetection.getAttribute("aria-checked") === "true",
        types: readShapeTypes(shapeTypeInputs),
      }),
    });

  const render = (): void => {
    const options = current();
    elements.colorPrecisionValue.textContent = `${String(options.colorPrecision)} Bit`;
    elements.filterSpeckleValue.textContent = `${String(options.filterSpeckle)} px`;
    elements.monochromeThresholdValue.textContent = String(
      options.preprocessing.monochromeThreshold,
    );
    elements.monochromeThresholdControl.hidden =
      options.preprocessing.filterMode !== RasterFilterMode.Monochrome;
    if (sourceDimensions) {
      const prepared = preprocessedDimensions(
        sourceDimensions.widthPixels,
        sourceDimensions.heightPixels,
        options.preprocessing,
      );
      elements.preparedDimensions.textContent = `${String(prepared.widthPixels)} × ${String(prepared.heightPixels)} px`;
      const target = scaledDimensions(prepared.widthPixels, prepared.heightPixels, options);
      elements.targetDimensions.textContent = `${String(target.widthPixels)} × ${String(target.heightPixels)} px`;
    }
    const shapeDetectionEnabled = options.shapeDetection.enabled;
    for (const input of shapeTypeInputs.values()) {
      input.disabled = !shapeDetectionEnabled;
    }
  };

  elements.colorPrecision.addEventListener("input", render);
  elements.filterSpeckle.addEventListener("input", render);
  elements.monochromeThreshold.addEventListener("input", render);
  elements.rasterFilter.addEventListener("change", render);
  elements.rasterResize.addEventListener("change", render);
  elements.scalePercent.addEventListener("change", render);
  elements.shapeDetection.addEventListener("click", () => {
    const enabled = elements.shapeDetection.getAttribute("aria-checked") === "true";
    elements.shapeDetection.setAttribute("aria-checked", String(!enabled));
    render();
  });
  elements.colorPrecision.value = String(defaultConversionOptions.colorPrecision);
  elements.filterSpeckle.value = String(defaultConversionOptions.filterSpeckle);
  elements.scalePercent.value = String(defaultConversionOptions.scalePercent);
  elements.shapeDetection.setAttribute(
    "aria-checked",
    String(defaultShapeDetectionOptions.enabled),
  );
  render();

  return {
    apply: (options) => {
      const validatedOptions = createConversionOptions(options);
      elements.colorPrecision.value = String(validatedOptions.colorPrecision);
      elements.filterSpeckle.value = String(validatedOptions.filterSpeckle);
      elements.monochromeThreshold.value = String(
        validatedOptions.preprocessing.monochromeThreshold,
      );
      elements.rasterFilter.value = validatedOptions.preprocessing.filterMode;
      elements.rasterResize.value = rasterResizePresetId(validatedOptions.preprocessing.resize);
      elements.scalePercent.value = String(validatedOptions.scalePercent);
      elements.shapeDetection.setAttribute(
        "aria-checked",
        String(validatedOptions.shapeDetection.enabled),
      );
      for (const shape of nativeShapeSchema) {
        requireShapeInput(shapeTypeInputs, shape.key).checked =
          validatedOptions.shapeDetection.types[shape.key];
      }
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
  monochromeThreshold: HTMLInputElement;
  monochromeThresholdControl: HTMLElement;
  monochromeThresholdValue: HTMLOutputElement;
  preparedDimensions: HTMLOutputElement;
  rasterFilter: HTMLSelectElement;
  rasterResize: HTMLSelectElement;
  scalePercent: HTMLSelectElement;
  shapeDetection: HTMLButtonElement;
  shapeTypeOptions: HTMLElement;
  targetDimensions: HTMLOutputElement;
}

function readElements(): ConversionOptionElements {
  return {
    colorPrecision: requireElement("#color-precision", HTMLInputElement),
    colorPrecisionValue: requireElement("#color-precision-value", HTMLOutputElement),
    filterSpeckle: requireElement("#filter-speckle", HTMLInputElement),
    filterSpeckleValue: requireElement("#filter-speckle-value", HTMLOutputElement),
    monochromeThreshold: requireElement("#monochrome-threshold", HTMLInputElement),
    monochromeThresholdControl: requireElement("#monochrome-threshold-control", HTMLElement),
    monochromeThresholdValue: requireElement("#monochrome-threshold-value", HTMLOutputElement),
    preparedDimensions: requireElement("#prepared-raster-dimensions", HTMLOutputElement),
    rasterFilter: requireElement("#raster-filter", HTMLSelectElement),
    rasterResize: requireElement("#raster-resize", HTMLSelectElement),
    scalePercent: requireElement("#scale-percent", HTMLSelectElement),
    shapeDetection: requireElement("#shape-detection-enabled", HTMLButtonElement),
    shapeTypeOptions: requireElement("#shape-type-options", HTMLElement),
    targetDimensions: requireElement("#target-dimensions", HTMLOutputElement),
  };
}

function readRasterFilterMode(value: string): RasterFilterModeValue {
  switch (value) {
    case RasterFilterMode.Color:
    case RasterFilterMode.Grayscale:
    case RasterFilterMode.Monochrome:
      return value;
    default:
      throw new Error("Required raster filter is invalid.");
  }
}

function createShapeTypeInputs(
  container: HTMLElement,
): ReadonlyMap<NativeShapeType, HTMLInputElement> {
  const inputs = new Map<NativeShapeType, HTMLInputElement>();
  const labels = nativeShapeSchema.map((shape) => {
    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = defaultShapeDetectionOptions.types[shape.key];
    input.setAttribute("aria-label", `${shape.label} erkennen`);
    inputs.set(shape.key, input);

    const label = document.createElement("label");
    label.append(input, shape.label);
    return label;
  });
  container.replaceChildren(...labels);
  return inputs;
}

function readShapeTypes(inputs: ReadonlyMap<NativeShapeType, HTMLInputElement>): NativeShapeTypes {
  const types = { ...defaultShapeDetectionOptions.types };
  for (const shape of nativeShapeSchema) {
    types[shape.key] = requireShapeInput(inputs, shape.key).checked;
  }
  return types;
}

function requireShapeInput(
  inputs: ReadonlyMap<NativeShapeType, HTMLInputElement>,
  shape: NativeShapeType,
): HTMLInputElement {
  const input = inputs.get(shape);
  if (!input) {
    throw new Error(`Required shape input is missing: ${shape}`);
  }
  return input;
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
