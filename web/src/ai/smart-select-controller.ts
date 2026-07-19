import "./sam-selection.css";
import { readRasterPixels, type RasterPixels } from "../conversion/read-raster-pixels";
import type { ImageLoaderController } from "../image/image-loader";
import type { ImageStore, LoadedImage } from "../image/image-store";
import { encodeRasterPng } from "./encode-raster-png";
import { isLoadedSamModel, type SamSelectionSession } from "./sam-adapter";
import {
  applySelectionMask,
  createSamPoint,
  MaskPolarity,
  SamPointKind,
  type SamPointKind as SamPointKindValue,
  type SamSelectionMask,
  type SamSelectionPoint,
} from "./sam-selection";
import type { ModelRegistry, ModelRegistrySnapshot } from "./model-registry";
import type { AiActionResult } from "./ai-action-result";

export interface SmartSelectController {
  applySelection(request: SmartSelectionRequest): Promise<AiActionResult>;
  imageLoaded(): void;
}

export interface NormalizedImagePoint {
  readonly x: number;
  readonly y: number;
}

export interface SmartSelectionRequest {
  readonly negativePoints: readonly NormalizedImagePoint[];
  readonly polarity: MaskPolarity;
  readonly positivePoints: readonly NormalizedImagePoint[];
}

interface ActiveSelection {
  readonly input: RasterPixels;
  mask: SamSelectionMask | undefined;
  readonly points: SamSelectionPoint[];
  polarity: MaskPolarity;
  readonly session: SamSelectionSession;
  readonly source: LoadedImage;
}

interface SmartSelectElements {
  readonly apply: HTMLButtonElement;
  readonly canvas: HTMLCanvasElement;
  readonly discard: HTMLButtonElement;
  readonly invert: HTMLButtonElement;
  readonly negative: HTMLButtonElement;
  readonly overlay: HTMLElement;
  readonly points: HTMLElement;
  readonly positive: HTMLButtonElement;
  readonly previewPane: HTMLElement;
  readonly start: HTMLButtonElement;
  readonly status: HTMLOutputElement;
  readonly workspaceImage: HTMLImageElement;
}

