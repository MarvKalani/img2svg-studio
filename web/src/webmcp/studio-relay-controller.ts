import { createStudioRelayClient, type StudioRelayClient } from "./studio-relay-client";
import type { WebMcpTool } from "./webmcp-adapter";

export interface StudioRelayControl {
  dispose(): void;
}

interface StudioRelayElements {
  readonly status: HTMLOutputElement;
  readonly toggle: HTMLButtonElement;
}

interface StudioRelayControllerOptions {
  readonly client?: StudioRelayClient;
}

export function initializeStudioRelay(
  source: ParentNode,
  tools: readonly WebMcpTool[],
  options: StudioRelayControllerOptions = {},
): StudioRelayControl {
  const elements = readElements(source);
  const client = options.client ?? createStudioRelayClient(tools);
  let synchronizing = false;

  async function synchronize(): Promise<void> {
    if (synchronizing) {
      return;
    }
    synchronizing = true;
    try {
      // A pending fetch keeps working in a background tab while browser timers pause.
      // The server long-polls, so this loop is idle until ChatGPT sends a command.
      while (client.connected) {
        await client.synchronize();
      }
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
      void synchronize();
    } catch {
      elements.status.textContent = "Companion nicht erreichbar";
    } finally {
      elements.toggle.disabled = false;
    }
  }

  async function stop(status = "Nicht verbunden"): Promise<void> {
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
