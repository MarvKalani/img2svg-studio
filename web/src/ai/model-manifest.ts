export type BrowserModelId = "modnet" | "slimsam";
export type BrowserModelPurpose = "background-removal" | "smart-select";
export type CommercialModelLicense = "apache-2.0" | "bsd-2-clause" | "bsd-3-clause" | "mit";
export type BrowserExecutionBackend = "wasm" | "webgpu";
export type ModelDataType = "bool" | "float16" | "float32" | "int64" | "uint8";
export type ModelDimension = number | string;

export interface ModelArtifact {
  readonly bytes: number;
  readonly path: string;
  readonly sha256: string;
}

export interface ModelTensorContract {
  readonly dataType: ModelDataType;
  readonly name: string;
  readonly shape: readonly ModelDimension[];
}

export interface BrowserModelRuntime {
  readonly backends: readonly BrowserExecutionBackend[];
  readonly dataType: "fp16" | "fp32";
  readonly modelClass: "AutoModel" | "SamModel";
  readonly onnxRuntimePackage: "onnxruntime-web";
  readonly onnxRuntimeVersion: string;
  readonly processorClass: "AutoProcessor";
  readonly transformersPackage: "@huggingface/transformers";
  readonly transformersVersion: string;
}

export interface BrowserModelDefinition {
  readonly files: readonly ModelArtifact[];
  readonly id: BrowserModelId;
  readonly inputs: readonly ModelTensorContract[];
  readonly label: string;
  readonly license: CommercialModelLicense;
  readonly outputs: readonly ModelTensorContract[];
  readonly purpose: BrowserModelPurpose;
  readonly repository: string;
  readonly revision: string;
  readonly runtime: BrowserModelRuntime;
  readonly sourceUrl: string;
}

const transformersRuntime = Object.freeze({
  onnxRuntimePackage: "onnxruntime-web" as const,
  onnxRuntimeVersion: "1.22.0-dev.20250409-89f8206ba4",
  processorClass: "AutoProcessor" as const,
  transformersPackage: "@huggingface/transformers" as const,
  transformersVersion: "3.8.1",
});

export const browserModelManifest: readonly BrowserModelDefinition[] = Object.freeze([
  defineModel({
    files: [
      {
        bytes: 83,
        path: "config.json",
        sha256: "e144d8af9b1f09649785c77f592a76bbc69504ae02e43700663b2a9f00d9c8a2",
      },
      {
        bytes: 365,
        path: "preprocessor_config.json",
        sha256: "07d83634b1fdd20142ca6e3fe55ab92b558f56d1b0f005ff3a7926f1c9e1165d",
      },
      {
        bytes: 25_888_640,
        path: "onnx/model.onnx",
        sha256: "07c308cf0fc7e6e8b2065a12ed7fc07e1de8febb7dc7839d7b7f15dd66584df9",
      },
    ],
    id: "modnet",
    inputs: [
      {
        dataType: "float32",
        name: "input",
        shape: [1, 3, "height-divisible-by-32", "width-divisible-by-32"],
      },
    ],
    label: "MODNet Portrait Matting",
    license: "apache-2.0",
    outputs: [
      {
        dataType: "float32",
        name: "output",
        shape: [1, 1, "input-height", "input-width"],
      },
    ],
    purpose: "background-removal",
    repository: "Xenova/modnet",
    revision: "fa2fa546052fba4c08921230a26cc69a333fca12",
    runtime: {
      ...transformersRuntime,
      backends: ["webgpu", "wasm"],
      dataType: "fp32",
      modelClass: "AutoModel",
    },
    sourceUrl: "https://huggingface.co/Xenova/modnet/tree/fa2fa546052fba4c08921230a26cc69a333fca12",
  }),
  defineModel({
    files: [
      {
        bytes: 379,
        path: "config.json",
        sha256: "6339884f168658d3ca6473b486973913fb33e84e625e06ae2dd7b4a808187419",
      },
      {
        bytes: 466,
        path: "preprocessor_config.json",
        sha256: "225545a743c654e3c495ec6f545a0eaba57c8ba3fbbd8483b3cb1c0fc58db517",
      },
      {
        bytes: 12_170_657,
        path: "onnx/vision_encoder_fp16.onnx",
        sha256: "11aaeb49c75e7b3f4cbf8a32c2c819406520c6b3affb4068ff474b2240c8aa38",
      },
      {
        bytes: 8_550_118,
        path: "onnx/prompt_encoder_mask_decoder_fp16.onnx",
        sha256: "df24d49a6f1a5dc0dbbecd84ca0fff9f14c76e63b81fd35c2b92c1321b007f71",
      },
    ],
    id: "slimsam",
    inputs: [
      { dataType: "uint8", name: "rgb-image", shape: ["height", "width", 3] },
      { dataType: "float32", name: "input-points", shape: [1, 1, "point-count", 2] },
      { dataType: "int64", name: "input-labels", shape: [1, 1, "point-count"] },
    ],
    label: "SlimSAM 77 Uniform",
    license: "apache-2.0",
    outputs: [
      {
        dataType: "bool",
        name: "post-processed-masks",
        shape: [1, 3, "original-height", "original-width"],
      },
      { dataType: "float32", name: "iou-scores", shape: [1, 1, 3] },
    ],
    purpose: "smart-select",
    repository: "Xenova/slimsam-77-uniform",
    revision: "5850ab45f587c112167512ffef949107115e26a0",
    runtime: {
      ...transformersRuntime,
      backends: ["webgpu"],
      dataType: "fp16",
      modelClass: "SamModel",
    },
    sourceUrl:
      "https://huggingface.co/Xenova/slimsam-77-uniform/tree/5850ab45f587c112167512ffef949107115e26a0",
  }),
]);

