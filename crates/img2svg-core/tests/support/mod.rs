use std::fs::File;
use std::io::BufReader;
use std::path::{Path, PathBuf};

use serde::Deserialize;

#[derive(Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
// Each integration-test crate reads a different subset of this shared manifest projection.
#[allow(dead_code)]
pub struct ExpectedShape {
    pub center_x: Option<f64>,
    pub center_y: Option<f64>,
    pub element: String,
    pub fill: Option<String>,
    pub height: Option<f64>,
    pub radius: Option<f64>,
    pub radius_x: Option<f64>,
    pub radius_y: Option<f64>,
    pub width: Option<f64>,
    pub x: Option<f64>,
    pub y: Option<f64>,
}

pub struct LoadedFixture {
    pub expected: ExpectedShape,
    pub height: usize,
    pub pixels: Vec<u8>,
    pub tolerance: f64,
    pub width: usize,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct FixtureManifest {
    fixtures: Vec<ShapeFixture>,
    geometry_tolerance_pixels: f64,
}

#[derive(Deserialize)]
struct ShapeFixture {
    expected: Vec<ExpectedShape>,
    id: String,
    input: String,
}

pub fn load_fixture(fixture_id: &str, element: &str) -> LoadedFixture {
    let fixture_root = fixture_root();
    let manifest: FixtureManifest = serde_json::from_str(
        &std::fs::read_to_string(fixture_root.join("manifest.json"))
            .expect("shape manifest should be readable"),
    )
    .expect("shape manifest should be valid JSON");
    let fixture = manifest
        .fixtures
        .iter()
        .find(|fixture| fixture.id == fixture_id)
        .expect("requested fixture should exist");
    let expected = fixture
        .expected
        .iter()
        .find(|shape| shape.element == element)
        .expect("requested shape expectation should exist")
        .clone();
    let (pixels, width, height) = decode_rgba(&fixture_root.join(&fixture.input));
    LoadedFixture {
        expected,
        height,
        pixels,
        tolerance: manifest.geometry_tolerance_pixels,
        width,
    }
}

pub fn svg_element<'a>(svg: &'a str, element: &str) -> &'a str {
    let marker = format!("<{element} ");
    let start = svg.find(&marker).expect("native SVG element should exist");
    let end = svg[start..]
        .find("/>")
        .map(|offset| start + offset + 2)
        .expect("native SVG element should close");
    &svg[start..end]
}

pub fn attribute<'a>(element: &'a str, name: &str) -> &'a str {
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

pub fn attribute_number(element: &str, name: &str) -> f64 {
    attribute(element, name)
        .parse()
        .expect("SVG attribute should be numeric")
}

pub fn required(value: Option<f64>) -> f64 {
    value.expect("manifest geometry should exist")
}

pub fn assert_close(actual: f64, expected: f64, tolerance: f64) {
    assert!(
        (actual - expected).abs() <= tolerance,
        "expected {expected} ± {tolerance}, got {actual}"
    );
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
