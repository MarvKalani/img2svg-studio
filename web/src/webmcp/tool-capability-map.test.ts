import { describe, expect, test } from "vitest";
import { toolCapabilityMap } from "./tool-capability-map";
import { WebMcpToolName } from "./webmcp-adapter";

describe("Studio tool capability map", () => {
  test("Given the public tool inventory, when compared with visible commands, then every tool is mapped exactly once", () => {
    const mappedNames = toolCapabilityMap.map((capability) => capability.toolName);
    const declaredNames = Object.values(WebMcpToolName);

    expect(new Set(mappedNames).size).toBe(mappedNames.length);
    expect([...mappedNames].sort()).toEqual([...declaredNames].sort());
    expect(toolCapabilityMap.every((capability) => capability.visibleUi.length > 0)).toBe(true);
  });
});
