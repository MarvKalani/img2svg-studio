import type { BrowserModelDefinition, ModelArtifact } from "./model-manifest";

const transformersCacheName = "transformers-cache";

export interface ModelArtifactCache {
  delete(request: RequestInfo | URL): Promise<boolean>;
  match(request: RequestInfo | URL): Promise<Response | undefined>;
  put(request: RequestInfo | URL, response: Response): Promise<void>;
}

export type ModelArtifactProgress = Readonly<{
  file: string;
  loaded: number;
  status: "done" | "progress";
}>;

type FetchArtifact = (input: RequestInfo | URL, init: RequestInit) => Promise<Response>;

interface ModelArtifactCacheDependencies {
  readonly cache?: ModelArtifactCache;
  readonly fetchArtifact?: FetchArtifact;
}

export async function prepareModelArtifactCache(
  model: BrowserModelDefinition,
  report: (progress: ModelArtifactProgress) => void,
  signal: AbortSignal,
  dependencies: ModelArtifactCacheDependencies = {},
): Promise<ModelArtifactCache> {
  const cache = dependencies.cache ?? (await openModelArtifactCache());
  const fetchArtifact = dependencies.fetchArtifact ?? fetch;

  for (const artifact of model.files) {
    signal.throwIfAborted();
    const url = modelArtifactUrl(model, artifact);
    const cachedResponse = await cache.match(url);
    if (cachedResponse) {
      const cachedBytes = await readResponseBytes(cachedResponse, artifact, report, signal);
      if (await artifactMatches(cachedBytes, artifact)) {
        report({ file: artifact.path, loaded: artifact.bytes, status: "done" });
        continue;
      }
      await cache.delete(url);
    }

    let response: Response;
    try {
      response = await fetchArtifact(url, { signal });
    } catch (error) {
      if (signal.aborted) {
        throw error;
      }
      throw new Error(
        `Modellartefakt ${artifact.path} konnte nicht geladen werden. Prüfe die Netzwerkverbindung und versuche es erneut.`,
        { cause: error },
      );
    }
    if (!response.ok) {
      throw new Error(
        `Modellartefakt ${artifact.path} konnte nicht geladen werden (${response.status}). Versuche es erneut.`,
      );
    }
    const bytes = await readResponseBytes(response, artifact, report, signal);
    if (!(await artifactMatches(bytes, artifact))) {
      throw new Error(`Modellartefakt ${artifact.path} stimmt nicht mit dem Manifest überein.`);
    }
    await cache.put(url, new Response(bytes));
    report({ file: artifact.path, loaded: artifact.bytes, status: "done" });
  }
  return cache;
}

export function modelArtifactUrl(model: BrowserModelDefinition, artifact: ModelArtifact): string {
  return `https://huggingface.co/${model.repository}/resolve/${model.revision}/${artifact.path}`;
}

async function openModelArtifactCache(): Promise<ModelArtifactCache> {
  if (typeof caches !== "undefined") {
    try {
      return await caches.open(transformersCacheName);
    } catch {
      // A volatile cache keeps private or restricted browser contexts functional.
    }
  }
  return createMemoryCache();
}

function createMemoryCache(): ModelArtifactCache {
  const entries = new Map<string, Response>();
  return {
    delete: async (request) => entries.delete(String(request)),
    match: async (request) => entries.get(String(request))?.clone(),
    put: async (request, response) => {
      entries.set(String(request), response.clone());
    },
  };
}

async function readResponseBytes(
  response: Response,
  artifact: ModelArtifact,
  report: (progress: ModelArtifactProgress) => void,
  signal: AbortSignal,
): Promise<Uint8Array<ArrayBuffer>> {
  const reader = response.body?.getReader();
  if (!reader) {
    const bytes = new Uint8Array(await response.arrayBuffer());
    report({ file: artifact.path, loaded: bytes.length, status: "progress" });
    return bytes;
  }

  const chunks: Uint8Array<ArrayBuffer>[] = [];
  let loaded = 0;
  while (true) {
    signal.throwIfAborted();
    const chunk = await reader.read();
    if (chunk.done) {
      break;
    }
    const bytes = new Uint8Array(chunk.value);
    chunks.push(bytes);
    loaded += bytes.length;
    report({ file: artifact.path, loaded, status: "progress" });
  }

  const result = new Uint8Array(loaded);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}

async function artifactMatches(
  bytes: Uint8Array<ArrayBuffer>,
  artifact: ModelArtifact,
): Promise<boolean> {
  return bytes.length === artifact.bytes && (await sha256(bytes)) === artifact.sha256;
}

async function sha256(bytes: Uint8Array<ArrayBuffer>): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map(hexByte).join("");
}

function hexByte(byte: number): string {
  return byte.toString(16).padStart(2, "0");
}