export function validateModelManifest(input: unknown): readonly BrowserModelDefinition[] {
  if (!Array.isArray(input) || input.length === 0) {
    throw new ModelManifestError("The model manifest must contain at least one entry.");
  }

  const modelIds = new Set<string>();
  for (const model of input) {
    validateModel(model);
    if (modelIds.has(model.id)) {
      throw new ModelManifestError(`Duplicate model id: ${model.id}`);
    }
    modelIds.add(model.id);
  }
  return input as BrowserModelDefinition[];
}

export function totalModelBytes(model: BrowserModelDefinition): number {
  return model.files.reduce((total, file) => total + file.bytes, 0);
}

function defineModel(model: BrowserModelDefinition): BrowserModelDefinition {
  return Object.freeze({
    ...model,
    files: Object.freeze(model.files.map((file) => Object.freeze({ ...file }))),
    inputs: Object.freeze(model.inputs.map(freezeTensorContract)),
    outputs: Object.freeze(model.outputs.map(freezeTensorContract)),
    runtime: Object.freeze({
      ...model.runtime,
      backends: Object.freeze([...model.runtime.backends]),
    }),
  });
}

function freezeTensorContract(tensor: ModelTensorContract): ModelTensorContract {
  return Object.freeze({ ...tensor, shape: Object.freeze([...tensor.shape]) });
}

function validateModel(input: unknown): asserts input is BrowserModelDefinition {
  if (!isRecord(input)) {
    throw new ModelManifestError("Each model entry must be an object.");
  }
  requireString(input.id, "model id");
  requireString(input.label, "model label");
  requireString(input.purpose, "model purpose");
  requireString(input.repository, "model repository");
  if (!browserModelIds.has(input.id as BrowserModelId)) {
    throw new ModelManifestError("The model id is not supported.");
  }
  if (!browserModelPurposes.has(input.purpose as BrowserModelPurpose)) {
    throw new ModelManifestError("The model purpose is not supported.");
  }
  if (!isCommitSha(input.revision)) {
    throw new ModelManifestError("The model revision must be a full commit SHA.");
  }
  const expectedSourceUrl = `https://huggingface.co/${input.repository}/tree/${input.revision}`;
  if (!isHttpsUrl(input.sourceUrl) || input.sourceUrl !== expectedSourceUrl) {
    throw new ModelManifestError("The model source must be HTTPS and revision-pinned.");
  }
  if (!commercialModelLicenses.has(input.license as CommercialModelLicense)) {
    throw new ModelManifestError("The model license must permit commercial use.");
  }
  validateFiles(input.files);
  validateTensorContracts(input.inputs, "input");
  validateTensorContracts(input.outputs, "output");
  validateRuntime(input.runtime);
}

function validateFiles(input: unknown): asserts input is ModelArtifact[] {
  if (!Array.isArray(input) || input.length === 0) {
    throw new ModelManifestError("Each model requires pinned artifacts.");
  }
  const paths = new Set<string>();
  for (const file of input) {
    if (!isRecord(file) || !isPositiveInteger(file.bytes)) {
      throw new ModelManifestError("Each model artifact requires its exact byte size.");
    }
    requireString(file.path, "artifact path");
    if (paths.has(file.path)) {
      throw new ModelManifestError(`Duplicate model artifact: ${file.path}`);
    }
    paths.add(file.path);
    if (!isSha256(file.sha256)) {
      throw new ModelManifestError("Each model artifact requires a SHA-256 checksum.");
    }
  }
}