export function initializeSmartSelect(
  imageStore: ImageStore,
  imageLoader: ImageLoaderController,
  registry: ModelRegistry,
): SmartSelectController {
  const elements = readElements();
  let active: ActiveSelection | undefined;
  let applying = false;
  let pointKind: SamPointKindValue = SamPointKind.Positive;
  let predicting = false;
  let starting = false;
  const currentSelection = (): ActiveSelection | undefined => active;

  const updateAvailability = (): void => {
    elements.start.disabled =
      imageStore.current() === undefined ||
      registry.snapshot("slimsam").state.status !== "ready" ||
      starting ||
      applying ||
      active !== undefined;
  };

  const closeSelection = async (): Promise<void> => {
    const closing = active;
    active = undefined;
    elements.overlay.hidden = true;
    elements.points.replaceChildren();
    renderControls(elements, undefined, pointKind, predicting);
    updateAvailability();
    await closing?.session.dispose();
  };

  const imageLoaded = (): void => {
    if (active) {
      void closeSelection();
    }
    updateAvailability();
  };

  const startSelection = async (): Promise<boolean> => {
    const source = imageStore.current();
    if (!source || starting || active) {
      return false;
    }
    if (!imageLoader.showCurrentImage()) {
      return false;
    }
    starting = true;
    updateAvailability();
    elements.status.textContent = "SlimSAM berechnet das lokale Bild-Embedding …";
    try {
      const input = await readRasterPixels(source.file);
      const session = await registry.withLoadedModel("slimsam", async (model) => {
        if (!isLoadedSamModel(model)) {
          throw new Error("Das geladene Modell unterstützt Smart Select nicht.");
        }
        return model.createSelection(input);
      });
      if (imageStore.current() !== source) {
        await session.dispose();
        return false;
      }
      active = {
        input,
        mask: undefined,
        points: [],
        polarity: MaskPolarity.Selected,
        session,
        source,
      };
      pointKind = SamPointKind.Positive;
      elements.canvas.width = input.widthPixels;
      elements.canvas.height = input.heightPixels;
      elements.overlay.hidden = false;
      syncOverlayGeometry(elements, input);
      renderMask(elements.canvas, active);
      renderPoints(elements.points, active);
      renderControls(elements, active, pointKind, predicting);
      elements.status.textContent =
        "Vordergrundpunkte setzen; für Korrekturen auf „Hintergrund“ wechseln.";
      return true;
    } catch (error) {
      elements.status.textContent = errorMessage(error);
      return false;
    } finally {
      starting = false;
      updateAvailability();
    }
  };

  const predict = async (event: PointerEvent): Promise<void> => {
    const selection = currentSelection();
    if (!selection || predicting || event.button !== 0) {
      return;
    }
    event.preventDefault();
    const bounds = elements.canvas.getBoundingClientRect();
    if (bounds.width <= 0 || bounds.height <= 0) {
      return;
    }
    selection.points.push(
      createSamPoint(
        {
          kind: pointKind,
          xPixels: ((event.clientX - bounds.left) / bounds.width) * selection.input.widthPixels,
          yPixels: ((event.clientY - bounds.top) / bounds.height) * selection.input.heightPixels,
        },
        selection.input,
      ),
    );
    renderPoints(elements.points, selection);
    predicting = true;
    renderControls(elements, selection, pointKind, predicting);
    elements.canvas.setAttribute("aria-busy", "true");
    elements.status.textContent = `Maske wird mit ${String(selection.points.length)} ${pointLabel(selection.points.length)} verfeinert …`;
    try {
      const mask = await registry.withLoadedModel("slimsam", async (model) => {
        if (!isLoadedSamModel(model)) {
          throw new Error("Das geladene Modell unterstützt Smart Select nicht.");
        }
        return selection.session.predict(selection.points);
      });
      if (active === selection) {
        selection.mask = mask;
        renderMask(elements.canvas, selection);
        elements.status.textContent = `Maske mit ${String(selection.points.length)} ${pointLabel(selection.points.length)} aktualisiert · WebGPU`;
      }
    } catch (error) {
      if (active === selection) {
        elements.status.textContent = errorMessage(error);
      }
    } finally {
      predicting = false;
      elements.canvas.removeAttribute("aria-busy");
      if (active === selection) {
        renderControls(elements, selection, pointKind, predicting);
      }
    }
  };

  const applyMask = async (): Promise<AiActionResult> => {
    const selection = currentSelection();
    if (!selection?.mask || predicting || applying) {
      return { message: "Es ist keine anwendbare Smart-Select-Maske vorhanden.", ok: false };
    }
    applying = true;
    renderControls(elements, selection, pointKind, true);
    elements.status.textContent = "Smart-Select-Maske wird lokal angewendet …";
    try {
      const result = applySelectionMask(selection.input, selection.mask, selection.polarity);
      const fileName = resultFileName(selection.source.file.name);
      await closeSelection();
      const file = await encodeRasterPng(result, fileName);
      if (!(await imageLoader.loadAiVersion(file))) {
        throw new Error("Das Smart-Select-Ergebnis konnte nicht angezeigt werden.");
      }
      elements.status.textContent = "Smart Select lokal angewendet.";
      return { fileName: file.name, ok: true };
    } catch (error) {
      const message = errorMessage(error);
      elements.status.textContent = message;
      return { message, ok: false };
    } finally {
      applying = false;
      updateAvailability();
    }
  };

  const applySelection = async (request: SmartSelectionRequest): Promise<AiActionResult> => {
    if (!isValidRequest(request)) {
      return {
        message:
          "Smart Select benötigt mindestens zwei Vordergrund- und einen Hintergrundpunkt zwischen 0 und 1.",
        ok: false,
      };
    }
    if (active || predicting || applying || starting) {
      return { message: "Smart Select ist bereits aktiv.", ok: false };
    }
    if (!(await startSelection())) {
      return {
        message: elements.status.textContent || "Smart Select konnte nicht starten.",
        ok: false,
      };
    }
    const selection = currentSelection();
    if (!selection) {
      return { message: "Smart Select konnte nicht starten.", ok: false };
    }
    const requestedPoints = [
      ...request.positivePoints.map((point) =>
        normalizedPoint(point, SamPointKind.Positive, selection),
      ),
      ...request.negativePoints.map((point) =>
        normalizedPoint(point, SamPointKind.Negative, selection),
      ),
    ];
    selection.polarity = request.polarity;
    predicting = true;
    renderControls(elements, selection, pointKind, predicting);
    elements.canvas.setAttribute("aria-busy", "true");
    try {
      for (const requestedPoint of requestedPoints) {
        selection.points.push(requestedPoint);
        renderPoints(elements.points, selection);
        elements.status.textContent = `Maske wird mit ${String(selection.points.length)} ${pointLabel(selection.points.length)} verfeinert …`;
        selection.mask = await registry.withLoadedModel("slimsam", async (model) => {
          if (!isLoadedSamModel(model)) {
            throw new Error("Das geladene Modell unterstützt Smart Select nicht.");
          }
          return selection.session.predict(selection.points);
        });
        renderMask(elements.canvas, selection);
      }
    } catch (error) {
      const message = errorMessage(error);
      elements.status.textContent = message;
      await closeSelection();
      return { message, ok: false };
    } finally {
      predicting = false;
      elements.canvas.removeAttribute("aria-busy");
    }
    return applyMask();
  };

  elements.start.addEventListener("click", () => void startSelection());
  elements.canvas.addEventListener("pointerdown", (event) => void predict(event));
  elements.positive.addEventListener("click", () => {
    pointKind = SamPointKind.Positive;
    renderControls(elements, active, pointKind, predicting);
  });
  elements.negative.addEventListener("click", () => {
    pointKind = SamPointKind.Negative;
    renderControls(elements, active, pointKind, predicting);
  });
  elements.invert.addEventListener("click", () => {
    if (!active?.mask || predicting) {
      return;
    }
    active.polarity =
      active.polarity === MaskPolarity.Selected ? MaskPolarity.Inverted : MaskPolarity.Selected;
    renderMask(elements.canvas, active);
    renderControls(elements, active, pointKind, predicting);
    elements.status.textContent =
      active.polarity === MaskPolarity.Inverted ? "Maske invertiert." : "Maske normal.";
  });
  elements.apply.addEventListener("click", () => void applyMask());
  elements.discard.addEventListener("click", () => {
    if (predicting) {
      return;
    }
    void closeSelection().then(() => {
      elements.status.textContent = "Smart Select verworfen; Original unverändert.";
    });
  });
  registry.subscribe((snapshot) => {
    if (snapshot.model.id !== "slimsam") {
      return;
    }
    if (active && terminalModelState(snapshot)) {
      void closeSelection();
    }
    updateAvailability();
  });
  new ResizeObserver(() => {
    if (active) {
      syncOverlayGeometry(elements, active.input);
    }
  }).observe(elements.previewPane);
  updateAvailability();

  return Object.freeze({ applySelection, imageLoaded });
}

