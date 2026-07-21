import type { DecodedImage } from "../image/decode-image";
import {
  CurveFittingMode,
  HierarchicalMode,
  createConversionOptions,
  defaultConversionOptions,
  scaledDimensions,
  type ConversionOptions,
} from "./conversion-options";
import {
  RasterDetailMode,
  RasterFilterMode,
  createRasterPreprocessingOptions,
  preprocessedDimensions,
  rasterResizePresetId,
  rasterResizePresets,
  readRasterResizePreset,
  type RasterFilterMode as RasterFilterModeValue,
} from "./raster-preprocessing";
import {
  conversionPresets,
  customConversionPresetId,
  matchingConversionPresetId,
  readConversionPreset,
} from "./conversion-presets";
import {
  createShapeDetectionOptions,
  defaultShapeDetectionOptions,
  nativeShapeSchema,
  type NativeShapeType,
  type NativeShapeTypes,
} from "./shape-options";
import { ConversionOptionKey, shapeOptionKey } from "./conversion-option-key";

export interface ConversionOptionsController {
  apply(options: ConversionOptions): void;
  canReset(key: ConversionOptionKey): boolean;
  current(): ConversionOptions;
  reset(key: ConversionOptionKey): boolean;
  showSourceDimensions(image: DecodedImage): void;
  subscribe(listener: () => void): () => void;
}

