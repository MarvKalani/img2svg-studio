import type { ConversionRun } from "../history/history-store";

export type CompareSlot = "a" | "b";

export interface ComparedRuns {
  readonly a?: ConversionRun;
  readonly b?: ConversionRun;
}

export interface CompareSelection {
  assign(slot: CompareSlot, run: ConversionRun): ComparedRuns;
  current(): ComparedRuns;
}

export function createCompareSelection(): CompareSelection {
  let comparedRuns: ComparedRuns = Object.freeze({});

  return {
    assign: (slot, run) => {
      const otherSlot: CompareSlot = slot === "a" ? "b" : "a";
      comparedRuns = Object.freeze({
        ...comparedRuns,
        [otherSlot]: comparedRuns[otherSlot]?.id === run.id ? undefined : comparedRuns[otherSlot],
        [slot]: run,
      });
      return comparedRuns;
    },
    current: () => comparedRuns,
  };
}
