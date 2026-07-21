import type { CompareController } from "../compare/compare-controller";
import { ComparisonSourceKind } from "../compare/comparison-source";
import type { ConversionController } from "../conversion/conversion-controller";
import { readConversionOptionKey } from "../conversion/conversion-option-key";
import type { ConversionOptionsController } from "../conversion/conversion-options-controller";
import type { InteractiveHandbookController } from "../help/interactive-handbook";
import type { SvgDownloadController } from "../conversion/svg-download";
import type { WorkspaceViewController } from "../workspace/workspace-view-controller";

interface ContextMenuCommand {
  readonly enabled: boolean;
  readonly label: string;
  readonly run: () => void;
}

export interface ContextMenuDependencies {
  readonly compare: CompareController;
  readonly conversion: ConversionController;
  readonly download: SvgDownloadController;
  readonly handbook: InteractiveHandbookController;
  readonly options: ConversionOptionsController;
  readonly workspace: WorkspaceViewController;
}

interface ContextMenuElements {
  readonly accept: HTMLButtonElement;
  readonly backgroundRemoval: HTMLButtonElement;
  readonly download: HTMLButtonElement;
  readonly magicWand: HTMLButtonElement;
  readonly menu: HTMLElement;
  readonly smartSelect: HTMLButtonElement;
}

export function initializeContextMenu(dependencies: ContextMenuDependencies): void {
  const elements = readElements();
  let invoker: HTMLElement | undefined;

  document.addEventListener("contextmenu", (event) => {
    if (!(event.target instanceof Element)) {
      return;
    }
    const target = event.target.closest<HTMLElement>("[data-option-key]");
    const optionKey = readConversionOptionKey(target?.dataset.optionKey);
    const commands = optionKey
      ? parameterCommands(dependencies, optionKey, target!)
      : imageCommands(event.target, event.clientX, dependencies, elements);
    if (commands.length === 0) {
      return;
    }
    event.preventDefault();
    invoker = event.target instanceof HTMLElement ? event.target : undefined;
    openMenu(elements.menu, commands, event.clientX, event.clientY);
  });
  document.addEventListener("pointerdown", (event) => {
    if (!elements.menu.hidden && !elements.menu.contains(event.target as Node)) {
      closeMenu(elements.menu);
    }
  });
  document.addEventListener("keydown", (event) => {
    if (elements.menu.hidden) {
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      closeMenu(elements.menu);
      invoker?.focus();
      return;
    }
    moveMenuFocus(elements.menu, event);
  });
  window.addEventListener("resize", () => closeMenu(elements.menu));
}

function parameterCommands(
  dependencies: ContextMenuDependencies,
  optionKey: NonNullable<ReturnType<typeof readConversionOptionKey>>,
  target: HTMLElement,
): readonly ContextMenuCommand[] {
  return [
    command("Im Handbuch erklären", true, () => {
      dependencies.handbook.showTopic(target.dataset.helpKey ?? optionKey, target);
    }),
    command("Auf Standard zurücksetzen", dependencies.options.canReset(optionKey), () => {
      dependencies.options.reset(optionKey);
    }),
  ];
}

function imageCommands(
  target: Element,
  clientX: number,
  dependencies: ContextMenuDependencies,
  elements: ContextMenuElements,
): readonly ContextMenuCommand[] {
  if (target.closest("#workspace-raster-preview")) {
    return rasterCommands(elements);
  }
  if (target.closest("#svg-output svg")) {
    return [
      command("SVG herunterladen", !elements.download.disabled, dependencies.download.download),
    ];
  }
  const slot = comparisonSlot(target, clientX);
  if (!slot) {
    return [];
  }
  const source = dependencies.compare.current()[slot];
  if (!source) {
    return [];
  }
  switch (source.kind) {
    case ComparisonSourceKind.Original:
      return [command("Original öffnen", true, dependencies.workspace.showOriginal)];
    case ComparisonSourceKind.Processed:
      return [command("Verarbeitet öffnen", true, dependencies.workspace.showProcessed)];
    case ComparisonSourceKind.Draft:
      return [
        command("SVG anzeigen", true, dependencies.workspace.showSvg),
        command("SVG herunterladen", true, dependencies.download.download),
        command("Entwurf übernehmen", !elements.accept.disabled, () => {
          void dependencies.conversion.convert();
        }),
      ];
    case ComparisonSourceKind.Run:
      return [
        command("SVG herunterladen", true, () => {
          dependencies.compare.download(slot);
        }),
      ];
  }
}

