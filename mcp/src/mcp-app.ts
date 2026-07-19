import { registerAppTool } from "@modelcontextprotocol/ext-apps/server";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { downloadImageFile, type ChatGptFileReference } from "./image-input.js";
import { VectorizeError, vectorizeImage } from "./vectorize-service.js";

const fileReferenceSchema = z.object({
  download_url: z.string().min(1),
  file_id: z.string().min(1),
  file_name: z.string().optional(),
  mime_type: z.string().optional(),
});

const statisticsSchema = z.object({
  byteSize: z.number().int().nonnegative(),
  circleCount: z.number().int().nonnegative(),
  ellipseCount: z.number().int().nonnegative(),
  heightPixels: z.number().int().positive(),
  lineCount: z.number().int().nonnegative(),
  outputHeightPixels: z.number().positive(),
  outputWidthPixels: z.number().positive(),
  pathCount: z.number().int().nonnegative(),
  polygonCount: z.number().int().nonnegative(),
  rectangleCount: z.number().int().nonnegative(),
  widthPixels: z.number().int().positive(),
});

const parametersSchema = z.object({
  colorCount: z.number().int().min(2).max(256),
  detailLevel: z.enum(["low", "medium", "high"]),
  mode: z.enum(["trace", "shapes"]),
});

export function createImg2SvgMcpServer(): McpServer {
  const server = new McpServer({ name: "img2svg-studio", version: "0.1.0" });

  registerAppTool(
    server,
    "vectorize_image",
    {
      annotations: {
        destructiveHint: false,
        openWorldHint: true,
        readOnlyHint: true,
      },
      description:
        "Use this when the user wants to convert an attached raster image to SVG. Choose shapes, 4 colors, and low detail for flat logos; trace, 16 colors, and medium detail for illustrations; or trace, 64 colors, and high detail for photographs. When the user asks for a simpler result, lower color_count and detail_level. Provide exactly one image or image_base64.",
      inputSchema: {
        color_count: z.number().int().min(2).max(256),
        detail_level: z.enum(["low", "medium", "high"]),
        image: fileReferenceSchema.optional(),
        image_base64: z.string().optional(),
        mode: z.enum(["trace", "shapes"]),
      },
      outputSchema: {
        parameters: parametersSchema,
        stats: statisticsSchema,
        svg: z.string(),
      },
      _meta: {
        "openai/fileParams": ["image"],
        "openai/toolInvocation/invoked": "SVG created",
        "openai/toolInvocation/invoking": "Creating SVG…",
      },
    },
    async (input) => {
      try {
        const imageBytes = input.image
          ? await downloadImageFile(input.image as ChatGptFileReference)
          : undefined;
        const result = await vectorizeImage({
          colorCount: input.color_count,
          detailLevel: input.detail_level,
          imageBase64: input.image_base64,
          imageBytes,
          mode: input.mode,
        });
        return {
          content: [
            {
              text: `Created a ${result.stats.byteSize}-byte SVG with ${result.stats.pathCount} paths.`,
              type: "text" as const,
            },
          ],
          structuredContent: result,
        };
      } catch (error) {
        const failure = publicFailure(error);
        return {
          content: [{ text: JSON.stringify(failure), type: "text" as const }],
          isError: true,
        };
      }
    },
  );

  return server;
}

function publicFailure(error: unknown): { code: string; message: string; ok: false } {
  return error instanceof VectorizeError
    ? { code: error.code, message: error.message, ok: false }
    : { code: "conversion_failed", message: "The image could not be vectorized.", ok: false };
}
