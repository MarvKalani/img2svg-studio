import type { ConversionOptions } from "../conversion/conversion-options";

export interface NewConversionRun {
  circleCount: number;
  durationMilliseconds: number;
  fileName: string;
  heightPixels: number;
  options: ConversionOptions;
  pathCount: number;
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
  runs(): readonly ConversionRun[];
  select(id: number): ConversionRun | undefined;
  selected(): ConversionRun | undefined;
}

const maximumRunCount = 10;

export function createHistoryStore(): HistoryStore {
  const storedRuns: ConversionRun[] = [];
  let nextRunId = 1;
  let selectedRunId: number | undefined;

  return {
    add: (input) => {
      const run: ConversionRun = Object.freeze({
        ...input,
        id: nextRunId,
        options: Object.freeze({
          ...input.options,
          shapeDetection: Object.freeze({
            ...input.options.shapeDetection,
            types: Object.freeze({ ...input.options.shapeDetection.types }),
          }),
        }),
      });
      nextRunId += 1;
      storedRuns.unshift(run);
      storedRuns.splice(maximumRunCount);
      selectedRunId = run.id;
      return run;
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
