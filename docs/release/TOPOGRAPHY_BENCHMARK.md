# Topography raster benchmark

## Purpose and source

The benchmark uses [`topography-island.png`](../../fixtures/demo/topography-island.png), a
1,536 × 1,024 PNG generated specifically for img2svg Studio with OpenAI image generation on
21 July 2026. It depicts invented geography, contains no text and incorporates no external map or
elevation dataset. The source is 2,696,326 bytes; its SHA-256 is
`8d50a86f557ceb7bb165126b9f97baa2f3d0f69cfca34180dad6c30a342a01cd`.

The image intentionally combines broad elevation bands with dense contour lines. It tests the
tradeoff the product is meant to expose: retaining every raster edge can produce an SVG larger than
the source, while controlled color merging, speckle removal and raster downscaling can sharply
reduce paths and bytes.

## Reproduce

Build and serve the production app, then run the benchmark in desktop Google Chrome:

```bash
npm --prefix web run build
npm --prefix web run preview -- --host 127.0.0.1
npm --prefix web run benchmark:topography
```

The script drives the same visible controls, conversion worker and WASM engine as the product. It
reads conversion time from the accepted history run rather than timing the inexpensive accept
click. Quality is measured after rasterizing source and candidate to 256 × 171 RGBA pixels.

## Results — Chrome 150 on Apple M4

| Profile | Prepared raster | SVG bytes | Source ratio | Paths | Engine | Color similarity | Structural similarity |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Illustration original | 1,536 × 1,024 | 3,592,242 | 133.2% | 3,452 | 2,461 ms | 0.981 | 0.888 |
| Balanced 75% | 1,152 × 768 | 1,552,671 | 57.6% | 837 | 906 ms | 0.984 | 0.918 |
| Compact 50% | 768 × 512 | 183,054 | 6.8% | 118 | 179 ms | 0.945 | 0.659 |
| Grayscale contours 50% | 768 × 512 | 400,768 | 14.9% | 335 | 248 ms | 0.848 | 0.794 |

`Balanced 75%` is the strongest visual-size compromise in this bounded sample: it is smaller than
the PNG, retains the best structural score and completes below one second of engine time. `Compact
50%` is the deliberate size-first alternative. Its 93.2% byte reduction and 86% path reduction
relative to Balanced are measurable, but the lower structural score warns that contour detail was
lost.

Silhouette IoU is 1.0 for every profile because the source is a fully opaque rectangular map tile,
including its water background. The metric is reported by the generic quality function but is not
used to rank these profiles.

## What this demo does and does not represent

The generated SVG is a portable visual map: colored regions and contour strokes remain crisp while
zooming. It does not contain semantic height samples merely because its pixels look topographic.
Actual interactive map stacks usually use compact [Mapbox Vector Tiles](https://mapbox.github.io/vector-tile-spec/)
for vector geometry and a raster DEM source, such as MapLibre's
[`raster-dem`](https://maplibre.org/maplibre-style-spec/sources/#raster-dem), for numeric elevation.
Large 3D terrain uses specialized tiled formats such as
[OGC 3D Tiles](https://www.ogc.org/standards/3dtiles/).

That distinction is intentional: this slice proves raster-to-SVG visual compression and A/B
inspection without claiming that VTracer reconstructs geographic topology or elevation values.