function normalizedPoint(
  point: NormalizedImagePoint,
  kind: SamPointKindValue,
  selection: ActiveSelection,
): SamSelectionPoint {
  return createSamPoint(
    {
      kind,
      xPixels: point.x * (selection.input.widthPixels - 1),
      yPixels: point.y * (selection.input.heightPixels - 1),
    },
    selection.input,
  );
}

function isValidRequest(request: SmartSelectionRequest): boolean {
  return (
    (request.polarity === MaskPolarity.Selected || request.polarity === MaskPolarity.Inverted) &&
    request.positivePoints.length >= 2 &&
    request.negativePoints.length >= 1 &&
    [...request.positivePoints, ...request.negativePoints].every(
      (point) =>
        Number.isFinite(point.x) &&
        Number.isFinite(point.y) &&
        point.x >= 0 &&
        point.x <= 1 &&
        point.y >= 0 &&
        point.y <= 1,
    )
  );
}

function terminalModelState(snapshot: ModelRegistrySnapshot): boolean {
  return snapshot.state.status === "not-loaded" || snapshot.state.status === "error";
}

function renderControls(
  elements: SmartSelectElements,
  selection: ActiveSelection | undefined,
  pointKind: SamPointKindValue,
  busy: boolean,
): void {
  elements.positive.setAttribute("aria-pressed", String(pointKind === SamPointKind.Positive));
  elements.negative.setAttribute("aria-pressed", String(pointKind === SamPointKind.Negative));
  elements.invert.setAttribute(
    "aria-pressed",
    String(selection?.polarity === MaskPolarity.Inverted),
  );
  elements.positive.disabled = busy;
  elements.negative.disabled = busy;
  elements.invert.disabled = busy || selection?.mask === undefined;
  elements.apply.disabled = busy || selection?.mask === undefined;
  elements.discard.disabled = busy;
}

