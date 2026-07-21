import {
  registerAppResource,
  registerAppTool,
  RESOURCE_MIME_TYPE,
} from "@modelcontextprotocol/ext-apps/server";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { downloadImageFile, type ChatGptFileReference } from "./image-input.js";
import { analyzeImageRegions, removeBackgroundRegion } from "./image-region-service.js";
import { createPreviewResult, previewResourceUri, previewWidgetHtml } from "./preview-widget.js";
import { VectorizeError, vectorizeImage } from "./vectorize-service.js";
import { createStudioRelay, type StudioRelay } from "./studio-relay.js";
import { registerStudioRelayTools } from "./studio-relay-tools.js";

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

const rasterInputSchema = {
  image: fileReferenceSchema.optional(),
  image_base64: z.string().optional(),
};

const normalizedPointSchema = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
});

const backgroundRemovalSchema = z.object({
  seed: normalizedPointSchema,
  sensitivity_percent: z.number().min(0).max(100),
});

const regionStatisticsSchema = z.object({
  heightPixels: z.number().int().positive(),
  removedPercent: z.number().min(0).max(100),
  removedPixelCount: z.number().int().nonnegative(),
  widthPixels: z.number().int().positive(),
});

export function createImg2SvgMcpServer(relay: StudioRelay = createStudioRelay()): McpServer {
  const server = new McpServer({ name: "img2svg-studio", version: "0.1.0" });

  registerStudioRelayTools(server, relay);

  registerAppResource(server, "img2svg SVG preview", previewResourceUri, {}, async () => ({
    contents: [
      {
        _meta: {
          ui: {
            csp: { connectDomains: [], resourceDomains: [] },
            prefersBorder: true,
          },
        },
        mimeType: RESOURCE_MIME_TYPE,
        text: previewWidgetHtml,
        uri: previewResourceUri,
      },
    ],
  }));

  registerAppTool(
    server,
    "analyze_image",
    {
      annotations: {
        destructiveHint: false,
        openWorldHint: true,
        readOnlyHint: true,
      },
      description:
        "Use this before removing a background. It finds deterministic color regions connected to the image edge and returns an annotated image plus numbered regions. Inspect the preview, then copy the chosen region's normalized seed unchanged into remove_background_region. Start sensitivity_percent at 10 for clean artwork and 20 for compressed photographs.",
      inputSchema: {
        ...rasterInputSchema,
        sensitivity_percent: z.number().min(0).max(100),
      },
      outputSchema: {
        heightPixels: z.number().int().positive(),
        regions: z.array(
          z.object({
            coveragePercent: z.number().min(0).max(100),
            pixelCount: z.number().int().positive(),
            regionNumber: z.number().int().positive(),
            sampledColor: z.object({
              alpha: z.number().int().min(0).max(255),
              blue: z.number().int().min(0).max(255),
              green: z.number().int().min(0).max(255),
              red: z.number().int().min(0).max(255),
            }),
            seed: normalizedPointSchema,
          }),
        ),
        widthPixels: z.number().int().positive(),
      },
      _meta: {
        "openai/fileParams": ["image"],
        "openai/toolInvocation/invoked": "Regions ready",
        "openai/toolInvocation/invoking": "Analyzing image regions…",
      },
    },
    async (input) => {
      try {
        const result = await analyzeImageRegions({
          ...(await readToolImage(input)),
          sensitivityPercent: input.sensitivity_percent,
        });
        return {
          content: [
            {
              data: result.previewPngBase64,
              mimeType: "image/png",
              type: "image" as const,
            },
            {
              text: `Found ${String(result.regions.length)} numbered edge regions. Inspect the annotated preview before removing one.`,
              type: "text" as const,
            },
          ],
          // The image content already carries the preview. Keeping it out of structured
          // data avoids sending large raster payloads through ChatGPT twice.
          structuredContent: {
            heightPixels: result.heightPixels,
            regions: result.regions,
            widthPixels: result.widthPixels,
          },
        };
      } catch (error) {
        return errorResult(error, "The image regions could not be analyzed.");
      }
    },
  );

  registerAppTool(
    server,
    "remove_background_region",
    {
      annotations: {
        destructiveHint: false,
        openWorldHint: true,
        readOnlyHint: true,
      },
      description:
        "Use this only after analyze_image. Copy the selected region seed and sensitivity exactly. The operation is stateless: it returns a transparent PNG preview and Base64 PNG without changing the source. Inspect the result, then pass imagePngBase64 as image_base64 to vectorize_image.",
      inputSchema: {
        ...rasterInputSchema,
        seed: normalizedPointSchema,
        sensitivity_percent: z.number().min(0).max(100),
      },
      outputSchema: {
        imagePngBase64: z.string(),
        stats: regionStatisticsSchema,
      },
      _meta: {
        "openai/fileParams": ["image"],
        "openai/toolInvocation/invoked": "Background region removed",
        "openai/toolInvocation/invoking": "Removing selected region…",
      },
    },
    async (input) => {
      try {
        const result = await removeBackgroundRegion({
          ...(await readToolImage(input)),
          seed: input.seed,
          sensitivityPercent: input.sensitivity_percent,
        });
        return {
          content: [
            {
              data: result.imagePngBase64,
              mimeType: "image/png",
              type: "image" as const,
            },
            {
              text: `Removed ${String(result.stats.removedPixelCount)} connected pixels. Inspect the transparent PNG before vectorizing it.`,
              type: "text" as const,
            },
          ],
          structuredContent: result,
        };
      } catch (error) {
        return errorResult(error, "The selected background region could not be removed.");
      }
    },
  );

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
        "Use this when the user wants to convert an attached raster image to SVG. Choose shapes, 4 colors, and low detail for flat logos; trace, 16 colors, and medium detail for illustrations; or trace, 64 colors, and high detail for photographs. When the user asks for a simpler result, lower color_count and detail_level. For a connected edge background, pass background_removal with its normalized seed and sensitivity so removal and tracing happen in one call without sending a large intermediate PNG through the model. Provide exactly one image or image_base64. The tool renders its own SVG preview and download widget; do not pass the SVG to another tool.",
      inputSchema: {
        background_removal: backgroundRemovalSchema.optional(),
        color_count: z.number().int().min(2).max(256),
        detail_level: z.enum(["low", "medium", "high"]),
        image: fileReferenceSchema.optional(),
        image_base64: z.string().optional(),
        mode: z.enum(["trace", "shapes"]),
      },
      outputSchema: {
        backgroundRemoval: regionStatisticsSchema.optional(),
        parameters: parametersSchema,
        stats: statisticsSchema,
      },
      _meta: {
        "openai/fileParams": ["image"],
        ui: { resourceUri: previewResourceUri },
        "openai/outputTemplate": previewResourceUri,
        "openai/toolInvocation/invoked": "SVG created",
        "openai/toolInvocation/invoking": "Creating SVG…",
      },
    },
    async (input) => {
      try {
        const rasterImage = await readToolImage(input);
        const backgroundResult = input.background_removal
          ? await removeBackgroundRegion({
              ...rasterImage,
              seed: input.background_removal.seed,
              sensitivityPercent: input.background_removal.sensitivity_percent,
            })
          : undefined;
        const result = await vectorizeImage({
          colorCount: input.color_count,
          detailLevel: input.detail_level,
          ...(backgroundResult ? { imageBase64: backgroundResult.imagePngBase64 } : rasterImage),
          mode: input.mode,
        });
        const backgroundMessage = backgroundResult
          ? ` Removed ${String(backgroundResult.stats.removedPixelCount)} connected background pixels first.`
          : "";
        return {
          content: [
            {
              text: `Created a ${result.stats.byteSize}-byte SVG with ${result.stats.pathCount} paths.${backgroundMessage} The attached widget contains the exact preview and download.`,
              type: "text" as const,
            },
          ],
          // The SVG can be hundreds of kilobytes. ChatGPT only needs statistics;
          // the widget receives the exact markup through hidden result metadata.
          _meta: { svg: result.svg },
          structuredContent: {
            ...(backgroundResult ? { backgroundRemoval: backgroundResult.stats } : {}),
            parameters: result.parameters,
            stats: result.stats,
          },
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

  registerAppTool(
    server,
    "get_svg_preview",
    {
      annotations: {
        destructiveHint: false,
        openWorldHint: false,
        readOnlyHint: true,
      },
      description:
        "Compatibility renderer for callers that already hold an SVG string. Do not call this after vectorize_image because vectorize_image already renders its own exact preview and download widget.",
      inputSchema: { svg: z.string().min(1) },
      outputSchema: {
        stats: z.object({
          byteSize: z.number().int().nonnegative(),
          circleCount: z.number().int().nonnegative(),
          elementCount: z.number().int().nonnegative(),
          pathCount: z.number().int().nonnegative(),
        }),
        svg: z.string(),
      },
      _meta: {
        ui: { resourceUri: previewResourceUri },
        "openai/outputTemplate": previewResourceUri,
        "openai/toolInvocation/invoked": "Preview ready",
        "openai/toolInvocation/invoking": "Rendering preview…",
      },
    },
    async ({ svg }) => {
      try {
        const result = createPreviewResult(svg);
        return {
          content: [{ text: "Rendered the SVG preview.", type: "text" as const }],
          structuredContent: result,
        };
      } catch {
        return {
          content: [
            {
              text: JSON.stringify({
                code: "invalid_svg",
                message: "The SVG preview input is invalid or too large.",
                ok: false,
              }),
              type: "text" as const,
            },
          ],
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

async function readToolImage(input: {
  image?: unknown;
  image_base64?: string;
}): Promise<{ imageBase64?: string; imageBytes?: Uint8Array }> {
  return input.image
    ? { imageBytes: await downloadImageFile(input.image as ChatGptFileReference) }
    : { imageBase64: input.image_base64 };
}

function errorResult(error: unknown, fallbackMessage: string) {
  const failure = publicFailure(error);
  return {
    content: [
      {
        text: JSON.stringify(
          failure.code === "conversion_failed" ? { ...failure, message: fallbackMessage } : failure,
        ),
        type: "text" as const,
      },
    ],
    isError: true,
  };
}
