mod support;

use img2svg_core::{
    ConversionOptions, NativeShapeTypes, ShapeDetectionOptions, convert_rgba_with_options_result,
};
use support::{assert_close, attribute, attribute_number, load_fixture, required, svg_element};

#[test]
fn given_ellipse_and_circle_fixtures_when_both_detectors_are_enabled_then_each_native_type_matches()
{
    let ellipse_fixture = load_fixture("ellipse", "ellipse");
    let circle_and_ellipse = NativeShapeTypes::new(true, false, true, false, false);
    let options = ConversionOptions::default()
        .with_shape_detection(ShapeDetectionOptions::new(true, circle_and_ellipse));

    let ellipse_result = convert_rgba_with_options_result(
        &ellipse_fixture.pixels,
        ellipse_fixture.width,
        ellipse_fixture.height,
        options,
    )
    .expect("ellipse fixture should convert");
    let ellipse = svg_element(ellipse_result.svg(), "ellipse");
    for (attribute_name, expected) in [
        ("cx", ellipse_fixture.expected.center_x),
        ("cy", ellipse_fixture.expected.center_y),
        ("rx", ellipse_fixture.expected.radius_x),
        ("ry", ellipse_fixture.expected.radius_y),
    ] {
        assert_close(
            attribute_number(ellipse, attribute_name),
            required(expected),
            ellipse_fixture.tolerance,
        );
    }
    assert!(
        attribute(ellipse, "fill").eq_ignore_ascii_case(
            ellipse_fixture
                .expected
                .fill
                .as_deref()
                .expect("ellipse fill should exist")
        )
    );
    assert!(!ellipse_result.svg().contains("<circle "));
    assert!(!ellipse_result.svg().contains("<path "));
    assert_eq!(ellipse_result.shape_statistics().ellipses(), 1);
    assert_eq!(ellipse_result.shape_statistics().circles(), 0);

    let circle_fixture = load_fixture("circle", "circle");
    let circle_result = convert_rgba_with_options_result(
        &circle_fixture.pixels,
        circle_fixture.width,
        circle_fixture.height,
        options,
    )
    .expect("circle fixture should convert");

    assert!(circle_result.svg().contains("<circle "));
    assert!(!circle_result.svg().contains("<ellipse "));
    assert_eq!(circle_result.shape_statistics().circles(), 1);
    assert_eq!(circle_result.shape_statistics().ellipses(), 0);
}
