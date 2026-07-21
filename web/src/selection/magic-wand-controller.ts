import "./magic-wand.css";
import { encodeRasterPng } from "../ai/encode-raster-png";
import { readRasterPixels, type RasterPixels } from "../conversion/read-raster-pixels";
import type { ImageLoaderController } from "../image/image-loader";
import type { LoadedImage } from "../image/image-store";
import {
  createMagicWandMask,
  removeMagicWandSelection,
  type MagicWandMask,
} from "./magic-wand-selection";
import { SelectionTool, type SelectionActivity } from "./selection-activity";
import type { WorkspaceViewController } from "../workspace/workspace-view-controller";

export interface MagicWandController {
  applySelection(): Promise<MagicWandApplyResult>;
  imageLoaded(): void;
  previewSelection(request: MagicWandPreviewRequest): Promise<MagicWandPreviewResult>;
}

export const MagicWandRasterSource = {
  Original: "original",
  Processed: "processed",
} as const;

export type MagicWandRasterSource =
  (typeof MagicWandRasterSource)[keyof typeof MagicWandRasterSource];

export interface MagicWandPreviewRequest {
  readonly sensitivityPercent: number;
  readonly source: MagicWandRasterSource;
  readonly x: number;
  readonly y: number;
}

export type MagicWandPreviewResult =
  | Readonly<{
      coveragePercent: number;
      ok: true;
      seed: Readonly<{ xPixels: number; yPixels: number }>;
      selectedPixelCount: number;
      sensitivityPercent: number;
      source: MagicWandRasterSource;
    }>
  | Readonly<{ message: string; ok: false }>;

export type MagicWandApplyResult =
  | Readonly<{ fileName: string; ok: true; selectedPixelCount: number }>
  | Readonly<{ message: string; ok: false }>;

interface ActiveMagicWand {
  readonly input: RasterPixels;
  mask: MagicWandMask | undefined;
  seed: Readonly<{ xPixels: number; yPixels: number }> | undefined;
  readonly source: LoadedImage;
}

interface MagicWandElements {
  readonly canvas: HTMLCanvasElement;
  readonly discard: HTMLButtonElement;
  readonly overlay: HTMLElement;
  readonly previewPane: HTMLElement;
  readonly remove: HTMLButtonElement;
  readonly sensitivity: HTMLInputElement;
  readonly sensitivityValue: HTMLOutputElement;
  readonly start: HTMLButtonElement;
  readonly status: HTMLOutputElement;
  readonly workspaceImage: HTMLImageElement;
}

const defaultSensitivityPercent = 15;

