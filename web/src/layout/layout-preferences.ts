export const LayoutMode = {
  Collapsed: "collapsed",
  Docked: "docked",
  Standard: "standard",
} as const;

export type LayoutMode = (typeof LayoutMode)[keyof typeof LayoutMode];

export interface LayoutPreferences {
  readonly header: LayoutMode;
  readonly history: LayoutMode;
  readonly sidebar: LayoutMode;
}

export interface LayoutPreferenceStorage {
  read(): string | null;
  write(value: string): void;
}

export const defaultLayoutPreferences: LayoutPreferences = Object.freeze({
  header: LayoutMode.Standard,
  history: LayoutMode.Standard,
  sidebar: LayoutMode.Standard,
});

const storageKey = "img2svg-layout-preferences";

export function initializeLayoutPreferences(): void {
  const storage = browserStorage();
  const elements = readElements();
  let preferences = readLayoutPreferences(storage);

  const apply = (): void => {
    document.documentElement.dataset.headerMode = preferences.header;
    document.documentElement.dataset.historyMode = preferences.history;
    document.documentElement.dataset.sidebarMode = preferences.sidebar;
    elements.header.value = preferences.header;
    elements.history.value = preferences.history;
    elements.sidebar.value = preferences.sidebar;
  };
  const change = (): void => {
    preferences = Object.freeze({
      header: readLayoutMode(elements.header.value),
      history: readLayoutMode(elements.history.value),
      sidebar: readLayoutMode(elements.sidebar.value),
    });
    saveLayoutPreferences(storage, preferences);
    apply();
  };

  elements.header.addEventListener("change", change);
  elements.history.addEventListener("change", change);
  elements.sidebar.addEventListener("change", change);
  apply();
}

export function readLayoutPreferences(storage: LayoutPreferenceStorage): LayoutPreferences {
  try {
    const parsed = JSON.parse(storage.read() ?? "null") as Partial<LayoutPreferences> | null;
    if (
      parsed &&
      isLayoutMode(parsed.header) &&
      isLayoutMode(parsed.history) &&
      isLayoutMode(parsed.sidebar)
    ) {
      return Object.freeze({
        header: parsed.header,
        history: parsed.history,
        sidebar: parsed.sidebar,
      });
    }
  } catch {
    // Corrupt browser state must never prevent the Studio from opening with safe defaults.
  }
  return defaultLayoutPreferences;
}

export function saveLayoutPreferences(
  storage: LayoutPreferenceStorage,
  preferences: LayoutPreferences,
): void {
  try {
    storage.write(JSON.stringify(preferences));
  } catch {
    // Privacy modes may block storage; layout changes must still work for the current page.
  }
}

function browserStorage(): LayoutPreferenceStorage {
  return {
    read: () => localStorage.getItem(storageKey),
    write: (value) => localStorage.setItem(storageKey, value),
  };
}

function readLayoutMode(value: string): LayoutMode {
  return isLayoutMode(value) ? value : LayoutMode.Standard;
}

function isLayoutMode(value: unknown): value is LayoutMode {
  return Object.values(LayoutMode).some((mode) => mode === value);
}

function readElements(): {
  header: HTMLSelectElement;
  history: HTMLSelectElement;
  sidebar: HTMLSelectElement;
} {
  return {
    header: requireSelect("#header-layout-mode"),
    history: requireSelect("#history-layout-mode"),
    sidebar: requireSelect("#sidebar-layout-mode"),
  };
}

function requireSelect(selector: string): HTMLSelectElement {
  const element = document.querySelector(selector);
  if (!(element instanceof HTMLSelectElement)) {
    throw new Error(`Required layout control is missing: ${selector}`);
  }
  return element;
}
