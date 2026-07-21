import {
  createConversionOptions,
  type ConversionOptions,
  type ConversionOptionsInput,
} from "./conversion-options";

export interface SavedConversionPreset {
  readonly name: string;
  readonly options: Readonly<ConversionOptions>;
}

export interface SavedPresetStorage {
  read(): string | null;
  write(value: string): void;
}

export interface SavedPresetStore {
  list(): readonly SavedConversionPreset[];
  load(name: string): SavedConversionPreset | undefined;
  remove(name: string): boolean;
  save(name: string, options: Readonly<ConversionOptions>): SavedConversionPreset;
}

export const savedPresetStorageKey = "img2svg-conversion-presets";
export const maximumSavedPresetNameLength = 60;

export function createSavedPresetStore(storage: SavedPresetStorage): SavedPresetStore {
  let presets = readPresets(storage);

  const persist = (nextPresets: readonly SavedConversionPreset[]): void => {
    storage.write(JSON.stringify(nextPresets));
    presets = Object.freeze([...nextPresets]);
  };

  return Object.freeze({
    list: () => presets,
    load: (name: string) => presets.find((preset) => preset.name === normalizeName(name)),
    remove: (name: string) => {
      const normalizedName = normalizeName(name);
      const remaining = presets.filter((preset) => preset.name !== normalizedName);
      if (remaining.length === presets.length) return false;
      persist(remaining);
      return true;
    },
    save: (name: string, options: Readonly<ConversionOptions>) => {
      const preset = savedPreset(normalizeName(name), options);
      const remaining = presets.filter((candidate) => candidate.name !== preset.name);
      persist([...remaining, preset].sort((left, right) => left.name.localeCompare(right.name)));
      return preset;
    },
  });
}

export function createBrowserSavedPresetStore(): SavedPresetStore {
  return createSavedPresetStore({
    read: () => localStorage.getItem(savedPresetStorageKey),
    write: (value) => localStorage.setItem(savedPresetStorageKey, value),
  });
}

export function savedPresetOptionValue(name: string): string {
  return `saved:${name}`;
}

export function savedPresetNameFromOption(value: string): string | undefined {
  return value.startsWith("saved:") ? value.slice("saved:".length) : undefined;
}

function readPresets(storage: SavedPresetStorage): readonly SavedConversionPreset[] {
  try {
    const parsed: unknown = JSON.parse(storage.read() ?? "[]");
    if (!Array.isArray(parsed)) return Object.freeze([]);
    const presets: SavedConversionPreset[] = [];
    for (const candidate of parsed) {
      if (!isRecord(candidate) || typeof candidate.name !== "string") continue;
      try {
        presets.push(savedPreset(normalizeName(candidate.name), candidate.options));
      } catch {
        // One damaged entry must not hide other locally saved presets.
      }
    }
    return Object.freeze(presets.slice(0, 50));
  } catch {
    return Object.freeze([]);
  }
}

function savedPreset(name: string, options: unknown): SavedConversionPreset {
  if (!isRecord(options)) throw new TypeError("Preset options must be an object.");
  const validated = createConversionOptions(options as unknown as ConversionOptionsInput);
  return Object.freeze({
    name,
    options: Object.freeze({
      ...validated,
      preprocessing: Object.freeze({
        ...validated.preprocessing,
        resize: Object.freeze({ ...validated.preprocessing.resize }),
      }),
      shapeDetection: Object.freeze({
        ...validated.shapeDetection,
        types: Object.freeze({ ...validated.shapeDetection.types }),
      }),
    }),
  });
}

function normalizeName(name: string): string {
  const normalized = name.trim();
  if (normalized.length === 0 || normalized.length > maximumSavedPresetNameLength) {
    throw new TypeError("Preset name must contain 1 to 60 characters.");
  }
  return normalized;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
