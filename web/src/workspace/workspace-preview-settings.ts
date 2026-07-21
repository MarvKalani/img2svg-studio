const storageKey = "img2svg-workspace-preview-v1";
const defaultCustomColor = "#eef2f3";

const BackgroundMode = {
  Black: "black",
  Custom: "custom",
  White: "white",
} as const;

type BackgroundMode = (typeof BackgroundMode)[keyof typeof BackgroundMode];

interface PreviewSettings {
  readonly backgroundMode: BackgroundMode;
  readonly customColor: string;
  readonly sizePixels: number;
}

const defaultSettings: PreviewSettings = Object.freeze({
  backgroundMode: BackgroundMode.White,
  customColor: defaultCustomColor,
  sizePixels: 128,
});

export function initializeWorkspacePreviewSettings(): void {
  const elements = readElements();
  let settings = readSettings();

  const apply = (): void => {
    elements.sizeSelect.value = String(settings.sizePixels);
    elements.sizeOutput.textContent = `${String(settings.sizePixels)} px`;
    elements.frame.style.setProperty("--icon-preview-size", `${String(settings.sizePixels)}px`);
    elements.backgroundMode.value = settings.backgroundMode;
    elements.customColor.value = settings.customColor;
    elements.customColorField.hidden = settings.backgroundMode !== BackgroundMode.Custom;
    const backgroundColor = resolveBackgroundColor(settings);
    elements.stage.style.setProperty("--workspace-background", backgroundColor);
    elements.frame.style.setProperty("--workspace-background", backgroundColor);
  };

  const update = (next: PreviewSettings): void => {
    settings = next;
    writeSettings(settings);
    apply();
  };

  elements.sizeSelect.addEventListener("change", () => {
    update({ ...settings, sizePixels: Number(elements.sizeSelect.value) });
  });
  elements.backgroundMode.addEventListener("change", () => {
    update({ ...settings, backgroundMode: readBackgroundMode(elements.backgroundMode.value) });
  });
  elements.customColor.addEventListener("input", () => {
    update({ ...settings, customColor: normalizeColor(elements.customColor.value) });
  });

  const renderSvg = (): void => {
    const source = elements.svgOutput.querySelector(":scope > svg");
    if (!(source instanceof SVGSVGElement)) {
      elements.previewOutput.replaceChildren();
      elements.empty.hidden = false;
      return;
    }
    const preview = source.cloneNode(true) as SVGSVGElement;
    preview.setAttribute("width", "100%");
    preview.setAttribute("height", "100%");
    preview.setAttribute("preserveAspectRatio", "xMidYMid meet");
    elements.previewOutput.replaceChildren(preview);
    elements.empty.hidden = true;
  };

  new MutationObserver(renderSvg).observe(elements.svgOutput, { childList: true });
  apply();
  renderSvg();
}

function resolveBackgroundColor(settings: PreviewSettings): string {
  if (settings.backgroundMode === BackgroundMode.Black) {
    return "#000000";
  }
  if (settings.backgroundMode === BackgroundMode.Custom) {
    return settings.customColor;
  }
  return "#ffffff";
}

function readSettings(): PreviewSettings {
  try {
    const parsed = JSON.parse(
      localStorage.getItem(storageKey) ?? "null",
    ) as Partial<PreviewSettings>;
    const sizePixels = parsed?.sizePixels ?? 0;
    return Object.freeze({
      backgroundMode: readBackgroundMode(parsed?.backgroundMode),
      customColor: normalizeColor(parsed?.customColor),
      sizePixels: [64, 128, 256, 512].includes(sizePixels)
        ? sizePixels
        : defaultSettings.sizePixels,
    });
  } catch {
    return defaultSettings;
  }
}

function writeSettings(settings: PreviewSettings): void {
  try {
    localStorage.setItem(storageKey, JSON.stringify(settings));
  } catch {
    // View preferences remain usable when private browsing blocks persistent storage.
  }
}

function readBackgroundMode(value: unknown): BackgroundMode {
  return Object.values(BackgroundMode).includes(value as BackgroundMode)
    ? (value as BackgroundMode)
    : BackgroundMode.White;
}

function normalizeColor(value: unknown): string {
  return typeof value === "string" && /^#[0-9a-f]{6}$/iu.test(value)
    ? value.toLowerCase()
    : defaultCustomColor;
}

interface PreviewElements {
  readonly backgroundMode: HTMLSelectElement;
  readonly customColor: HTMLInputElement;
  readonly customColorField: HTMLElement;
  readonly empty: HTMLElement;
  readonly frame: HTMLElement;
  readonly previewOutput: HTMLElement;
  readonly sizeOutput: HTMLOutputElement;
  readonly sizeSelect: HTMLSelectElement;
  readonly stage: HTMLElement;
  readonly svgOutput: HTMLElement;
}

function readElements(): PreviewElements {
  return {
    backgroundMode: requireElement("#workspace-background-mode", HTMLSelectElement),
    customColor: requireElement("#workspace-custom-background", HTMLInputElement),
    customColorField: requireElement("#workspace-custom-background-field", HTMLElement),
    empty: requireElement("#icon-preview-empty", HTMLElement),
    frame: requireElement("#icon-preview-frame", HTMLElement),
    previewOutput: requireElement("#icon-preview-output", HTMLElement),
    sizeOutput: requireElement("#icon-preview-size", HTMLOutputElement),
    sizeSelect: requireElement("#icon-preview-size-select", HTMLSelectElement),
    stage: requireElement("#comparison-stage", HTMLElement),
    svgOutput: requireElement("#svg-output", HTMLElement),
  };
}

function requireElement<ElementType extends Element>(
  selector: string,
  constructor: new () => ElementType,
): ElementType {
  const element = document.querySelector(selector);
  if (!(element instanceof constructor)) {
    throw new Error(`Required preview setting element is missing: ${selector}`);
  }
  return element;
}