function validateTensorContracts(input: unknown, direction: "input" | "output"): void {
  if (!Array.isArray(input) || input.length === 0) {
    throw new ModelManifestError(`Each model requires an ${direction} tensor contract.`);
  }
  for (const tensor of input) {
    if (!isRecord(tensor)) {
      throw new ModelManifestError(`Each ${direction} tensor must be an object.`);
    }
    requireString(tensor.name, `${direction} tensor name`);
    if (!modelDataTypes.has(tensor.dataType as ModelDataType)) {
      throw new ModelManifestError(`Unsupported ${direction} tensor data type.`);
    }
    if (!Array.isArray(tensor.shape) || tensor.shape.length === 0) {
      throw new ModelManifestError(`Each ${direction} tensor requires a shape.`);
    }
    for (const dimension of tensor.shape) {
      if (!(isPositiveInteger(dimension) || isNonEmptyString(dimension))) {
        throw new ModelManifestError(`Invalid ${direction} tensor dimension.`);
      }
    }
  }
}

function validateRuntime(input: unknown): asserts input is BrowserModelRuntime {
  if (!isRecord(input)) {
    throw new ModelManifestError("Each model requires a browser runtime.");
  }
  for (const value of [input.transformersVersion, input.onnxRuntimeVersion]) {
    requireString(value, "runtime field");
  }
  if (
    input.transformersPackage !== "@huggingface/transformers" ||
    input.onnxRuntimePackage !== "onnxruntime-web" ||
    input.processorClass !== "AutoProcessor" ||
    !modelClasses.has(input.modelClass as BrowserModelRuntime["modelClass"]) ||
    !runtimeDataTypes.has(input.dataType as BrowserModelRuntime["dataType"])
  ) {
    throw new ModelManifestError("The model runtime contract is unsupported.");
  }
  if (
    !Array.isArray(input.backends) ||
    input.backends.length === 0 ||
    input.backends.some(
      (backend) => !browserExecutionBackends.has(backend as BrowserExecutionBackend),
    )
  ) {
    throw new ModelManifestError("Each model requires a supported browser backend.");
  }
}

function requireString(input: unknown, field: string): asserts input is string {
  if (!isNonEmptyString(input)) {
    throw new ModelManifestError(`Missing ${field}.`);
  }
}

function isRecord(input: unknown): input is Record<string, unknown> {
  return typeof input === "object" && input !== null && !Array.isArray(input);
}

function isNonEmptyString(input: unknown): input is string {
  return typeof input === "string" && input.trim().length > 0;
}

function isPositiveInteger(input: unknown): input is number {
  return typeof input === "number" && Number.isSafeInteger(input) && input > 0;
}

function isCommitSha(input: unknown): input is string {
  return typeof input === "string" && /^[0-9a-f]{40}$/.test(input);
}

function isSha256(input: unknown): input is string {
  return typeof input === "string" && /^[0-9a-f]{64}$/.test(input);
}

function isHttpsUrl(input: unknown): input is string {
  if (typeof input !== "string") {
    return false;
  }
  try {
    return new URL(input).protocol === "https:";
  } catch {
    return false;
  }
}

class ModelManifestError extends Error {
  override readonly name = "ModelManifestError";
}

const commercialModelLicenses = new Set<CommercialModelLicense>([
  "apache-2.0",
  "bsd-2-clause",
  "bsd-3-clause",
  "mit",
]);
const modelDataTypes = new Set<ModelDataType>(["bool", "float16", "float32", "int64", "uint8"]);
const browserExecutionBackends = new Set<BrowserExecutionBackend>(["wasm", "webgpu"]);
const browserModelIds = new Set<BrowserModelId>(["modnet", "slimsam"]);
const browserModelPurposes = new Set<BrowserModelPurpose>(["background-removal", "smart-select"]);
const modelClasses = new Set<BrowserModelRuntime["modelClass"]>(["AutoModel", "SamModel"]);
const runtimeDataTypes = new Set<BrowserModelRuntime["dataType"]>(["fp16", "fp32"]);

validateModelManifest(browserModelManifest);
