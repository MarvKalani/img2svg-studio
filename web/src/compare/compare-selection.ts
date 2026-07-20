import { comparisonSourceKey, type ComparisonSource } from "./comparison-source";

export type CompareSlot = "a" | "b";

export interface ComparedRuns {
  readonly a?: ComparisonSource;
  readonly b?: ComparisonSource;
}

export interface CompareSelection {
  assign(slot: CompareSlot, source: ComparisonSource): ComparedRuns;
  clear(): ComparedRuns;
  current(): ComparedRuns;
}

export function createCompareSelection(): CompareSelection {
  let comparedRuns: ComparedRuns = Object.freeze({});

  return {
    assign: (slot, source) => {
      const otherSlot: CompareSlot = slot === "a" ? "b" : "a";
      comparedRuns = Object.freeze({
        ...comparedRuns,
        [otherSlot]:
          comparedRuns[otherSlot] &&
          comparisonSourceKey(comparedRuns[otherSlot]) === comparisonSourceKey(source)
            ? undefined
            : comparedRuns[otherSlot],
        [slot]: source,
      });
      return comparedRuns;
    },
    clear: () => {
      comparedRuns = Object.freeze({});
      return comparedRuns;
    },
    current: () => comparedRuns,
  };
}
