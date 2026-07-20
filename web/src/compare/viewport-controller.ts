import {
  initialViewport,
  panViewport,
  pinchViewport,
  type ViewportPoint,
  zoomViewportAt,
} from "./viewport-state";

export interface ViewportController {
  reset(): void;
  setEnabled(enabled: boolean): void;
}

interface ActivePointer extends ViewportPoint {
  readonly id: number;
}

const zoomStep = 1.25;
const keyboardPanPixels = 24;

export function initializeViewport(): ViewportController {
  const elements = readElements();
  const pointers = new Map<number, ActivePointer>();
  let viewport = initialViewport;
  let previousPinchDistance: number | undefined;
  let previousPinchCenter: ViewportPoint | undefined;

  const render = (): void => {
    const transform = `translate(${formatPixels(viewport.offsetX)}, ${formatPixels(viewport.offsetY)}) scale(${String(viewport.scale)})`;
    elements.contentA.style.transform = transform;
    elements.contentB.style.transform = transform;
    elements.value.textContent = `${String(Math.round(viewport.scale * 100))}%`;
  };

  const canvasCenter = (): ViewportPoint => ({
    x: elements.canvas.clientWidth / 2,
    y: elements.canvas.clientHeight / 2,
  });

  const zoom = (requestedScale: number, anchor: ViewportPoint = canvasCenter()): void => {
    viewport = zoomViewportAt(viewport, requestedScale, anchor, canvasCenter());
    render();
  };

  const updateGesture = (): void => {
    const activePointers = [...pointers.values()];
    if (activePointers.length !== 2) {
      previousPinchDistance = undefined;
      previousPinchCenter = undefined;
      return;
    }
    const [first, second] = activePointers as [ActivePointer, ActivePointer];
    previousPinchDistance = distance(first, second);
    previousPinchCenter = midpoint(first, second);
  };

  elements.zoomIn.addEventListener("click", () => zoom(viewport.scale * zoomStep));
  elements.zoomOut.addEventListener("click", () => zoom(viewport.scale / zoomStep));
  elements.canvas.addEventListener(
    "wheel",
    (event) => {
      event.preventDefault();
      const bounds = elements.canvas.getBoundingClientRect();
      zoom(viewport.scale * (event.deltaY < 0 ? zoomStep : 1 / zoomStep), {
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
      });
    },
    { passive: false },
  );
  elements.canvas.addEventListener("pointerdown", (event) => {
    elements.canvas.setPointerCapture(event.pointerId);
    pointers.set(event.pointerId, { id: event.pointerId, x: event.clientX, y: event.clientY });
    elements.canvas.classList.add("is-panning");
    updateGesture();
  });
  elements.canvas.addEventListener("pointermove", (event) => {
    const previous = pointers.get(event.pointerId);
    if (!previous) {
      return;
    }
    pointers.set(event.pointerId, { id: event.pointerId, x: event.clientX, y: event.clientY });
    if (pointers.size === 1) {
      viewport = panViewport(viewport, event.clientX - previous.x, event.clientY - previous.y);
      render();
      return;
    }
    const activePointers = [...pointers.values()];
    if (activePointers.length !== 2 || !previousPinchDistance || !previousPinchCenter) {
      updateGesture();
      return;
    }
    const [first, second] = activePointers as [ActivePointer, ActivePointer];
    const nextCenter = midpoint(first, second);
    const bounds = elements.canvas.getBoundingClientRect();
    viewport = pinchViewport(
      viewport,
      previousPinchDistance,
      distance(first, second),
      {
        x: previousPinchCenter.x - bounds.left,
        y: previousPinchCenter.y - bounds.top,
      },
      { x: nextCenter.x - bounds.left, y: nextCenter.y - bounds.top },
      canvasCenter(),
    );
    render();
    previousPinchDistance = distance(first, second);
    previousPinchCenter = nextCenter;
  });

  const releasePointer = (event: PointerEvent): void => {
    pointers.delete(event.pointerId);
    elements.canvas.classList.toggle("is-panning", pointers.size > 0);
    updateGesture();
  };
  elements.canvas.addEventListener("pointerup", releasePointer);
  elements.canvas.addEventListener("pointercancel", releasePointer);
  elements.canvas.addEventListener("dblclick", () => {
    viewport = initialViewport;
    render();
  });
  elements.canvas.addEventListener("keydown", (event) => {
    const delta = keyboardPan(event.key);
    if (delta) {
      event.preventDefault();
      viewport = panViewport(viewport, delta.x, delta.y);
      render();
    }
  });
  render();

  return Object.freeze({
    reset: () => {
      viewport = initialViewport;
      render();
    },
    setEnabled: (enabled: boolean) => {
      elements.zoomIn.disabled = !enabled;
      elements.zoomOut.disabled = !enabled;
      elements.canvas.tabIndex = enabled ? 0 : -1;
    },
  });
}

function keyboardPan(key: string): ViewportPoint | undefined {
  const movements: Readonly<Record<string, ViewportPoint>> = {
    ArrowDown: { x: 0, y: -keyboardPanPixels },
    ArrowLeft: { x: keyboardPanPixels, y: 0 },
    ArrowRight: { x: -keyboardPanPixels, y: 0 },
    ArrowUp: { x: 0, y: keyboardPanPixels },
  };
  return movements[key];
}

function distance(first: ViewportPoint, second: ViewportPoint): number {
  return Math.hypot(second.x - first.x, second.y - first.y);
}

function midpoint(first: ViewportPoint, second: ViewportPoint): ViewportPoint {
  return { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 };
}

function formatPixels(value: number): string {
  return `${String(Math.round(value * 100) / 100)}px`;
}

interface ViewportElements {
  canvas: HTMLElement;
  contentA: HTMLElement;
  contentB: HTMLElement;
  value: HTMLElement;
  zoomIn: HTMLButtonElement;
  zoomOut: HTMLButtonElement;
}

function readElements(): ViewportElements {
  return {
    canvas: requireElement("#compare-canvas", HTMLElement),
    contentA: requireElement("#compare-content-a", HTMLElement),
    contentB: requireElement("#compare-content-b", HTMLElement),
    value: requireElement("#zoom-value", HTMLElement),
    zoomIn: requireElement("#zoom-in", HTMLButtonElement),
    zoomOut: requireElement("#zoom-out", HTMLButtonElement),
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
