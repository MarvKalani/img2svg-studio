import { describe, expect, test } from "vitest";
import { defaultConversionOptions } from "./conversion-options";
import { createSavedPresetStore, type SavedPresetStorage } from "./saved-presets";

describe("saved conversion presets", () => {
  test("Given named settings, when saved and reopened, then the validated preset remains available", () => {
    const storage = memoryStorage();
    const firstStore = createSavedPresetStore(storage);
    firstStore.save("Kompaktes Logo", { ...defaultConversionOptions, pathPrecision: 0 });

    const reopened = createSavedPresetStore(storage);

    expect(reopened.list()).toEqual([
      expect.objectContaining({
        name: "Kompaktes Logo",
        options: expect.objectContaining({ pathPrecision: 0 }),
      }),
    ]);
    expect(reopened.load("Kompaktes Logo")?.options.pathPrecision).toBe(0);
  });

  test("Given an existing name, when saved again, then one preset is updated instead of duplicated", () => {
    const store = createSavedPresetStore(memoryStorage());
    store.save("Logo", defaultConversionOptions);
    store.save(" Logo ", { ...defaultConversionOptions, colorPrecision: 4 });

    expect(store.list()).toHaveLength(1);
    expect(store.load("Logo")?.options.colorPrecision).toBe(4);
  });
});

function memoryStorage(): SavedPresetStorage {
  let value: string | null = null;
  return {
    read: () => value,
    write: (nextValue) => {
      value = nextValue;
    },
  };
}
