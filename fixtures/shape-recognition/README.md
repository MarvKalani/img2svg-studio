# Shape-recognition fixtures

These fixtures provide exact ground truth for native SVG shape detection.

- `source/*.svg` defines the intended geometry.
- `input/*.png` is the raster input passed to the converter.
- `manifest.json` defines the expected native SVG elements and numeric geometry.

The recognition test must parse the generated SVG and assert:

1. the expected native element type exists.
2. its coordinates and dimensions match within `geometryTolerancePixels`.
3. its fill or stroke color matches the fixture.
4. no unexpected native element replaces the target shape.

The mixed fixture additionally verifies element count and deterministic output order. A
rendered-pixel comparison remains useful as a secondary guard, but it does not replace the
structural SVG assertions.

Raster inputs are generated deterministically with:

```sh
for source_file in source/*.svg; do
  fixture_name=$(basename "$source_file" .svg)
  rsvg-convert --width 256 --height 256 "$source_file" > "input/$fixture_name.png"
done
```
