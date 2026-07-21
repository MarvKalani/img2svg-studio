import { describe, expect, test } from "vitest";

import { createStudioRelay, StudioRelayError } from "./studio-relay.js";

describe("visible Studio relay", () => {
  test("Given one connected Studio, when ChatGPT invokes a tool, then that tab receives and resolves the command", async () => {
    let nextId = 0;
    const relay = createStudioRelay({ createId: () => `id-${String(++nextId)}` });
    const session = relay.createSession();

    const execution = relay.execute("load_conversion_preset", { name: "Jury Logo" });
    const command = relay.poll(session.sessionId, session.token);

    expect(command).toEqual({
      commandId: "id-3",
      input: { name: "Jury Logo" },
      toolName: "load_conversion_preset",
    });
    expect(
      relay.submitResult(session.sessionId, session.token, command!.commandId, '{"ok":true}'),
    ).toBe(true);
    await expect(execution).resolves.toBe('{"ok":true}');
  });

  test("Given no active Studio, when ChatGPT invokes a browser tool, then it receives an actionable error", async () => {
    const relay = createStudioRelay();

    await expect(relay.execute("get_workspace_state", {})).rejects.toEqual(
      expect.objectContaining<Partial<StudioRelayError>>({ code: "studio_not_connected" }),
    );
  });

  test("Given a background Studio is long-polling, when ChatGPT invokes a tool, then the pending browser request receives it", async () => {
    let nextId = 0;
    const relay = createStudioRelay({ createId: () => `id-${String(++nextId)}` });
    const session = relay.createSession();

    const waitingCommand = relay.waitForCommand(session.sessionId, session.token);
    const execution = relay.execute("load_conversion_preset", { name: "Candy Logo" });

    await expect(waitingCommand).resolves.toEqual({
      commandId: "id-3",
      input: { name: "Candy Logo" },
      toolName: "load_conversion_preset",
    });
    relay.submitResult(session.sessionId, session.token, "id-3", '{"ok":true}');
    await expect(execution).resolves.toBe('{"ok":true}');
  });

  test("Given a relay token from another session, when it polls, then no command is exposed", () => {
    let nextId = 0;
    const relay = createStudioRelay({ createId: () => `id-${String(++nextId)}` });
    const first = relay.createSession();
    const second = relay.createSession();

    expect(() => relay.poll(first.sessionId, second.token)).toThrow("invalid");
  });
});