export function initializeMagicWand(
  imageLoader: ImageLoaderController,
  selectionActivity: SelectionActivity,
  workspaceView: WorkspaceViewController,
): MagicWandController {
  const elements = readElements();
  let active: ActiveMagicWand | undefined;
  let applying = false;
  let refreshFrame: number | undefined;
  let starting = false;

  const updateAvailability = (): void => {
    elements.start.disabled =
      workspaceView.rasterSource() === undefined ||
      active !== undefined ||
      starting ||
      applying ||
      selectionActivity.blocked(SelectionTool.MagicWand);
  };

  const closeSelection = (): void => {
    active = undefined;
    if (refreshFrame !== undefined) {
      window.cancelAnimationFrame(refreshFrame);
      refreshFrame = undefined;
    }
    elements.overlay.hidden = true;
    elements.canvas.removeAttribute("aria-busy");
    elements.canvas
      .getContext("2d")
      ?.clearRect(0, 0, elements.canvas.width, elements.canvas.height);
    selectionActivity.release(SelectionTool.MagicWand);
    renderControls(elements, undefined, applying);
    updateAvailability();
  };

  const imageLoaded = (): void => {
    if (active) {
      closeSelection();
    }
    updateAvailability();
  };

  const startSelection = async (): Promise<ActiveMagicWand | undefined> => {
    const source = workspaceView.rasterSource();
    if (active) {
      return active;
    }
    if (!source || starting || applying || !selectionActivity.acquire(SelectionTool.MagicWand)) {
      return undefined;
    }
    starting = true;
    updateAvailability();
    elements.status.textContent = "Zauberstab wird vorbereitet …";
    try {
      const input = await readRasterPixels(source.file);
      if (workspaceView.rasterSource() !== source) {
        return;
      }
      active = { input, mask: undefined, seed: undefined, source };
      elements.canvas.width = input.widthPixels;
      elements.canvas.height = input.heightPixels;
      elements.overlay.hidden = false;
      syncOverlayGeometry(elements, input);
      renderMask(elements.canvas, undefined);
      renderControls(elements, active, applying);
      elements.status.textContent =
        "Klicke auf den zusammenhängenden Farbbereich, den du entfernen möchtest.";
      return active;
    } catch (error) {
      elements.status.textContent = errorMessage(error);
      return undefined;
    } finally {
      starting = false;
      if (!active) {
        selectionActivity.release(SelectionTool.MagicWand);
      }
      updateAvailability();
    }
  };

  workspaceView.subscribe(updateAvailability);

  const refreshMask = (): void => {
    if (!active?.seed) {
      return;
    }
    active.mask = createMagicWandMask(active.input, {
      sensitivityPercent: readSensitivity(elements),
      ...active.seed,
    });
    renderMask(elements.canvas, active.mask);
    renderControls(elements, active, applying);
    elements.status.textContent = `${formatPixelCount(active.mask.selectedPixelCount)} ausgewählt · Empfindlichkeit ${String(readSensitivity(elements))} %`;
  };

  const scheduleMaskRefresh = (): void => {
    if (refreshFrame !== undefined) {
      window.cancelAnimationFrame(refreshFrame);
    }
    refreshFrame = window.requestAnimationFrame(() => {
      refreshFrame = undefined;
      refreshMask();
    });
  };

  const selectRegion = (event: PointerEvent): void => {
    if (!active || applying || event.button !== 0) {
      return;
    }
    const bounds = elements.canvas.getBoundingClientRect();
    if (bounds.width <= 0 || bounds.height <= 0) {
      return;
    }
    event.preventDefault();
    active.seed = Object.freeze({
      xPixels: clamp(
        Math.floor(((event.clientX - bounds.left) / bounds.width) * active.input.widthPixels),
        0,
        active.input.widthPixels - 1,
      ),
      yPixels: clamp(
        Math.floor(((event.clientY - bounds.top) / bounds.height) * active.input.heightPixels),
        0,
        active.input.heightPixels - 1,
      ),
    });
    refreshMask();
  };

  const removeSelection = async (): Promise<MagicWandApplyResult> => {
    const selection = active;
    if (!selection?.mask || applying) {
      return Object.freeze({
        message: "Zeige zuerst eine Zauberstab-Auswahl an.",
        ok: false,
      });
    }
    const selectedPixelCount = selection.mask.selectedPixelCount;
    const fileName = resultFileName(selection.source.file.name);
    applying = true;
    elements.canvas.setAttribute("aria-busy", "true");
    renderControls(elements, selection, applying);
    elements.status.textContent = "Auswahl wird lokal entfernt …";
    try {
      const result = removeMagicWandSelection(selection.input, selection.mask);
      const file = await encodeRasterPng(result, fileName);
      if (!(await imageLoader.loadManualVersion(file))) {
        throw new Error("Das Zauberstab-Ergebnis konnte nicht angezeigt werden.");
      }
      elements.status.textContent = "Zauberstab-Auswahl lokal entfernt.";
      return Object.freeze({ fileName, ok: true, selectedPixelCount });
    } catch (error) {
      const message = errorMessage(error);
      elements.status.textContent = message;
      return Object.freeze({ message, ok: false });
    } finally {
      applying = false;
      elements.canvas.removeAttribute("aria-busy");
      renderControls(elements, active, applying);
      updateAvailability();
    }
  };

  const previewSelection = async (
    request: MagicWandPreviewRequest,
  ): Promise<MagicWandPreviewResult> => {
    if (!validPreviewRequest(request)) {
      return Object.freeze({
        message: "Zauberstab-Koordinaten und Empfindlichkeit sind ungültig.",
        ok: false,
      });
    }
    if (request.source === MagicWandRasterSource.Original) {
      workspaceView.showOriginal();
    } else {
      workspaceView.showProcessed();
    }
    const source = workspaceView.rasterSource();
    if (!source) {
      return Object.freeze({ message: "Die gewählte Rasterquelle ist nicht geladen.", ok: false });
    }
    if (active && active.source !== source) {
      closeSelection();
    }
    const selection = await startSelection();
    if (!selection) {
      return Object.freeze({
        message: elements.status.textContent || "Der Zauberstab konnte nicht gestartet werden.",
        ok: false,
      });
    }
    elements.sensitivity.value = String(request.sensitivityPercent);
    elements.sensitivityValue.textContent = `${String(request.sensitivityPercent)} %`;
    selection.seed = Object.freeze({
      xPixels: normalizedPixel(request.x, selection.input.widthPixels),
      yPixels: normalizedPixel(request.y, selection.input.heightPixels),
    });
    refreshMask();
    const mask = selection.mask;
    if (!mask) {
      return Object.freeze({
        message: "Die Zauberstab-Auswahl konnte nicht berechnet werden.",
        ok: false,
      });
    }
    return Object.freeze({
      coveragePercent: Number(((mask.selectedPixelCount / mask.selected.length) * 100).toFixed(2)),
      ok: true,
      seed: selection.seed,
      selectedPixelCount: mask.selectedPixelCount,
      sensitivityPercent: request.sensitivityPercent,
      source: request.source,
    });
  };

  elements.start.addEventListener("click", () => void startSelection());
  elements.canvas.addEventListener("pointerdown", selectRegion);
  elements.sensitivity.addEventListener("input", () => {
    elements.sensitivityValue.textContent = `${String(readSensitivity(elements))} %`;
    scheduleMaskRefresh();
  });
  elements.remove.addEventListener("click", () => void removeSelection());
  elements.discard.addEventListener("click", () => {
    if (applying) {
      return;
    }
    closeSelection();
    elements.status.textContent = "Zauberstab verworfen; Bild unverändert.";
  });
  selectionActivity.subscribe(updateAvailability);
  new ResizeObserver(() => {
    if (active) {
      syncOverlayGeometry(elements, active.input);
    }
  }).observe(elements.previewPane);
  elements.sensitivity.value = String(defaultSensitivityPercent);
  elements.sensitivityValue.textContent = `${String(defaultSensitivityPercent)} %`;
  renderControls(elements, undefined, applying);
  updateAvailability();

  return Object.freeze({
    applySelection: removeSelection,
    imageLoaded,
    previewSelection,
  });
}

