mod support;

use img2svg_core::{
    ConversionOptions, NativeShapeTypes, ShapeDetectionOptions, convert_rgba_with_options_result,
};
use support::{assert_close, attribute, attribute_number, load_fixture, required, svg_element};

#[test]
fn given_the_rectangle_fixture_when_only_rectangle_detection_is_enabled_then_manifest_geometry_and_color_match()
 {
    let fixture = load_fixture("rectangle", "rect");
    let rectangle_only = NativeShapeTypes::new(false, true, false, false, false);
    let options = ConversionOptions::default()
        .with_shape_detection(ShapeDetectionOptions::new(true, rectangle_only));

    let result =
        convert_rgba_with_options_result(&fixture.pixels, fixture.width, fixture.height, options)
            .expect("rectangle fixture should convert");
    let rectangle = svg_element(result.svg(), "rect");

    for (attribute_name, expected) in [
        ("x", fixture.expected.x),
        ("y", fixture.expected.y),
        ("width", fixture.expected.width),
        ("height", fixture.expected.height),
    ] {
        assert_close(
            attribute_number(rectangle, attribute_name),
            required(expected),
            fixture.tolerance,
        );
    }
    assert!(
        attribute(rectangle, "fill").eq_ignore_ascii_case(
            fixture
                .expected
                .fill
                .as_deref()
                .expect("rectangle fill should exist")
        )
    );
    assert!(!result.svg().contains("<path "));
    assert_eq!(result.shape_statistics().rectangles(), 1);
}

#[test]
fn given_a_non_rectangular_contour_when_only_rectangle_detection_is_enabled_then_it_remains_a_path()
{
    let fixture = load_fixture("triangle", "polygon");
    let rectangle_only = NativeShapeTypes::new(false, true, false, false, false);
    let options = ConversionOptions::default()
        .with_shape_detection(ShapeDetectionOptions::new(true, rectangle_only));

    let result =
        convert_rgba_with_options_result(&fixture.pixels, fixture.width, fixture.height, options)
            .expect("triangle fixture should convert through the fallback");

    assert!(result.svg().contains("<path "));
    assert!(!result.svg().contains("<rect "));
    assert_eq!(result.shape_statistics().rectangles(), 0);
}
