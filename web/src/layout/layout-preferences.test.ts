import { describe, expect, test, vi } from "vitest";
import {
  LayoutMode,
  defaultLayoutPreferences,
  readLayoutPreferences,
  saveLayoutPreferences,
  type LayoutPreferenceStorage,
} from "./layout-preferences";

describe("layout preferences", () => {
  test("Given no valid saved layout, when preferences are read, then the current Studio layout remains the default", () => {
    const storage = memoryStorage("broken-json");

    expect(readLayoutPreferences(storage)).toEqual(defaultLayoutPreferences);
  });

  test("Given three explicit region modes, when saved and read, then the exact layout survives a restart", () => {
    const storage = memoryStorage();
    const preferences = {
      header: LayoutMode.Collapsed,
      history: LayoutMode.Docked,
      sidebar: LayoutMode.Docked,
    } as const;

    saveLayoutPreferences(storage, preferences);

    expect(readLayoutPreferences(storage)).toEqual(preferences);
    expect(storage.write).toHaveBeenCalledOnce();
  });

  test("Given blocked browser storage, when preferences are saved, then the UI flow remains usable", () => {
    const storage: LayoutPreferenceStorage = {
      read: () => null,
      write: () => {
        throw new DOMException("Blocked", "SecurityError");
      },
    };

    expect(() => saveLayoutPreferences(storage, defaultLayoutPreferences)).not.toThrow();
  });
});

function memoryStorage(initialValue: string | null = null): LayoutPreferenceStorage & {
  write: ReturnType<typeof vi.fn>;
} {
  let value = initialValue;
  const write = vi.fn((nextValue: string) => {
    value = nextValue;
  });
  return { read: () => value, write };
}