export function initializeConversionOptions(): ConversionOptionsController {
  const elements = readElements();
  elements.rasterResize.replaceChildren(
    ...rasterResizePresets.map((preset) => new Option(preset.label, preset.id)),
  );
  const customPresetOption = new Option("Benutzerdefiniert", customConversionPresetId);
  customPresetOption.disabled = true;
  elements.preset.replaceChildren(
    ...conversionPresets.map((preset) => new Option(preset.label, preset.id)),
    customPresetOption,
  );
  const shapeTypeInputs = createShapeTypeInputs(elements.shapeTypeOptions);
  const listeners = new Set<() => void>();
  let sourceDimensions: { heightPixels: number; widthPixels: number } | undefined;

  const current = (): ConversionOptions =>
    createConversionOptions({
      colorPrecision: elements.colorPrecision.valueAsNumber,
      cornerThreshold: elements.cornerThreshold.valueAsNumber,
      curveFitting: readCurveFittingMode(elements.curveFitting.value),
      filterSpeckle: elements.filterSpeckle.valueAsNumber,
      hierarchical: readHierarchicalMode(elements.hierarchical.value),
      layerDifference: elements.layerDifference.valueAsNumber,
      lengthThreshold: elements.lengthThreshold.valueAsNumber,
      maxIterations: elements.maxIterations.valueAsNumber,
      pathPrecision: elements.pathPrecision.valueAsNumber,
      preprocessing: createRasterPreprocessingOptions({
        detailMode: readRasterDetailMode(elements.rasterDetail.value),
        filterMode: readRasterFilterMode(elements.rasterFilter.value),
        monochromeThreshold: elements.monochromeThreshold.valueAsNumber,
        resize: readRasterResizePreset(elements.rasterResize.value),
      }),
      scalePercent: Number(elements.scalePercent.value),
      shapeDetection: createShapeDetectionOptions({
        enabled: elements.shapeDetection.getAttribute("aria-checked") === "true",
        types: readShapeTypes(shapeTypeInputs),
      }),
      spliceThreshold: elements.spliceThreshold.valueAsNumber,
    });

  const render = (): void => {
    const options = current();
    elements.colorPrecisionValue.textContent = `${String(options.colorPrecision)} Bit`;
    elements.cornerThresholdValue.textContent = `${String(options.cornerThreshold)}°`;
    elements.filterSpeckleValue.textContent = `${String(options.filterSpeckle)} px`;
    elements.layerDifferenceValue.textContent = String(options.layerDifference);
    elements.lengthThresholdValue.textContent = `${options.lengthThreshold.toLocaleString("de-DE", { minimumFractionDigits: 1 })} px`;
    elements.maxIterationsValue.textContent = String(options.maxIterations);
    elements.pathPrecisionValue.textContent = `${String(options.pathPrecision)} ${options.pathPrecision === 1 ? "Stelle" : "Stellen"}`;
    elements.spliceThresholdValue.textContent = `${String(options.spliceThreshold)}°`;
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
    const splineControlsEnabled = options.curveFitting === CurveFittingMode.Spline;
    elements.cornerThreshold.disabled = !splineControlsEnabled;
    elements.lengthThreshold.disabled = !splineControlsEnabled;
    elements.maxIterations.disabled = !splineControlsEnabled;
    elements.spliceThreshold.disabled = !splineControlsEnabled;
    elements.preset.value = matchingConversionPresetId(options);
    for (const input of shapeTypeInputs.values()) {
      input.disabled = !shapeDetectionEnabled;
    }
  };

  const renderChangedOptions = (): void => {
    render();
    for (const listener of listeners) {
      listener();
    }
  };

  elements.colorPrecision.addEventListener("input", renderChangedOptions);
  elements.cornerThreshold.addEventListener("input", renderChangedOptions);
  elements.curveFitting.addEventListener("change", renderChangedOptions);
  elements.filterSpeckle.addEventListener("input", renderChangedOptions);
  elements.hierarchical.addEventListener("change", renderChangedOptions);
  elements.layerDifference.addEventListener("input", renderChangedOptions);
  elements.lengthThreshold.addEventListener("input", renderChangedOptions);
  elements.maxIterations.addEventListener("input", renderChangedOptions);
  elements.pathPrecision.addEventListener("input", renderChangedOptions);
  elements.monochromeThreshold.addEventListener("input", renderChangedOptions);
  elements.rasterFilter.addEventListener("change", renderChangedOptions);
  elements.rasterDetail.addEventListener("change", renderChangedOptions);
  elements.rasterResize.addEventListener("change", renderChangedOptions);
  elements.scalePercent.addEventListener("change", renderChangedOptions);
  elements.spliceThreshold.addEventListener("input", renderChangedOptions);
  elements.shapeDetection.addEventListener("click", () => {
    const enabled = elements.shapeDetection.getAttribute("aria-checked") === "true";
    elements.shapeDetection.setAttribute("aria-checked", String(!enabled));
    renderChangedOptions();
  });
  for (const input of shapeTypeInputs.values()) {
    input.addEventListener("change", renderChangedOptions);
  }
  elements.preset.addEventListener("change", () => {
    writeOptions(readConversionPreset(elements.preset.value).options);
    renderChangedOptions();
  });
  elements.resetTracingOptions.addEventListener("click", () => {
    writeTracingOptions(defaultConversionOptions);
    renderChangedOptions();
  });
  writeOptions(defaultConversionOptions);
  render();

  function writeOptions(options: Readonly<ConversionOptions>): void {
    const validatedOptions = createConversionOptions(options);
    elements.colorPrecision.value = String(validatedOptions.colorPrecision);
    elements.cornerThreshold.value = String(validatedOptions.cornerThreshold);
    elements.curveFitting.value = validatedOptions.curveFitting;
    elements.filterSpeckle.value = String(validatedOptions.filterSpeckle);
    elements.hierarchical.value = validatedOptions.hierarchical;
    elements.layerDifference.value = String(validatedOptions.layerDifference);
    elements.lengthThreshold.value = String(validatedOptions.lengthThreshold);
    elements.maxIterations.value = String(validatedOptions.maxIterations);
    elements.pathPrecision.value = String(validatedOptions.pathPrecision);
    elements.monochromeThreshold.value = String(validatedOptions.preprocessing.monochromeThreshold);
    elements.rasterFilter.value = validatedOptions.preprocessing.filterMode;
    elements.rasterDetail.value = validatedOptions.preprocessing.detailMode;
    elements.rasterResize.value = rasterResizePresetId(validatedOptions.preprocessing.resize);
    elements.scalePercent.value = String(validatedOptions.scalePercent);
    elements.spliceThreshold.value = String(validatedOptions.spliceThreshold);
    elements.shapeDetection.setAttribute(
      "aria-checked",
      String(validatedOptions.shapeDetection.enabled),
    );
    for (const shape of nativeShapeSchema) {
      requireShapeInput(shapeTypeInputs, shape.key).checked =
        validatedOptions.shapeDetection.types[shape.key];
    }
  }

  function writeTracingOptions(options: Readonly<ConversionOptions>): void {
    elements.colorPrecision.value = String(options.colorPrecision);
    elements.cornerThreshold.value = String(options.cornerThreshold);
    elements.curveFitting.value = options.curveFitting;
    elements.filterSpeckle.value = String(options.filterSpeckle);
    elements.hierarchical.value = options.hierarchical;
    elements.layerDifference.value = String(options.layerDifference);
    elements.lengthThreshold.value = String(options.lengthThreshold);
    elements.maxIterations.value = String(options.maxIterations);
    elements.pathPrecision.value = String(options.pathPrecision);
    elements.spliceThreshold.value = String(options.spliceThreshold);
  }

  function canReset(key: ConversionOptionKey): boolean {
    const options = current();
    switch (key) {
      case ConversionOptionKey.ColorPrecision:
        return options.colorPrecision !== defaultConversionOptions.colorPrecision;
      case ConversionOptionKey.CornerThreshold:
        return options.cornerThreshold !== defaultConversionOptions.cornerThreshold;
      case ConversionOptionKey.CurveFitting:
        return options.curveFitting !== defaultConversionOptions.curveFitting;
      case ConversionOptionKey.FilterSpeckle:
        return options.filterSpeckle !== defaultConversionOptions.filterSpeckle;
      case ConversionOptionKey.Hierarchical:
        return options.hierarchical !== defaultConversionOptions.hierarchical;
      case ConversionOptionKey.LayerDifference:
        return options.layerDifference !== defaultConversionOptions.layerDifference;
      case ConversionOptionKey.LengthThreshold:
        return options.lengthThreshold !== defaultConversionOptions.lengthThreshold;
      case ConversionOptionKey.MaxIterations:
        return options.maxIterations !== defaultConversionOptions.maxIterations;
      case ConversionOptionKey.MonochromeThreshold:
        return (
          options.preprocessing.monochromeThreshold !==
          defaultConversionOptions.preprocessing.monochromeThreshold
        );
      case ConversionOptionKey.PathPrecision:
        return options.pathPrecision !== defaultConversionOptions.pathPrecision;
      case ConversionOptionKey.Preset:
        return (
          matchingConversionPresetId(options) !==
          matchingConversionPresetId(defaultConversionOptions)
        );
      case ConversionOptionKey.RasterDetail:
        return (
          options.preprocessing.detailMode !== defaultConversionOptions.preprocessing.detailMode
        );
      case ConversionOptionKey.RasterFilter:
        return (
          options.preprocessing.filterMode !== defaultConversionOptions.preprocessing.filterMode
        );
      case ConversionOptionKey.RasterResize:
        return (
          rasterResizePresetId(options.preprocessing.resize) !==
          rasterResizePresetId(defaultConversionOptions.preprocessing.resize)
        );
      case ConversionOptionKey.ScalePercent:
        return options.scalePercent !== defaultConversionOptions.scalePercent;
      case ConversionOptionKey.ShapeCircle:
        return options.shapeDetection.types.circle !== defaultShapeDetectionOptions.types.circle;
      case ConversionOptionKey.ShapeDetection:
        return options.shapeDetection.enabled !== defaultShapeDetectionOptions.enabled;
      case ConversionOptionKey.ShapeEllipse:
        return options.shapeDetection.types.ellipse !== defaultShapeDetectionOptions.types.ellipse;
      case ConversionOptionKey.ShapeLine:
        return options.shapeDetection.types.line !== defaultShapeDetectionOptions.types.line;
      case ConversionOptionKey.ShapePolygon:
        return options.shapeDetection.types.polygon !== defaultShapeDetectionOptions.types.polygon;
      case ConversionOptionKey.ShapeRectangle:
        return (
          options.shapeDetection.types.rectangle !== defaultShapeDetectionOptions.types.rectangle
        );
      case ConversionOptionKey.SpliceThreshold:
        return options.spliceThreshold !== defaultConversionOptions.spliceThreshold;
    }
  }

  function reset(key: ConversionOptionKey): boolean {
    if (!canReset(key)) {
      return false;
    }
    writeDefaultOption(key);
    renderChangedOptions();
    return true;
  }

  function writeDefaultOption(key: ConversionOptionKey): void {
    switch (key) {
      case ConversionOptionKey.ColorPrecision:
        elements.colorPrecision.value = String(defaultConversionOptions.colorPrecision);
        return;
      case ConversionOptionKey.CornerThreshold:
        elements.cornerThreshold.value = String(defaultConversionOptions.cornerThreshold);
        return;
      case ConversionOptionKey.CurveFitting:
        elements.curveFitting.value = defaultConversionOptions.curveFitting;
        return;
      case ConversionOptionKey.FilterSpeckle:
        elements.filterSpeckle.value = String(defaultConversionOptions.filterSpeckle);
        return;
      case ConversionOptionKey.Hierarchical:
        elements.hierarchical.value = defaultConversionOptions.hierarchical;
        return;
      case ConversionOptionKey.LayerDifference:
        elements.layerDifference.value = String(defaultConversionOptions.layerDifference);
        return;
      case ConversionOptionKey.LengthThreshold:
        elements.lengthThreshold.value = String(defaultConversionOptions.lengthThreshold);
        return;
      case ConversionOptionKey.MaxIterations:
        elements.maxIterations.value = String(defaultConversionOptions.maxIterations);
        return;
      case ConversionOptionKey.MonochromeThreshold:
        elements.monochromeThreshold.value = String(
          defaultConversionOptions.preprocessing.monochromeThreshold,
        );
        return;
      case ConversionOptionKey.PathPrecision:
        elements.pathPrecision.value = String(defaultConversionOptions.pathPrecision);
        return;
      case ConversionOptionKey.Preset:
        writeOptions(defaultConversionOptions);
        return;
      case ConversionOptionKey.RasterDetail:
        elements.rasterDetail.value = defaultConversionOptions.preprocessing.detailMode;
        return;
      case ConversionOptionKey.RasterFilter:
        elements.rasterFilter.value = defaultConversionOptions.preprocessing.filterMode;
        return;
      case ConversionOptionKey.RasterResize:
        elements.rasterResize.value = rasterResizePresetId(
          defaultConversionOptions.preprocessing.resize,
        );
        return;
      case ConversionOptionKey.ScalePercent:
        elements.scalePercent.value = String(defaultConversionOptions.scalePercent);
        return;
      case ConversionOptionKey.ShapeCircle:
        requireShapeInput(shapeTypeInputs, "circle").checked =
          defaultShapeDetectionOptions.types.circle;
        return;
      case ConversionOptionKey.ShapeDetection:
        elements.shapeDetection.setAttribute(
          "aria-checked",
          String(defaultShapeDetectionOptions.enabled),
        );
        return;
      case ConversionOptionKey.ShapeEllipse:
        requireShapeInput(shapeTypeInputs, "ellipse").checked =
          defaultShapeDetectionOptions.types.ellipse;
        return;
      case ConversionOptionKey.ShapeLine:
        requireShapeInput(shapeTypeInputs, "line").checked =
          defaultShapeDetectionOptions.types.line;
        return;
      case ConversionOptionKey.ShapePolygon:
        requireShapeInput(shapeTypeInputs, "polygon").checked =
          defaultShapeDetectionOptions.types.polygon;
        return;
      case ConversionOptionKey.ShapeRectangle:
        requireShapeInput(shapeTypeInputs, "rectangle").checked =
          defaultShapeDetectionOptions.types.rectangle;
        return;
      case ConversionOptionKey.SpliceThreshold:
        elements.spliceThreshold.value = String(defaultConversionOptions.spliceThreshold);
    }
  }

  return {
    apply: (options) => {
      writeOptions(options);
      renderChangedOptions();
    },
    canReset,
    current,
    reset,
    showSourceDimensions: (image) => {
      sourceDimensions = image;
      render();
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

interface ConversionOptionElements {
  colorPrecision: HTMLInputElement;
  colorPrecisionValue: HTMLOutputElement;
  cornerThreshold: HTMLInputElement;
  cornerThresholdValue: HTMLOutputElement;
  curveFitting: HTMLSelectElement;
  filterSpeckle: HTMLInputElement;
  filterSpeckleValue: HTMLOutputElement;
  hierarchical: HTMLSelectElement;
  layerDifference: HTMLInputElement;
  layerDifferenceValue: HTMLOutputElement;
  lengthThreshold: HTMLInputElement;
  lengthThresholdValue: HTMLOutputElement;
  maxIterations: HTMLInputElement;
  maxIterationsValue: HTMLOutputElement;
  monochromeThreshold: HTMLInputElement;
  monochromeThresholdControl: HTMLElement;
  monochromeThresholdValue: HTMLOutputElement;
  pathPrecision: HTMLInputElement;
  pathPrecisionValue: HTMLOutputElement;
  preset: HTMLSelectElement;
  preparedDimensions: HTMLOutputElement;
  rasterFilter: HTMLSelectElement;
  rasterDetail: HTMLSelectElement;
  rasterResize: HTMLSelectElement;
  resetTracingOptions: HTMLButtonElement;
  scalePercent: HTMLSelectElement;
  shapeDetection: HTMLButtonElement;
  shapeTypeOptions: HTMLElement;
  spliceThreshold: HTMLInputElement;
  spliceThresholdValue: HTMLOutputElement;
  targetDimensions: HTMLOutputElement;
}

function readElements(): ConversionOptionElements {
  return {
    colorPrecision: requireElement("#color-precision", HTMLInputElement),
    colorPrecisionValue: requireElement("#color-precision-value", HTMLOutputElement),
    cornerThreshold: requireElement("#corner-threshold", HTMLInputElement),
    cornerThresholdValue: requireElement("#corner-threshold-value", HTMLOutputElement),
    curveFitting: requireElement("#curve-fitting", HTMLSelectElement),
    filterSpeckle: requireElement("#filter-speckle", HTMLInputElement),
    filterSpeckleValue: requireElement("#filter-speckle-value", HTMLOutputElement),
    hierarchical: requireElement("#hierarchical-mode", HTMLSelectElement),
    layerDifference: requireElement("#layer-difference", HTMLInputElement),
    layerDifferenceValue: requireElement("#layer-difference-value", HTMLOutputElement),
    lengthThreshold: requireElement("#length-threshold", HTMLInputElement),
    lengthThresholdValue: requireElement("#length-threshold-value", HTMLOutputElement),
    maxIterations: requireElement("#max-iterations", HTMLInputElement),
    maxIterationsValue: requireElement("#max-iterations-value", HTMLOutputElement),
    monochromeThreshold: requireElement("#monochrome-threshold", HTMLInputElement),
    monochromeThresholdControl: requireElement("#monochrome-threshold-control", HTMLElement),
    monochromeThresholdValue: requireElement("#monochrome-threshold-value", HTMLOutputElement),
    pathPrecision: requireElement("#path-precision", HTMLInputElement),
    pathPrecisionValue: requireElement("#path-precision-value", HTMLOutputElement),
    preset: requireElement("#conversion-preset", HTMLSelectElement),
    preparedDimensions: requireElement("#prepared-raster-dimensions", HTMLOutputElement),
    rasterFilter: requireElement("#raster-filter", HTMLSelectElement),
    rasterDetail: requireElement("#raster-detail", HTMLSelectElement),
    rasterResize: requireElement("#raster-resize", HTMLSelectElement),
    resetTracingOptions: requireElement("#reset-tracing-options", HTMLButtonElement),
    scalePercent: requireElement("#scale-percent", HTMLSelectElement),
    shapeDetection: requireElement("#shape-detection-enabled", HTMLButtonElement),
    shapeTypeOptions: requireElement("#shape-type-options", HTMLElement),
    spliceThreshold: requireElement("#splice-threshold", HTMLInputElement),
    spliceThresholdValue: requireElement("#splice-threshold-value", HTMLOutputElement),
    targetDimensions: requireElement("#target-dimensions", HTMLOutputElement),
  };
}

function readCurveFittingMode(value: string): CurveFittingMode {
  switch (value) {
    case CurveFittingMode.Pixel:
    case CurveFittingMode.Polygon:
    case CurveFittingMode.Spline:
      return value;
    default:
      throw new Error("Required curve fitting mode is invalid.");
  }
}

function readHierarchicalMode(value: string): HierarchicalMode {
  switch (value) {
    case HierarchicalMode.Cutout:
    case HierarchicalMode.Stacked:
      return value;
    default:
      throw new Error("Required hierarchical mode is invalid.");
  }
}

function readRasterDetailMode(value: string): RasterDetailMode {
  switch (value) {
    case RasterDetailMode.None:
    case RasterDetailMode.Sharpen:
    case RasterDetailMode.Smooth:
      return value;
    default:
      throw new Error("Required raster detail mode is invalid.");
  }
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
    const optionKey = shapeOptionKey(shape.key);
    label.dataset.helpKey = optionKey;
    label.dataset.optionKey = optionKey;
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
