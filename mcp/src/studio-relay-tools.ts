import { registerAppTool } from "@modelcontextprotocol/ext-apps/server";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ZodRawShapeCompat } from "@modelcontextprotocol/sdk/server/zod-compat.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

import { StudioRelayError, type StudioRelay } from "./studio-relay.js";

const presetNameSchema = { name: z.string().min(1).max(60) };

const magicWandSchema = {
  sensitivityPercent: z.number().min(0).max(100),
  source: z.enum(["original", "processed"]),
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
};

const configureConversionSchema = {
  colorPrecision: z.number().int().min(1).max(8),
  cornerThreshold: z.number().int().min(0).max(180).optional(),
  curveFitting: z.enum(["pixel", "polygon", "spline"]).optional(),
  filterSpeckle: z.number().int().min(0).max(1_000),
  hierarchical: z.enum(["stacked", "cutout"]).optional(),
  layerDifference: z.number().int().min(0).max(255).optional(),
  lengthThreshold: z.number().min(3.5).max(10).optional(),
  maxIterations: z.number().int().min(1).max(20).optional(),
  monochromeThreshold: z.number().int().min(0).max(255).optional(),
  pathPrecision: z.number().int().min(0).max(4),
  rasterFilterMode: z.enum(["color", "grayscale", "monochrome"]).optional(),
  rasterResizePercent: z
    .union([
      z.literal(25),
      z.literal(50),
      z.literal(75),
      z.literal(125),
      z.literal(150),
      z.literal(200),
      z.literal(400),
    ])
    .optional(),
  rasterSharpenStrength: z.number().int().min(0).max(100).optional(),
  rasterSmoothStrength: z.number().int().min(0).max(100).optional(),
  rasterTargetHeightPixels: z
    .union([z.literal(576), z.literal(720), z.literal(1080), z.literal(2160)])
    .optional(),
  scalePercent: z.number().int().min(10).max(400),
  spliceThreshold: z.number().int().min(0).max(180).optional(),
  useOriginalRasterSize: z.literal(true).optional(),
};

export function registerStudioRelayTools(server: McpServer, relay: StudioRelay): void {
  registerRelayTool(
    server,
    relay,
    "get_workspace_state",
    "Inspect the image, options, History, A/B comparison and models in the connected visible img2svg Studio tab. Use this first when the user refers to the open Studio.",
    {},
    true,
  );
  registerRelayTool(
    server,
    relay,
    "list_conversion_presets",
    "List conversion presets saved by the user in the connected visible Studio browser. Use this before choosing a named user preset.",
    {},
    true,
  );
  registerRelayTool(
    server,
    relay,
    "save_conversion_preset",
    "Save all currently visible Studio conversion settings as a named browser-local preset.",
    presetNameSchema,
    false,
  );
  registerRelayTool(
    server,
    relay,
    "load_conversion_preset",
    "Load one named user preset into every visible Studio control and refresh the SVG preview. First use list_conversion_presets when the exact name is unknown.",
    presetNameSchema,
    false,
  );
  registerRelayTool(
    server,
    relay,
    "configure_conversion",
    "Set the visible Studio raster and tracing parameters. All four required values must be provided; unspecified optional values remain unchanged. The preview refreshes automatically.",
    configureConversionSchema,
    false,
  );
  registerRelayTool(
    server,
    relay,
    "convert_current_image",
    "Accept the current visible SVG preview as an immutable Studio History run after the user asks to keep or convert it.",
    {},
    false,
  );
  registerRelayTool(
    server,
    relay,
    "preview_magic_wand_selection",
    "Preview a visible contiguous Magic Wand selection in the connected Studio without changing pixels. Coordinates are normalized from the image top-left. For the bundled logo's black edge background, start with source original, x 0.01, y 0.01 and sensitivityPercent 15; inspect coverage before applying it.",
    magicWandSchema,
    false,
  );
  registerRelayTool(
    server,
    relay,
    "apply_magic_wand_selection",
    "Remove the currently visible Magic Wand selection in the connected Studio and load the transparent PNG. Call only after preview_magic_wand_selection succeeded and the user asked to remove that region.",
    {},
    false,
  );
}

function registerRelayTool(
  server: McpServer,
  relay: StudioRelay,
  name: string,
  description: string,
  inputSchema: ZodRawShapeCompat,
  readOnly: boolean,
): void {
  registerAppTool(
    server,
    name,
    {
      annotations: {
        destructiveHint: false,
        openWorldHint: false,
        readOnlyHint: readOnly,
      },
      description,
      inputSchema,
      _meta: {
        "openai/toolInvocation/invoked": "Visible Studio updated",
        "openai/toolInvocation/invoking": "Using the visible Studio…",
      },
    },
    async (input) => relayToolResult(relay, name, input),
  );
}

async function relayToolResult(
  relay: StudioRelay,
  toolName: string,
  input: unknown,
): Promise<CallToolResult> {
  try {
    const result = await relay.execute(toolName, input);
    return { content: [{ text: result, type: "text" as const }] };
  } catch (error) {
    const failure =
      error instanceof StudioRelayError
        ? { code: error.code, message: error.message, ok: false }
        : { code: "relay_failed", message: "The visible Studio command failed.", ok: false };
    return {
      content: [{ text: JSON.stringify(failure), type: "text" as const }],
      isError: true as const,
    };
  }
}
