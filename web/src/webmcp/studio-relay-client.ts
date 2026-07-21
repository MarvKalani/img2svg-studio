import type { WebMcpTool } from "./webmcp-adapter";

const defaultRelayUrl = "http://127.0.0.1:8787/studio-relay";

interface RelaySession {
  readonly sessionId: string;
  readonly token: string;
}

interface RelayCommand {
  readonly commandId: string;
  readonly input: unknown;
  readonly toolName: string;
}

interface LoopbackRequestInit extends RequestInit {
  readonly targetAddressSpace?: "loopback";
}

export interface StudioRelayClient {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  readonly connected: boolean;
  synchronize(): Promise<boolean>;
}

interface StudioRelayClientOptions {
  readonly fetch?: (input: string, init?: LoopbackRequestInit) => Promise<Response>;
  readonly relayUrl?: string;
}

export function createStudioRelayClient(
  tools: readonly WebMcpTool[],
  options: StudioRelayClientOptions = {},
): StudioRelayClient {
  const fetchRelay = options.fetch ?? ((input, init) => fetch(input, init));
  const relayUrl = options.relayUrl ?? defaultRelayUrl;
  const toolsByName = new Map(tools.map((tool) => [tool.name, tool]));
  let session: RelaySession | undefined;

  async function connect(): Promise<void> {
    if (session) {
      return;
    }
    const response = await fetchRelay(`${relayUrl}/sessions`, loopbackRequest({ method: "POST" }));
    if (!response.ok) {
      throw new Error("The local Studio Companion is not reachable.");
    }
    session = readSession(await response.json());
  }

  async function disconnect(): Promise<void> {
    const closingSession = session;
    session = undefined;
    if (!closingSession) {
      return;
    }
    try {
      await fetchRelay(
        `${relayUrl}/sessions`,
        loopbackRequest({ headers: sessionHeaders(closingSession), method: "DELETE" }),
      );
    } catch {
      // Closing the page already ends access; a failed best-effort notification is harmless.
    }
  }

  async function synchronize(): Promise<boolean> {
    const activeSession = session;
    if (!activeSession) {
      throw new Error("The visible Studio is not connected.");
    }
    const response = await fetchRelay(
      `${relayUrl}/commands`,
      loopbackRequest({ headers: sessionHeaders(activeSession) }),
    );
    if (response.status === 204) {
      return false;
    }
    if (!response.ok) {
      session = undefined;
      throw new Error("The Studio Companion connection was interrupted.");
    }
    const command = readCommand(await response.json());
    const result = await executeCommand(toolsByName, command);
    const submitted = await fetchRelay(
      `${relayUrl}/results`,
      loopbackRequest({
        body: JSON.stringify({ commandId: command.commandId, result }),
        headers: { "content-type": "application/json", ...sessionHeaders(activeSession) },
        method: "POST",
      }),
    );
    if (!submitted.ok) {
      throw new Error("The Studio Companion did not accept the command result.");
    }
    return true;
  }

  return {
    connect,
    disconnect,
    get connected() {
      return session !== undefined;
    },
    synchronize,
  };
}

async function executeCommand(
  toolsByName: ReadonlyMap<string, WebMcpTool>,
  command: RelayCommand,
): Promise<string> {
  const tool = toolsByName.get(command.toolName);
  if (!tool) {
    return JSON.stringify({ code: "unsupported_tool", ok: false, toolName: command.toolName });
  }
  try {
    return await tool.execute(command.input);
  } catch {
    return JSON.stringify({ code: "tool_failed", ok: false, toolName: command.toolName });
  }
}

function loopbackRequest(init: LoopbackRequestInit): LoopbackRequestInit {
  return { ...init, cache: "no-store", targetAddressSpace: "loopback" };
}

function sessionHeaders(session: RelaySession): Record<string, string> {
  return {
    "x-studio-relay-session": session.sessionId,
    "x-studio-relay-token": session.token,
  };
}

function readSession(value: unknown): RelaySession {
  if (
    typeof value !== "object" ||
    value === null ||
    !("sessionId" in value) ||
    typeof value.sessionId !== "string" ||
    !("token" in value) ||
    typeof value.token !== "string"
  ) {
    throw new TypeError("The Studio Companion returned an invalid session.");
  }
  return { sessionId: value.sessionId, token: value.token };
}

function readCommand(value: unknown): RelayCommand {
  if (
    typeof value !== "object" ||
    value === null ||
    !("commandId" in value) ||
    typeof value.commandId !== "string" ||
    !("toolName" in value) ||
    typeof value.toolName !== "string"
  ) {
    throw new TypeError("The Studio Companion returned an invalid command.");
  }
  return {
    commandId: value.commandId,
    input: "input" in value ? value.input : {},
    toolName: value.toolName,
  };
}
