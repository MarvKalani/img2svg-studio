import type { ConversionOptions } from "../conversion/conversion-options";
import type { ImageVersion } from "../image/image-version";

export interface NewConversionRun {
  circleCount: number;
  durationMilliseconds: number;
  ellipseCount: number;
  fileName: string;
  heightPixels: number;
  inputVersion: ImageVersion;
  lineCount: number;
  options: ConversionOptions;
  pathCount: number;
  polygonCount: number;
  rectangleCount: number;
  svg: string;
  widthPixels: number;
}

export interface ConversionRun extends Readonly<Omit<NewConversionRun, "options">> {
  readonly id: number;
  readonly options: Readonly<ConversionOptions>;
}

export interface HistoryStore {
  add(input: NewConversionRun): ConversionRun;
  clear(): void;
  remove(id: number): ConversionRun | undefined;
  runs(): readonly ConversionRun[];
  select(id: number): ConversionRun | undefined;
  selected(): ConversionRun | undefined;
}

export function createHistoryStore(): HistoryStore {
  const storedRuns: ConversionRun[] = [];
  let nextRunId = 1;
  let selectedRunId: number | undefined;

  return {
    add: (input) => {
      const run: ConversionRun = Object.freeze({
        ...input,
        id: nextRunId,
        inputVersion: Object.freeze({ ...input.inputVersion }),
        options: Object.freeze({
          ...input.options,
          preprocessing: Object.freeze({
            ...input.options.preprocessing,
            resize: Object.freeze({ ...input.options.preprocessing.resize }),
          }),
          shapeDetection: Object.freeze({
            ...input.options.shapeDetection,
            types: Object.freeze({ ...input.options.shapeDetection.types }),
          }),
        }),
      });
      nextRunId += 1;
      storedRuns.unshift(run);
      selectedRunId = run.id;
      return run;
    },
    clear: () => {
      storedRuns.splice(0);
      nextRunId = 1;
      selectedRunId = undefined;
    },
    remove: (id) => {
      const runIndex = storedRuns.findIndex((run) => run.id === id);
      if (runIndex < 0) {
        return undefined;
      }
      const [removed] = storedRuns.splice(runIndex, 1);
      if (selectedRunId === id) {
        selectedRunId = undefined;
      }
      return removed;
    },
    runs: () => Object.freeze([...storedRuns]),
    select: (id) => {
      const selectedRun = storedRuns.find((run) => run.id === id);
      if (selectedRun) {
        selectedRunId = id;
      }
      return selectedRun;
    },
    selected: () => storedRuns.find((run) => run.id === selectedRunId),
  };
}