function validPreviewRequest(request: MagicWandPreviewRequest): boolean {
  return (
    (request.source === MagicWandRasterSource.Original ||
      request.source === MagicWandRasterSource.Processed) &&
    within(request.x, 0, 1) &&
    within(request.y, 0, 1) &&
    within(request.sensitivityPercent, 0, 100)
  );
}

function normalizedPixel(value: number, length: number): number {
  return clamp(Math.floor(value * length), 0, length - 1);
}

function within(value: number, minimum: number, maximum: number): boolean {
  return Number.isFinite(value) && value >= minimum && value <= maximum;
}

function renderControls(
  elements: MagicWandElements,
  selection: ActiveMagicWand | undefined,
  busy: boolean,
): void {
  elements.sensitivity.disabled = busy;
  elements.remove.disabled = busy || selection?.mask === undefined;
  elements.discard.disabled = busy;
}

function renderMask(canvas: HTMLCanvasElement, mask: MagicWandMask | undefined): void {
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Der Browser konnte die Zauberstab-Maske nicht anzeigen.");
  }
  context.clearRect(0, 0, canvas.width, canvas.height);
  if (!mask) {
    return;
  }
  const rgba = new Uint8ClampedArray(mask.selected.length * 4);
  for (let pixelIndex = 0; pixelIndex < mask.selected.length; pixelIndex += 1) {
    if ((mask.selected[pixelIndex] ?? 0) !== 0) {
      const offset = pixelIndex * 4;
      rgba[offset] = 32;
      rgba[offset + 1] = 197;
      rgba[offset + 2] = 224;
      rgba[offset + 3] = 108;
    }
  }
  context.putImageData(new ImageData(rgba, canvas.width, canvas.height), 0, 0);
}

function syncOverlayGeometry(elements: MagicWandElements, input: RasterPixels): void {
  const imageBounds = elements.workspaceImage.getBoundingClientRect();
  const paneBounds = elements.previewPane.getBoundingClientRect();
  const scale = Math.min(
    imageBounds.width / input.widthPixels,
    imageBounds.height / input.heightPixels,
  );
  const width = input.widthPixels * scale;
  const height = input.heightPixels * scale;
  elements.overlay.style.left = `${String(imageBounds.left - paneBounds.left + (imageBounds.width - width) / 2)}px`;
  elements.overlay.style.top = `${String(imageBounds.top - paneBounds.top + (imageBounds.height - height) / 2)}px`;
  elements.overlay.style.width = `${String(width)}px`;
  elements.overlay.style.height = `${String(height)}px`;
}

function readSensitivity(elements: MagicWandElements): number {
  return Number(elements.sensitivity.value);
}

function readElements(): MagicWandElements {
  const overlay = requireElement("#magic-wand-overlay", HTMLElement);
  const previewPane = overlay.parentElement;
  if (!(previewPane instanceof HTMLElement)) {
    throw new Error("Required Magic Wand preview pane is missing.");
  }
  return {
    canvas: requireElement("#magic-wand-canvas", HTMLCanvasElement),
    discard: requireElement("#magic-wand-discard", HTMLButtonElement),
    overlay,
    previewPane,
    remove: requireElement("#magic-wand-remove", HTMLButtonElement),
    sensitivity: requireElement("#magic-wand-sensitivity", HTMLInputElement),
    sensitivityValue: requireElement("#magic-wand-sensitivity-value", HTMLOutputElement),
    start: requireElement("#magic-wand", HTMLButtonElement),
    status: requireElement("#magic-wand-status", HTMLOutputElement),
    workspaceImage: requireElement("#workspace-raster-preview", HTMLImageElement),
  };
}

function resultFileName(sourceName: string): string {
  const baseName = sourceName.replace(/\.[^.]+$/u, "") || "bild";
  return `${baseName}-zauberstab.png`;
}

function formatPixelCount(count: number): string {
  return `${String(count)} Pixel`;
}

function errorMessage(error: unknown): string {
  return error instanceof Error && error.message.trim().length > 0
    ? error.message
    : "Der Zauberstab konnte nicht ausgeführt werden.";
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}

function requireElement<ElementType extends Element>(
  selector: string,
  constructor: new () => ElementType,
): ElementType {
  const element = document.querySelector(selector);
  if (!(element instanceof constructor)) {
    throw new Error(`Required Magic Wand element is missing: ${selector}`);
  }
  return element;
}
