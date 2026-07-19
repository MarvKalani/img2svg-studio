use std::fs::File;
use std::io::BufReader;
use std::path::{Path, PathBuf};

use img2svg_core::{
    ConversionOptions, NativeShapeTypes, ShapeDetectionOptions, convert_rgba_with_options_result,
};
use serde::Deserialize;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct FixtureManifest {
    geometry_tolerance_pixels: f64,
    fixtures: Vec<ShapeFixture>,
}

#[derive(Deserialize)]
struct ShapeFixture {
    expected: Vec<ExpectedShape>,
    id: String,
    input: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct ExpectedShape {
    center_x: Option<f64>,
    center_y: Option<f64>,
    element: String,
    fill: Option<String>,
    radius: Option<f64>,
}

#[test]
fn given_the_circle_fixture_when_only_circle_detection_is_enabled_then_manifest_geometry_and_stats_match()
 {
    let fixture_root = fixture_root();
    let manifest: FixtureManifest = serde_json::from_str(
        &std::fs::read_to_string(fixture_root.join("manifest.json"))
            .expect("shape manifest should be readable"),
    )
    .expect("shape manifest should be valid JSON");
    let fixture = manifest
        .fixtures
        .iter()
        .find(|fixture| fixture.id == "circle")
        .expect("circle fixture should exist");
    let expected = fixture
        .expected
        .iter()
        .find(|shape| shape.element == "circle")
        .expect("circle expectation should exist");
    let (pixels, width, height) = decode_rgba(&fixture_root.join(&fixture.input));
    let circle_only = NativeShapeTypes::new(true, false, false, false, false);
    let options = ConversionOptions::default()
        .with_shape_detection(ShapeDetectionOptions::new(true, circle_only));

    let result = convert_rgba_with_options_result(&pixels, width, height, options)
        .expect("circle fixture should convert");
    let circle = svg_element(result.svg(), "circle");
    let tolerance = manifest.geometry_tolerance_pixels;

    assert_close(
        attribute_number(circle, "cx"),
        required(expected.center_x),
        tolerance,
    );
    assert_close(
        attribute_number(circle, "cy"),
        required(expected.center_y),
        tolerance,
    );
    assert_close(
        attribute_number(circle, "r"),
        required(expected.radius),
        tolerance,
    );
    assert!(
        attribute(circle, "fill")
            .eq_ignore_ascii_case(expected.fill.as_deref().expect("circle fill should exist"))
    );
    assert!(!result.svg().contains("<path "));
    assert_eq!(result.shape_statistics().circles(), 1);
    assert_eq!(result.shape_statistics().rectangles(), 0);
    assert_eq!(result.shape_statistics().ellipses(), 0);
    assert_eq!(result.shape_statistics().lines(), 0);
    assert_eq!(result.shape_statistics().polygons(), 0);
}

fn fixture_root() -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR")).join("../../fixtures/shape-recognition")
}

fn decode_rgba(path: &Path) -> (Vec<u8>, usize, usize) {
    let decoder = png::Decoder::new(BufReader::new(
        File::open(path).expect("fixture PNG should be readable"),
    ));
    let mut reader = decoder
        .read_info()
        .expect("fixture PNG header should decode");
    let mut bytes = vec![
        0;
        reader
            .output_buffer_size()
            .expect("fixture size should fit")
    ];
    let frame = reader
        .next_frame(&mut bytes)
        .expect("fixture PNG pixels should decode");
    assert_eq!(frame.color_type, png::ColorType::Rgba);
    assert_eq!(frame.bit_depth, png::BitDepth::Eight);
    bytes.truncate(frame.buffer_size());
    (bytes, frame.width as usize, frame.height as usize)
}

fn svg_element<'a>(svg: &'a str, element: &str) -> &'a str {
    let marker = format!("<{element} ");
    let start = svg.find(&marker).expect("native SVG element should exist");
    let end = svg[start..]
        .find("/>")
        .map(|offset| start + offset + 2)
        .expect("native SVG element should close");
    &svg[start..end]
}

fn attribute<'a>(element: &'a str, name: &str) -> &'a str {
    let marker = format!("{name}=\"");
    let value_start = element
        .find(&marker)
        .map(|offset| offset + marker.len())
        .expect("SVG attribute should exist");
    let value_end = element[value_start..]
        .find('"')
        .map(|offset| value_start + offset)
        .expect("SVG attribute should close");
    &element[value_start..value_end]
}

fn attribute_number(element: &str, name: &str) -> f64 {
    attribute(element, name)
        .parse()
        .expect("SVG attribute should be numeric")
}

fn required(value: Option<f64>) -> f64 {
    value.expect("manifest geometry should exist")
}

fn assert_close(actual: f64, expected: f64, tolerance: f64) {
    assert!(
        (actual - expected).abs() <= tolerance,
        "expected {expected} ± {tolerance}, got {actual}"
    );
}
