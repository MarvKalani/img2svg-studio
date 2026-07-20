export const SelectionTool = Object.freeze({
  MagicWand: "magic-wand",
  SmartSelect: "smart-select",
} as const);

export type SelectionTool = (typeof SelectionTool)[keyof typeof SelectionTool];

export interface SelectionActivity {
  acquire(tool: SelectionTool): boolean;
  active(): SelectionTool | undefined;
  blocked(tool: SelectionTool): boolean;
  release(tool: SelectionTool): void;
  subscribe(listener: () => void): () => void;
}

export function createSelectionActivity(): SelectionActivity {
  let owner: SelectionTool | undefined;
  const listeners = new Set<() => void>();
  const notify = (): void => listeners.forEach((listener) => listener());

  return Object.freeze({
    acquire: (tool: SelectionTool) => {
      if (owner !== undefined) {
        return owner === tool;
      }
      owner = tool;
      notify();
      return true;
    },
    active: () => owner,
    blocked: (tool: SelectionTool) => owner !== undefined && owner !== tool,
    release: (tool: SelectionTool) => {
      if (owner === tool) {
        owner = undefined;
        notify();
      }
    },
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  });
}
