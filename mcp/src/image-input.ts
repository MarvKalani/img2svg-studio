import { VectorizeError } from "./vectorize-service.js";

export interface ChatGptFileReference {
  download_url: string;
  file_id: string;
  file_name?: string;
  mime_type?: string;
}

const maximumEncodedBytes = 25 * 1024 * 1024;

export async function downloadImageFile(
  file: ChatGptFileReference,
  fetchFile: typeof fetch = fetch,
): Promise<Uint8Array> {
  const url = readHttpsUrl(file.download_url);
  let response: Response;
  try {
    response = await fetchFile(url, {
      redirect: "error",
      signal: AbortSignal.timeout(15_000),
    });
  } catch (error) {
    throw new VectorizeError("invalid_image_input", "The image file could not be downloaded.", {
      cause: error,
    });
  }
  if (!response.ok || !response.body) {
    throw new VectorizeError("invalid_image_input", "The image file could not be downloaded.");
  }

  const declaredLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > maximumEncodedBytes) {
    throw new VectorizeError("image_too_large", "The encoded image exceeds 25 MB.");
  }
  return readBoundedBody(response.body);
}

function readHttpsUrl(value: string): URL {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") {
      throw new TypeError("Expected HTTPS.");
    }
    return url;
  } catch (error) {
    throw new VectorizeError("invalid_image_input", "The image file reference is invalid.", {
      cause: error,
    });
  }
}

async function readBoundedBody(body: ReadableStream<Uint8Array>): Promise<Uint8Array> {
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let byteLength = 0;
  for (;;) {
    const chunk = await reader.read();
    if (chunk.done) {
      break;
    }
    byteLength += chunk.value.byteLength;
    if (byteLength > maximumEncodedBytes) {
      await reader.cancel();
      throw new VectorizeError("image_too_large", "The encoded image exceeds 25 MB.");
    }
    chunks.push(chunk.value);
  }

  const bytes = new Uint8Array(byteLength);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}
