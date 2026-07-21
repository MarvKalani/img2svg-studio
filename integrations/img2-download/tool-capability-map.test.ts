import { describe, expect, test } from "vitest";
import {
  PredecessorCommand,
  PredecessorToolName,
  predecessorCapabilityMap,
} from "./tool-capability-map";

describe("img2.download WebMCP capability map", () => {
  test("Given every supported visible converter command, when mapped, then each command and tool appears exactly once", () => {
    const commands = predecessorCapabilityMap.map((capability) => capability.command);
    const toolNames = predecessorCapabilityMap.map((capability) => capability.toolName);

    expect([...commands].sort()).toEqual(Object.values(PredecessorCommand).sort());
    expect([...toolNames].sort()).toEqual(Object.values(PredecessorToolName).sort());
    expect(new Set(commands).size).toBe(commands.length);
    expect(new Set(toolNames).size).toBe(toolNames.length);
    expect(predecessorCapabilityMap.every((capability) => capability.visibleUi.length > 0)).toBe(
      true,
    );
  });

  test("Given the deployable adapter, when audited, then it uses document.modelContext and registers exactly the mapped tools", async () => {
    const source = await readFile(new URL("./webmcp.js", import.meta.url), "utf8");
    const registeredNames = [...source.matchAll(/name: "([a-z_]+)"/gu)].flatMap((match) => {
      const name = match[1];
      return name === undefined ? [] : [name];
    });

    expect(source).toContain("document.modelContext");
    expect(source).not.toContain("navigator.modelContext");
    expect(registeredNames.sort((left, right) => left.localeCompare(right))).toEqual(
      Object.values(PredecessorToolName).sort((left, right) => left.localeCompare(right)),
    );
  });
});
import { readFile } from "node:fs/promises";
