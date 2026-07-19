# Drittanbieter- und Modellinventar

Dieses Inventar pinnt alle für die Browser-KI vorgesehenen Modellartefakte. Die Anwendung lädt
sie erst nach einer sichtbaren Nutzeraktion direkt von der angegebenen revisionsgebundenen
Quelle. `web/src/ai/model-manifest.ts` ist der ausführbare Vertrag; diese Datei dokumentiert die
Primärquellen und Prüfergebnisse.

## Browser-Runtime

| Komponente | Version | Lizenz | Primärquelle |
| --- | --- | --- | --- |
| `@huggingface/transformers` | 3.8.1 | Apache-2.0 | [Release 3.8.1](https://github.com/huggingface/transformers.js/releases/tag/3.8.1) |
| `onnxruntime-web` | 1.22.0-dev.20250409-89f8206ba4 | MIT | [npm-Paket](https://www.npmjs.com/package/onnxruntime-web/v/1.22.0-dev.20250409-89f8206ba4) |

Transformers.js 3.8.1 bindet diese ONNX-Runtime-Version direkt ein. Der exakte Paketstand ist
ohne bekannte `npm audit`-Befunde installiert. ONNX Runtime Web unterstützt `webgpu` und `wasm`
als Browser-Execution-Provider. Das passende WASM-Artefakt wird aus demselben lokalen Paketstand
mit der Anwendung ausgeliefert.

Primärquellen: [Transformers.js WebGPU](https://huggingface.co/docs/transformers.js/guides/webgpu),
[ONNX Runtime WebGPU](https://onnxruntime.ai/docs/tutorials/web/ep-webgpu.html) und
[Session-/Backend-Konfiguration](https://onnxruntime.ai/docs/tutorials/web/env-flags-and-session-options.html).

## MODNet — Hintergrundentfernung

- Registry-ID: `modnet`
- Hub: `Xenova/modnet`
- Revision: `fa2fa546052fba4c08921230a26cc69a333fca12`
- Quelle: [revisionsgebundene Modellkarte](https://huggingface.co/Xenova/modnet/tree/fa2fa546052fba4c08921230a26cc69a333fca12)
- Lizenz: Apache-2.0 laut Modellkarte und
  [MODNet-Ursprungsprojekt](https://github.com/ZHKKKe/MODNet/blob/master/LICENSE)
- Runtime: `AutoModel` + `AutoProcessor`, FP32, bevorzugt WebGPU mit WASM-Fallback
- Downloadgröße: 25.889.088 Byte (24,69 MiB)

| Artefakt | Byte | SHA-256 |
| --- | ---: | --- |
| `config.json` | 83 | `e144d8af9b1f09649785c77f592a76bbc69504ae02e43700663b2a9f00d9c8a2` |
| `preprocessor_config.json` | 365 | `07d83634b1fdd20142ca6e3fe55ab92b558f56d1b0f005ff3a7926f1c9e1165d` |
| `onnx/model.onnx` | 25.888.640 | `07c308cf0fc7e6e8b2065a12ed7fc07e1de8febb7dc7839d7b7f15dd66584df9` |

Der Prozessor normalisiert RGB, setzt die kürzere Kante auf 512 Pixel und hält beide Maße durch
32 teilbar. Das Modell erhält `input: float32[1,3,H,W]` und liefert die Alpha-Matte als
`output: float32[1,1,H,W]`; der Adapter skaliert sie anschließend auf die Originalmaße.

Die revisionsgebundene Modellkarte zeigt denselben `AutoModel`-/`AutoProcessor`-Ablauf. Das
offizielle Browserbeispiel verwendet MODNet ebenfalls lokal über WebGPU:
[Transformers.js-Beispiel](https://github.com/huggingface/transformers.js-examples/blob/204b0948e88cd2bdc046316e78b754359653caea/remove-background-webgpu/src/App.jsx).

## SlimSAM 77 Uniform — Smart Select

- Registry-ID: `slimsam`
- Hub: `Xenova/slimsam-77-uniform`
- Revision: `5850ab45f587c112167512ffef949107115e26a0`
- Quelle: [revisionsgebundene Modellkarte](https://huggingface.co/Xenova/slimsam-77-uniform/tree/5850ab45f587c112167512ffef949107115e26a0)
- Lizenz: Apache-2.0 laut Modellkarte, dem
  [SlimSAM-Basismodell](https://huggingface.co/nielsr/slimsam-77-uniform) und
  [Segment-Anything-Ursprungsprojekt](https://github.com/facebookresearch/segment-anything/blob/main/LICENSE)
- Runtime: `SamModel` + `AutoProcessor`, FP16, WebGPU
- Downloadgröße: 20.721.620 Byte (19,76 MiB)

| Artefakt | Byte | SHA-256 |
| --- | ---: | --- |
| `config.json` | 379 | `6339884f168658d3ca6473b486973913fb33e84e625e06ae2dd7b4a808187419` |
| `preprocessor_config.json` | 466 | `225545a743c654e3c495ec6f545a0eaba57c8ba3fbbd8483b3cb1c0fc58db517` |
| `onnx/vision_encoder_fp16.onnx` | 12.170.657 | `11aaeb49c75e7b3f4cbf8a32c2c819406520c6b3affb4068ff474b2240c8aa38` |
| `onnx/prompt_encoder_mask_decoder_fp16.onnx` | 8.550.118 | `df24d49a6f1a5dc0dbbecd84ca0fff9f14c76e63b81fd35c2b92c1321b007f71` |

Der Prozessor konvertiert zu RGB, skaliert die längste Kante auf 1024 Pixel und füllt auf
1024×1024 auf. Der Produktadapter übernimmt ein lokales RGB-Bild, Punkte als
`float32[1,1,P,2]` und Labels als `int64[1,1,P]`. Nach dem Postprocessing entstehen drei
boolesche Masken in Originalgröße sowie `iou_scores: float32[1,1,3]` zur Auswahl der besten
Maske.

Die Modellkarte dokumentiert dieselben positiven/negativen Punktprompts und Ausgaben. Das
offizielle Browserbeispiel lädt beide FP16-Graphen über WebGPU:
[Transformers.js-Beispiel](https://github.com/huggingface/transformers.js-examples/blob/204b0948e88cd2bdc046316e78b754359653caea/segment-anything-webgpu/index.js).

## Verifikation

Die Hub-Dateiliste wurde über die primäre Hugging-Face-Modell-API mit `blobs=true` an den oben
genannten Revisionen geprüft. Größen und SHA-256 der ONNX-LFS-Objekte stammen aus deren
LFS-Metadaten. Die kleinen JSON-Dateien wurden aus der revisionsgebundenen `resolve`-URL geladen
und lokal mit SHA-256 geprüft. Der Registry-Test lehnt fehlende Revisionen, Artefakte, Größen,
Prüfsummen, Tensorverträge, Runtime-Versionen und Lizenzen ohne kommerzielle Nutzung ab.
