# Third-party code and model inventory

This inventory separates the Studio's original code from its pinned dependencies and model
artifacts. Model downloads begin only after a visible user action. The executable contract lives
in `web/src/ai/model-manifest.ts`; this document records primary sources and verification evidence.

## Shipped runtime foundations

| Component | Version | License | Purpose and source |
| --- | --- | --- | --- |
| `visioncortex` | 0.8.10 | MIT OR Apache-2.0 | Color clustering and contour tracing; [crate](https://crates.io/crates/visioncortex/0.8.10) |
| `wasm-bindgen` | 0.2.126 | MIT OR Apache-2.0 | Rust/browser boundary; [crate](https://crates.io/crates/wasm-bindgen/0.2.126) |
| `@huggingface/transformers` | 3.8.1 | Apache-2.0 | Browser model runtime; [release](https://github.com/huggingface/transformers.js/releases/tag/3.8.1) |
| `onnxruntime-web` | 1.22.0-dev.20250409-89f8206ba4 | MIT | Transitive ONNX execution runtime; [package](https://www.npmjs.com/package/onnxruntime-web/v/1.22.0-dev.20250409-89f8206ba4) |
| `@modelcontextprotocol/sdk` | 1.29.0 | MIT | Streamable HTTP MCP server; [package](https://www.npmjs.com/package/@modelcontextprotocol/sdk/v/1.29.0) |
| `@modelcontextprotocol/ext-apps` | 1.7.4 | MIT | MCP Apps tool and resource helpers; [package](https://www.npmjs.com/package/@modelcontextprotocol/ext-apps/v/1.7.4) |
| `sharp` | 0.35.3 | Apache-2.0 | Bounded server-side raster decode and palette reduction; [package](https://www.npmjs.com/package/sharp/v/0.35.3) |
| `zod` | 4.4.3 | MIT | MCP input and output schemas; [package](https://www.npmjs.com/package/zod/v/4.4.3) |

The Rust engine's own shape adapter and SVG serialization are original Studio code. VTracer is not
copied or bundled as an application; `visioncortex`, its shared foundation, is consumed as a pinned
crate under its published license. The SHAPE-08 audit records which public `Shape` algorithms were
measured and which behavior was retained.

VTracer 0.6.5 does not call the dormant public shape classifiers itself. The Studio's ground-truth
audit retained only `Shape::is_circle()` as an additional pixel-occupancy check. `is_ellipse()` was
redundant, while `is_quadrilateral()` rejected the ideal rectangle and classified the triangle as a
quadrilateral; `is_isosceles_triangle()` supplied no geometry needed by the product. The exact
upstream sources are the pinned [Visioncortex repository](https://github.com/visioncortex/visioncortex/tree/ca6a3a59c32aab641f048a1d4510f2832bc19291)
and its [Shape implementation](https://github.com/visioncortex/visioncortex/blob/ca6a3a59c32aab641f048a1d4510f2832bc19291/src/shape/geometry.rs).

Transformers.js binds the exact ONNX Runtime version above. Its matching WASM artifact ships with
the static application. ONNX Runtime Web supports both `webgpu` and `wasm` execution providers.

Primary runtime references:

- [Transformers.js WebGPU](https://huggingface.co/docs/transformers.js/guides/webgpu)
- [ONNX Runtime WebGPU](https://onnxruntime.ai/docs/tutorials/web/ep-webgpu.html)
- [ONNX Runtime session configuration](https://onnxruntime.ai/docs/tutorials/web/env-flags-and-session-options.html)

## MODNet — background removal

- Registry ID: `modnet`
- Hub: `Xenova/modnet`
- Revision: `fa2fa546052fba4c08921230a26cc69a333fca12`
- Source: [revision-pinned model card](https://huggingface.co/Xenova/modnet/tree/fa2fa546052fba4c08921230a26cc69a333fca12)
- License: Apache-2.0 according to the model card and the
  [original MODNet project](https://github.com/ZHKKKe/MODNet/blob/master/LICENSE)
- Runtime: `AutoModel` + `AutoProcessor`, FP32, WebGPU preferred with WASM fallback
- Download size: 25,889,088 bytes (24.69 MiB)

| Artifact | Bytes | SHA-256 |
| --- | ---: | --- |
| `config.json` | 83 | `e144d8af9b1f09649785c77f592a76bbc69504ae02e43700663b2a9f00d9c8a2` |
| `preprocessor_config.json` | 365 | `07d83634b1fdd20142ca6e3fe55ab92b558f56d1b0f005ff3a7926f1c9e1165d` |
| `onnx/model.onnx` | 25,888,640 | `07c308cf0fc7e6e8b2065a12ed7fc07e1de8febb7dc7839d7b7f15dd66584df9` |

The processor normalizes RGB, resizes the shorter edge to 512 pixels and keeps both dimensions
divisible by 32. The model receives `input: float32[1,3,H,W]` and returns the alpha matte as
`output: float32[1,1,H,W]`; the Studio adapter scales it to the original size.

The official browser example uses the same local MODNet/WebGPU approach:
[Transformers.js example](https://github.com/huggingface/transformers.js-examples/blob/204b0948e88cd2bdc046316e78b754359653caea/remove-background-webgpu/src/App.jsx).

## SlimSAM 77 Uniform — Smart Select

- Registry ID: `slimsam`
- Hub: `Xenova/slimsam-77-uniform`
- Revision: `5850ab45f587c112167512ffef949107115e26a0`
- Source: [revision-pinned model card](https://huggingface.co/Xenova/slimsam-77-uniform/tree/5850ab45f587c112167512ffef949107115e26a0)
- License: Apache-2.0 according to the model card, the
  [SlimSAM base model](https://huggingface.co/nielsr/slimsam-77-uniform) and the
  [Segment Anything project](https://github.com/facebookresearch/segment-anything/blob/main/LICENSE)
- Runtime: `SamModel` + `AutoProcessor`, FP16, WebGPU
- Download size: 20,721,620 bytes (19.76 MiB)

| Artifact | Bytes | SHA-256 |
| --- | ---: | --- |
| `config.json` | 379 | `6339884f168658d3ca6473b486973913fb33e84e625e06ae2dd7b4a808187419` |
| `preprocessor_config.json` | 466 | `225545a743c654e3c495ec6f545a0eaba57c8ba3fbbd8483b3cb1c0fc58db517` |
| `onnx/vision_encoder_fp16.onnx` | 12,170,657 | `11aaeb49c75e7b3f4cbf8a32c2c819406520c6b3affb4068ff474b2240c8aa38` |
| `onnx/prompt_encoder_mask_decoder_fp16.onnx` | 8,550,118 | `df24d49a6f1a5dc0dbbecd84ca0fff9f14c76e63b81fd35c2b92c1321b007f71` |

The processor converts to RGB, scales the longest edge to 1,024 pixels and pads to 1,024×1,024.
The adapter provides a local RGB image, points as `float32[1,1,P,2]` and labels as
`int64[1,1,P]`. Post-processing returns three Boolean masks at original resolution plus
`iou_scores: float32[1,1,3]`; the highest-scoring mask is selected.

The official browser example loads the same two FP16 graphs through WebGPU:
[Transformers.js example](https://github.com/huggingface/transformers.js-examples/blob/204b0948e88cd2bdc046316e78b754359653caea/segment-anything-webgpu/index.js).

## Development and test tools

These tools are pinned for reproducibility and are not independent services contacted by the
application at runtime.

| Tool | Version | License |
| --- | --- | --- |
| TypeScript | 7.0.2 | Apache-2.0 |
| Vite | 8.1.5 | MIT |
| Vitest | 4.1.10 | MIT |
| Playwright | 1.61.1 | Apache-2.0 |
| `@axe-core/playwright` | 4.12.1 | MPL-2.0 |
| Oxc formatter / linter | 0.59.0 / 1.74.0 | MIT |
| `tsx` | 4.23.1 | MIT |

## Verification and original assets

The Hugging Face file list was checked through the primary model API with `blobs=true` at the
revisions above. ONNX sizes and SHA-256 values come from their LFS metadata. Small JSON artifacts
were downloaded through their revision-pinned `resolve` URLs and hashed locally. Registry tests
reject missing revisions, artifacts, sizes, checksums, tensor contracts, runtime versions and
licenses that do not permit commercial use.

All images under `fixtures/`, the Studio UI, SVG output code, documentation and screenshots are
original project assets created for this repository. No stock photography, proprietary icon set or
third-party font is bundled.
