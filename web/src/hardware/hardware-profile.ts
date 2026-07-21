import { RasterResizeKind, type RasterResizeOptions } from "../conversion/raster-preprocessing";

export const InitialRasterScale = {
  Half: 50,
  Original: 100,
  Quarter: 25,
  ThreeQuarters: 75,
} as const;

export type InitialRasterScale = (typeof InitialRasterScale)[keyof typeof InitialRasterScale];

export interface HardwareMeasurement {
  readonly deviceMemoryGigabytes?: number;
  readonly hardwareConcurrency: number;
  readonly measurementMilliseconds: number;
}

export interface HardwareProfile extends HardwareMeasurement {
  readonly initialRasterScale: InitialRasterScale;
  readonly schemaVersion: 1;
}

export interface HardwareProfilePorts {
  readonly deviceMemoryGigabytes?: number;
  readonly hardwareConcurrency: number;
  measureRasterMilliseconds(): number;
  read(key: string): string | null;
  write(key: string, value: string): void;
}

export const hardwareProfileStorageKey = "img2svg-hardware-profile-v1";

export function resolveHardwareProfile(
  ports: HardwareProfilePorts = browserHardwarePorts(),
): HardwareProfile {
  const stored = readStoredProfile(ports);
  if (stored) return stored;

  const measurement: HardwareMeasurement = {
    ...(ports.deviceMemoryGigabytes === undefined
      ? {}
      : { deviceMemoryGigabytes: ports.deviceMemoryGigabytes }),
    hardwareConcurrency: ports.hardwareConcurrency,
    measurementMilliseconds: roundedMilliseconds(ports.measureRasterMilliseconds()),
  };
  const profile: HardwareProfile = Object.freeze({
    ...measurement,
    initialRasterScale: recommendInitialRasterScale(measurement),
    schemaVersion: 1,
  });
  try {
    ports.write(hardwareProfileStorageKey, JSON.stringify(profile));
  } catch {
    // Storage can be blocked; the measured fallback still keeps this page session usable.
  }
  return profile;
}

export function recommendInitialRasterScale(measurement: HardwareMeasurement): InitialRasterScale {
  const memory = measurement.deviceMemoryGigabytes ?? Number.POSITIVE_INFINITY;
  if (
    memory <= 2 ||
    measurement.hardwareConcurrency <= 2 ||
    measurement.measurementMilliseconds > 32
  ) {
    return InitialRasterScale.Quarter;
  }
  if (
    memory <= 4 ||
    measurement.hardwareConcurrency <= 4 ||
    measurement.measurementMilliseconds > 16
  ) {
    return InitialRasterScale.Half;
  }
  if (
    memory < 8 ||
    measurement.hardwareConcurrency < 8 ||
    measurement.measurementMilliseconds > 8
  ) {
    return InitialRasterScale.ThreeQuarters;
  }
  return InitialRasterScale.Original;
}

export function hardwareRasterResize(profile: HardwareProfile): RasterResizeOptions {
  return profile.initialRasterScale === InitialRasterScale.Original
    ? Object.freeze({ kind: RasterResizeKind.Original })
    : Object.freeze({
        kind: RasterResizeKind.Percentage,
        percent: profile.initialRasterScale,
      });
}

export function showHardwareProfile(profile: HardwareProfile): void {
  const output = document.querySelector("#hardware-profile-summary");
  if (!(output instanceof HTMLOutputElement)) {
    throw new Error("Required hardware profile output is missing.");
  }
  const size =
    profile.initialRasterScale === InitialRasterScale.Original
      ? "Originalgröße"
      : `${String(profile.initialRasterScale)} %`;
  output.textContent = `Einmalig gemessen · Startgröße ${size}`;
}

function readStoredProfile(ports: HardwareProfilePorts): HardwareProfile | undefined {
  try {
    const parsed = JSON.parse(ports.read(hardwareProfileStorageKey) ?? "null") as unknown;
    return isHardwareProfile(parsed) ? Object.freeze(parsed) : undefined;
  } catch {
    return undefined;
  }
}

function isHardwareProfile(value: unknown): value is HardwareProfile {
  if (!value || typeof value !== "object") return false;
  const profile = value as Partial<HardwareProfile>;
  return (
    profile.schemaVersion === 1 &&
    isInitialRasterScale(profile.initialRasterScale) &&
    validPositiveNumber(profile.measurementMilliseconds) &&
    validPositiveInteger(profile.hardwareConcurrency) &&
    (profile.deviceMemoryGigabytes === undefined ||
      validPositiveNumber(profile.deviceMemoryGigabytes))
  );
}

function isInitialRasterScale(value: unknown): value is InitialRasterScale {
  return Object.values(InitialRasterScale).some((scale) => scale === value);
}

function validPositiveNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function validPositiveInteger(value: unknown): value is number {
  return validPositiveNumber(value) && Number.isSafeInteger(value);
}

function roundedMilliseconds(value: number): number {
  return Math.max(0.1, Math.round(value * 10) / 10);
}

function browserHardwarePorts(): HardwareProfilePorts {
  const navigatorWithMemory = navigator as Navigator & { deviceMemory?: number };
  return {
    ...(navigatorWithMemory.deviceMemory === undefined
      ? {}
      : { deviceMemoryGigabytes: navigatorWithMemory.deviceMemory }),
    hardwareConcurrency: Math.max(1, navigator.hardwareConcurrency || 1),
    measureRasterMilliseconds,
    read: (key) => localStorage.getItem(key),
    write: (key, value) => localStorage.setItem(key, value),
  };
}

function measureRasterMilliseconds(): number {
  const rgba = new Uint8Array(512 * 512 * 4);
  const startedAt = performance.now();
  for (let pass = 0; pass < 4; pass += 1) {
    for (let offset = 0; offset < rgba.length; offset += 4) {
      rgba[offset] = (rgba[offset]! + offset + pass) & 255;
      rgba[offset + 1] = (rgba[offset]! * 3 + pass) & 255;
      rgba[offset + 2] = (rgba[offset + 1]! + rgba[offset]!) & 255;
      rgba[offset + 3] = 255;
    }
  }
  return performance.now() - startedAt;
}
