mod support;

use img2svg_core::{
    ConversionOptions, NativeShapeTypes, ShapeDetectionOptions, convert_rgba_with_options_result,
};
use support::{assert_close, attribute, attribute_number, load_fixture, required, svg_element};

#[test]
fn given_the_line_fixture_when_only_line_detection_is_enabled_then_manifest_geometry_color_and_stats_match()
 {
    let fixture = load_fixture("line", "line");
    let line_only = NativeShapeTypes::new(false, false, false, true, false);
    let options = ConversionOptions::default()
        .with_shape_detection(ShapeDetectionOptions::new(true, line_only));

    let result =
        convert_rgba_with_options_result(&fixture.pixels, fixture.width, fixture.height, options)
            .expect("line fixture should convert");
    let line = svg_element(result.svg(), "line");

    for (attribute_name, expected) in [
        ("x1", fixture.expected.start_x),
        ("y1", fixture.expected.start_y),
        ("x2", fixture.expected.end_x),
        ("y2", fixture.expected.end_y),
        ("stroke-width", fixture.expected.stroke_width),
    ] {
        assert_close(
            attribute_number(line, attribute_name),
            required(expected),
            fixture.tolerance,
        );
    }
    assert!(
        attribute(line, "stroke").eq_ignore_ascii_case(
            fixture
                .expected
                .stroke
                .as_deref()
                .expect("line stroke should exist")
        )
    );
    assert!(!result.svg().contains("<path "));
    assert_eq!(result.shape_statistics().lines(), 1);
}

#[test]
fn given_a_compact_contour_when_only_line_detection_is_enabled_then_it_remains_a_path() {
    let fixture = load_fixture("circle", "circle");
    let line_only = NativeShapeTypes::new(false, false, false, true, false);
    let options = ConversionOptions::default()
        .with_shape_detection(ShapeDetectionOptions::new(true, line_only));

    let result =
        convert_rgba_with_options_result(&fixture.pixels, fixture.width, fixture.height, options)
            .expect("compact fixture should convert through the fallback");

    assert!(result.svg().contains("<path "));
    assert!(!result.svg().contains("<line "));
    assert_eq!(result.shape_statistics().lines(), 0);
}
