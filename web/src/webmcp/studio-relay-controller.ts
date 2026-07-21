import { createStudioRelayClient, type StudioRelayClient } from "./studio-relay-client";
import type { WebMcpTool } from "./webmcp-adapter";

const synchronizationIntervalMilliseconds = 250;

export interface StudioRelayControl {
  dispose(): void;
}

interface StudioRelayElements {
  readonly status: HTMLOutputElement;
  readonly toggle: HTMLButtonElement;
}

interface StudioRelayControllerOptions {
  readonly client?: StudioRelayClient;
  readonly setInterval?: typeof window.setInterval;
  readonly clearInterval?: typeof window.clearInterval;
}

export function initializeStudioRelay(
  source: ParentNode,
  tools: readonly WebMcpTool[],
  options: StudioRelayControllerOptions = {},
): StudioRelayControl {
  const elements = readElements(source);
  const client = options.client ?? createStudioRelayClient(tools);
  const schedule = options.setInterval ?? window.setInterval.bind(window);
  const cancelSchedule = options.clearInterval ?? window.clearInterval.bind(window);
  let timer: number | undefined;
  let synchronizing = false;

  async function synchronize(): Promise<void> {
    if (synchronizing) {
      return;
    }
    synchronizing = true;
    try {
      await client.synchronize();
    } catch {
      await stop("Verbindung unterbrochen");
    } finally {
      synchronizing = false;
    }
  }

  async function start(): Promise<void> {
    elements.toggle.disabled = true;
    elements.status.textContent = "Verbinde lokal …";
    try {
      await client.connect();
      elements.toggle.setAttribute("aria-pressed", "true");
      elements.toggle.textContent = "ChatGPT trennen";
      elements.status.textContent = "Studio verbunden";
      timer = schedule(() => void synchronize(), synchronizationIntervalMilliseconds);
    } catch {
      elements.status.textContent = "Companion nicht erreichbar";
    } finally {
      elements.toggle.disabled = false;
    }
  }

  async function stop(status = "Nicht verbunden"): Promise<void> {
    if (timer !== undefined) {
      cancelSchedule(timer);
      timer = undefined;
    }
    await client.disconnect();
    elements.toggle.setAttribute("aria-pressed", "false");
    elements.toggle.textContent = "ChatGPT verbinden";
    elements.status.textContent = status;
  }

  function toggle(): void {
    if (client.connected) {
      void stop();
    } else {
      void start();
    }
  }

  elements.toggle.addEventListener("click", toggle);
  return {
    dispose: () => {
      elements.toggle.removeEventListener("click", toggle);
      void stop();
    },
  };
}

function readElements(source: ParentNode): StudioRelayElements {
  const status = source.querySelector("#studio-relay-status");
  const toggle = source.querySelector("#studio-relay-toggle");
  if (!(status instanceof HTMLOutputElement) || !(toggle instanceof HTMLButtonElement)) {
    throw new Error("Required Studio Companion controls are missing.");
  }
  return { status, toggle };
}
