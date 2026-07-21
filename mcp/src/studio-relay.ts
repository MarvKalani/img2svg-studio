import { randomUUID } from "node:crypto";

const defaultActiveSessionMilliseconds = 60_000;
const defaultCommandTimeoutMilliseconds = 30_000;
const defaultLongPollMilliseconds = 20_000;

export interface StudioRelayCommand {
  readonly commandId: string;
  readonly input: unknown;
  readonly toolName: string;
}

export interface StudioRelaySession {
  readonly sessionId: string;
  readonly token: string;
}

interface PendingCommand {
  readonly reject: (error: Error) => void;
  readonly resolve: (result: string) => void;
  readonly timeout: ReturnType<typeof setTimeout>;
}

interface PendingPoll {
  readonly resolve: (command: StudioRelayCommand | undefined) => void;
  readonly timeout: ReturnType<typeof setTimeout>;
}

interface SessionState {
  readonly commands: StudioRelayCommand[];
  lastSeenAt: number;
  readonly pending: Map<string, PendingCommand>;
  pendingPoll?: PendingPoll;
  readonly sessionId: string;
  readonly token: string;
}

export class StudioRelayError extends Error {
  readonly code: "command_timeout" | "invalid_session" | "studio_not_connected";

  constructor(
    code: "command_timeout" | "invalid_session" | "studio_not_connected",
    message: string,
  ) {
    super(message);
    this.code = code;
    this.name = "StudioRelayError";
  }
}

export interface StudioRelay {
  closeSession(sessionId: string, token: string): boolean;
  createSession(): StudioRelaySession;
  execute(toolName: string, input: unknown): Promise<string>;
  poll(sessionId: string, token: string): StudioRelayCommand | undefined;
  submitResult(sessionId: string, token: string, commandId: string, result: string): boolean;
  waitForCommand(sessionId: string, token: string): Promise<StudioRelayCommand | undefined>;
}

interface StudioRelayOptions {
  readonly activeSessionMilliseconds?: number;
  readonly commandTimeoutMilliseconds?: number;
  readonly createId?: () => string;
  readonly longPollMilliseconds?: number;
  readonly now?: () => number;
}

export function createStudioRelay(options: StudioRelayOptions = {}): StudioRelay {
  const activeSessionMilliseconds =
    options.activeSessionMilliseconds ?? defaultActiveSessionMilliseconds;
  const commandTimeoutMilliseconds =
    options.commandTimeoutMilliseconds ?? defaultCommandTimeoutMilliseconds;
  const longPollMilliseconds = options.longPollMilliseconds ?? defaultLongPollMilliseconds;
  const createId = options.createId ?? randomUUID;
  const now = options.now ?? Date.now;
  const sessions = new Map<string, SessionState>();

  function readSession(sessionId: string, token: string): SessionState {
    const session = sessions.get(sessionId);
    if (!session || session.token !== token) {
      throw new StudioRelayError("invalid_session", "The Studio relay session is invalid.");
    }
    return session;
  }

  function closeSession(sessionId: string, token: string): boolean {
    const session = sessions.get(sessionId);
    if (!session || session.token !== token) {
      return false;
    }
    sessions.delete(sessionId);
    if (session.pendingPoll) {
      clearTimeout(session.pendingPoll.timeout);
      session.pendingPoll.resolve(undefined);
    }
    for (const command of session.pending.values()) {
      clearTimeout(command.timeout);
      command.reject(
        new StudioRelayError("studio_not_connected", "The visible Studio disconnected."),
      );
    }
    return true;
  }

  function createSession(): StudioRelaySession {
    const sessionId = createId();
    const token = createId();
    sessions.set(sessionId, {
      commands: [],
      lastSeenAt: now(),
      pending: new Map(),
      sessionId,
      token,
    });
    return Object.freeze({ sessionId, token });
  }

  function activeSession(): SessionState {
    const minimumLastSeen = now() - activeSessionMilliseconds;
    const active = [...sessions.values()]
      .filter((session) => session.lastSeenAt >= minimumLastSeen)
      .sort((left, right) => right.lastSeenAt - left.lastSeenAt)[0];
    if (!active) {
      throw new StudioRelayError(
        "studio_not_connected",
        "Connect the visible img2svg Studio tab before using this tool.",
      );
    }
    return active;
  }

  async function execute(toolName: string, input: unknown): Promise<string> {
    const session = activeSession();
    const commandId = createId();
    const command = Object.freeze({ commandId, input, toolName });
    const waitingPoll = session.pendingPoll;
    if (waitingPoll) {
      session.pendingPoll = undefined;
      clearTimeout(waitingPoll.timeout);
      session.lastSeenAt = now();
      waitingPoll.resolve(command);
    } else {
      session.commands.push(command);
    }
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        session.pending.delete(commandId);
        reject(
          new StudioRelayError(
            "command_timeout",
            `The visible Studio did not finish ${toolName} in time.`,
          ),
        );
      }, commandTimeoutMilliseconds);
      session.pending.set(commandId, { reject, resolve, timeout });
    });
  }

  function poll(sessionId: string, token: string): StudioRelayCommand | undefined {
    const session = readSession(sessionId, token);
    session.lastSeenAt = now();
    return session.commands.shift();
  }

  function waitForCommand(
    sessionId: string,
    token: string,
  ): Promise<StudioRelayCommand | undefined> {
    const session = readSession(sessionId, token);
    session.lastSeenAt = now();
    const queuedCommand = session.commands.shift();
    if (queuedCommand) {
      return Promise.resolve(queuedCommand);
    }
    if (session.pendingPoll) {
      clearTimeout(session.pendingPoll.timeout);
      session.pendingPoll.resolve(undefined);
    }
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        session.pendingPoll = undefined;
        session.lastSeenAt = now();
        resolve(undefined);
      }, longPollMilliseconds);
      session.pendingPoll = { resolve, timeout };
    });
  }

  function submitResult(
    sessionId: string,
    token: string,
    commandId: string,
    result: string,
  ): boolean {
    const session = readSession(sessionId, token);
    session.lastSeenAt = now();
    const command = session.pending.get(commandId);
    if (!command) {
      return false;
    }
    session.pending.delete(commandId);
    clearTimeout(command.timeout);
    command.resolve(result);
    return true;
  }

  return Object.freeze({
    closeSession,
    createSession,
    execute,
    poll,
    submitResult,
    waitForCommand,
  });
}