function comparisonSlot(target: Element, clientX: number): "a" | "b" | undefined {
  if (target.closest("#compare-content-a, #compare-layer-a")) {
    return "a";
  }
  if (target.closest("#compare-content-b, #compare-layer-b")) {
    return "b";
  }
  const canvas = target.closest("#compare-canvas");
  const slider = document.querySelector("#compare-slider");
  if (!(canvas instanceof HTMLElement) || !(slider instanceof HTMLInputElement)) {
    return undefined;
  }
  const bounds = canvas.getBoundingClientRect();
  const pointerPercent = ((clientX - bounds.left) / bounds.width) * 100;
  return pointerPercent <= slider.valueAsNumber ? "a" : "b";
}

function rasterCommands(elements: ContextMenuElements): readonly ContextMenuCommand[] {
  return [
    command("Zauberstab", !elements.magicWand.disabled, () => elements.magicWand.click()),
    command("Hintergrund entfernen", !elements.backgroundRemoval.disabled, () =>
      elements.backgroundRemoval.click(),
    ),
    ...(elements.smartSelect.hidden
      ? []
      : [
          command("Smart Select", !elements.smartSelect.disabled, () =>
            elements.smartSelect.click(),
          ),
        ]),
  ];
}

function command(label: string, enabled: boolean, run: () => void): ContextMenuCommand {
  return Object.freeze({ enabled, label, run });
}

function openMenu(
  menu: HTMLElement,
  commands: readonly ContextMenuCommand[],
  clientX: number,
  clientY: number,
): void {
  const buttons = commands.map((entry) => {
    const button = document.createElement("button");
    button.type = "button";
    button.role = "menuitem";
    button.textContent = entry.label;
    button.disabled = !entry.enabled;
    button.addEventListener("click", () => {
      closeMenu(menu);
      entry.run();
    });
    return button;
  });
  menu.replaceChildren(...buttons);
  menu.hidden = false;
  const bounds = menu.getBoundingClientRect();
  menu.style.left = `${String(Math.max(8, Math.min(clientX, window.innerWidth - bounds.width - 8)))}px`;
  menu.style.top = `${String(Math.max(8, Math.min(clientY, window.innerHeight - bounds.height - 8)))}px`;
  buttons.find((button) => !button.disabled)?.focus();
}

function closeMenu(menu: HTMLElement): void {
  menu.hidden = true;
}

function moveMenuFocus(menu: HTMLElement, event: KeyboardEvent): void {
  const buttons = [...menu.querySelectorAll<HTMLButtonElement>("button:not(:disabled)")];
  if (buttons.length === 0 || !["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
    return;
  }
  event.preventDefault();
  const currentIndex = buttons.indexOf(document.activeElement as HTMLButtonElement);
  const nextIndex =
    event.key === "Home"
      ? 0
      : event.key === "End"
        ? buttons.length - 1
        : (currentIndex + (event.key === "ArrowDown" ? 1 : -1) + buttons.length) % buttons.length;
  buttons[nextIndex]?.focus();
}

function readElements(): ContextMenuElements {
  return {
    accept: requireElement("#convert-button", HTMLButtonElement),
    backgroundRemoval: requireElement("#remove-background", HTMLButtonElement),
    download: requireElement("#download-svg", HTMLButtonElement),
    magicWand: requireElement("#magic-wand", HTMLButtonElement),
    menu: requireElement("#context-menu", HTMLElement),
    smartSelect: requireElement("#smart-select", HTMLButtonElement),
  };
}

function requireElement<ElementType extends Element>(
  selector: string,
  constructor: new () => ElementType,
): ElementType {
  const element = document.querySelector(selector);
  if (!(element instanceof constructor)) {
    throw new Error(`Required context menu element is missing: ${selector}`);
  }
  return element;
}
