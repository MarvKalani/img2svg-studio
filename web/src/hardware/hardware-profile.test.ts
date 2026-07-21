import { describe, expect, test, vi } from "vitest";
import {
  InitialRasterScale,
  hardwareProfileStorageKey,
  recommendInitialRasterScale,
  resolveHardwareProfile,
  type HardwareProfilePorts,
} from "./hardware-profile";

describe("hardware profile", () => {
  test("Given a stored valid profile, when the Studio starts again, then no second measurement runs", () => {
    const measureRasterMilliseconds = vi.fn(() => 999);
    const ports = createPorts({
      measureRasterMilliseconds,
      stored: JSON.stringify({
        hardwareConcurrency: 4,
        initialRasterScale: 50,
        measurementMilliseconds: 18,
        schemaVersion: 1,
      }),
    });

    expect(resolveHardwareProfile(ports).initialRasterScale).toBe(50);
    expect(measureRasterMilliseconds).not.toHaveBeenCalled();
  });

  test("Given measured hardware tiers, when a start scale is recommended, then only supported conservative steps are returned", () => {
    expect(
      recommendInitialRasterScale({
        deviceMemoryGigabytes: 2,
        hardwareConcurrency: 2,
        measurementMilliseconds: 45,
      }),
    ).toBe(InitialRasterScale.Quarter);
    expect(
      recommendInitialRasterScale({
        deviceMemoryGigabytes: 4,
        hardwareConcurrency: 4,
        measurementMilliseconds: 18,
      }),
    ).toBe(InitialRasterScale.Half);
    expect(
      recommendInitialRasterScale({
        deviceMemoryGigabytes: 8,
        hardwareConcurrency: 6,
        measurementMilliseconds: 11,
      }),
    ).toBe(InitialRasterScale.ThreeQuarters);
    expect(
      recommendInitialRasterScale({
        deviceMemoryGigabytes: 8,
        hardwareConcurrency: 10,
        measurementMilliseconds: 6,
      }),
    ).toBe(InitialRasterScale.Original);
  });

  test("Given no stored profile, when startup measures once, then the result is persisted under one stable key", () => {
    const ports = createPorts({ measureRasterMilliseconds: vi.fn(() => 18) });

    const profile = resolveHardwareProfile(ports);

    expect(profile.initialRasterScale).toBe(InitialRasterScale.Half);
    expect(ports.write).toHaveBeenCalledWith(hardwareProfileStorageKey, JSON.stringify(profile));
  });
});

function createPorts({
  measureRasterMilliseconds,
  stored = null,
}: {
  measureRasterMilliseconds: () => number;
  stored?: string | null;
}): HardwareProfilePorts {
  return {
    deviceMemoryGigabytes: 4,
    hardwareConcurrency: 4,
    measureRasterMilliseconds,
    read: vi.fn(() => stored),
    write: vi.fn(),
  };
}
