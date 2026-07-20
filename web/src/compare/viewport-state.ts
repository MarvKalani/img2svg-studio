export interface ViewportPoint {
  readonly x: number;
  readonly y: number;
}

export interface ViewportState {
  readonly offsetX: number;
  readonly offsetY: number;
  readonly scale: number;
}

export const initialViewport: ViewportState = Object.freeze({ offsetX: 0, offsetY: 0, scale: 1 });

const minimumScale = 0.25;
const maximumScale = 8;

export function panViewport(state: ViewportState, deltaX: number, deltaY: number): ViewportState {
  return Object.freeze({
    offsetX: state.offsetX + deltaX,
    offsetY: state.offsetY + deltaY,
    scale: state.scale,
  });
}

export function zoomViewportAt(
  state: ViewportState,
  requestedScale: number,
  anchor: ViewportPoint,
  center: ViewportPoint,
): ViewportState {
  const scale = Math.min(maximumScale, Math.max(minimumScale, requestedScale));
  const scaleChange = scale / state.scale;
  return Object.freeze({
    offsetX: anchor.x - center.x - (anchor.x - center.x - state.offsetX) * scaleChange,
    offsetY: anchor.y - center.y - (anchor.y - center.y - state.offsetY) * scaleChange,
    scale,
  });
}

export function pinchViewport(
  state: ViewportState,
  previousDistance: number,
  nextDistance: number,
  previousCenter: ViewportPoint,
  nextCenter: ViewportPoint,
  viewportCenter: ViewportPoint,
): ViewportState {
  const moved = panViewport(
    state,
    nextCenter.x - previousCenter.x,
    nextCenter.y - previousCenter.y,
  );
  return zoomViewportAt(
    moved,
    moved.scale * (nextDistance / previousDistance),
    nextCenter,
    viewportCenter,
  );
}