function renderMask(canvas: HTMLCanvasElement, selection: ActiveSelection): void {
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Der Browser konnte die Smart-Select-Maske nicht anzeigen.");
  }
  context.clearRect(0, 0, canvas.width, canvas.height);
  if (!selection.mask) {
    return;
  }
  const pixelCount = canvas.width * canvas.height;
  const rgba = new Uint8ClampedArray(pixelCount * 4);
  for (let pixelIndex = 0; pixelIndex < pixelCount; pixelIndex += 1) {
    const selected = (selection.mask.selected[pixelIndex] ?? 0) !== 0;
    const visible = selection.polarity === MaskPolarity.Selected ? selected : !selected;
    if (visible) {
      const offset = pixelIndex * 4;
      rgba[offset] = 32;
      rgba[offset + 1] = 197;
      rgba[offset + 2] = 224;
      rgba[offset + 3] = 92;
    }
  }
  context.putImageData(new ImageData(rgba, canvas.width, canvas.height), 0, 0);
}

function renderPoints(container: HTMLElement, selection: ActiveSelection): void {
  container.replaceChildren(
    ...selection.points.map((point, index) => {
      const marker = document.createElement("span");
      marker.className = "sam-point";
      marker.dataset.pointKind = point.kind;
      marker.setAttribute("role", "img");
      marker.setAttribute(
        "aria-label",
        `${point.kind === SamPointKind.Positive ? "Vordergrund" : "Hintergrund"}punkt ${String(index + 1)}`,
      );
      marker.style.left = `${String(((point.xPixels + 0.5) / selection.input.widthPixels) * 100)}%`;
      marker.style.top = `${String(((point.yPixels + 0.5) / selection.input.heightPixels) * 100)}%`;
      marker.textContent = point.kind === SamPointKind.Positive ? "+" : "−";
      return marker;
    }),
  );
}

function syncOverlayGeometry(elements: SmartSelectElements, input: RasterPixels): void {
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

function readElements(): SmartSelectElements {
  const overlay = requireElement("#sam-selection-overlay", HTMLElement);
  const previewPane = overlay.parentElement;
  if (!(previewPane instanceof HTMLElement)) {
    throw new Error("Required Smart-Select preview pane is missing.");
  }
  return {
    apply: requireElement("#sam-apply-mask", HTMLButtonElement),
    canvas: requireElement("#sam-mask-canvas", HTMLCanvasElement),
    discard: requireElement("#sam-discard-mask", HTMLButtonElement),
    invert: requireElement("#sam-invert-mask", HTMLButtonElement),
    negative: requireElement("#sam-negative-point", HTMLButtonElement),
    overlay,
    points: requireElement("#sam-selection-points", HTMLElement),
    positive: requireElement("#sam-positive-point", HTMLButtonElement),
    previewPane,
    start: requireElement("#smart-select", HTMLButtonElement),
    status: requireElement("#smart-select-status", HTMLOutputElement),
    workspaceImage: requireElement("#workspace-raster-preview", HTMLImageElement),
  };
}

function resultFileName(sourceName: string): string {
  const baseName = sourceName.replace(/\.[^.]+$/, "") || "bild";
  return `${baseName}-smart-select.png`;
}

function pointLabel(count: number): string {
  return count === 1 ? "Punkt" : "Punkten";
}

function errorMessage(error: unknown): string {
  return error instanceof Error && error.message.trim().length > 0
    ? error.message
    : "Smart Select konnte nicht ausgeführt werden.";
}

function requireElement<ElementType extends Element>(
  selector: string,
  constructor: new () => ElementType,
): ElementType {
  const element = document.querySelector(selector);
  if (!(element instanceof constructor)) {
    throw new Error(`Required Smart-Select element is missing: ${selector}`);
  }
  return element;
}
