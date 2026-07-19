import { createConversionOptions, type ConversionOptions } from "../conversion/conversion-options";
import type { HistoryStore } from "./history-store";

export function restoreSelectedRunOptions(
  store: HistoryStore,
  applyOptions: (options: ConversionOptions) => void,
): ConversionOptions | undefined {
  const selectedRun = store.selected();
  if (!selectedRun) {
    return undefined;
  }

  const validatedOptions = createConversionOptions(selectedRun.options);
  applyOptions(validatedOptions);
  return validatedOptions;
}
