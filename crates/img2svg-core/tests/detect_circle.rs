mod support;

use img2svg_core::{
    ConversionOptions, NativeShapeTypes, ShapeDetectionOptions, convert_rgba_with_options_result,
};
use support::{assert_close, attribute, attribute_number, load_fixture, required, svg_element};

#[test]
fn given_the_circle_fixture_when_only_circle_detection_is_enabled_then_manifest_geometry_and_stats_match()
 {
    let fixture = load_fixture("circle", "circle");
    let circle_only = NativeShapeTypes::new(true, false, false, false, false);
    let options = ConversionOptions::default()
        .with_shape_detection(ShapeDetectionOptions::new(true, circle_only));

    let result =
        convert_rgba_with_options_result(&fixture.pixels, fixture.width, fixture.height, options)
            .expect("circle fixture should convert");
    let circle = svg_element(result.svg(), "circle");

    assert_close(
        attribute_number(circle, "cx"),
        required(fixture.expected.center_x),
        fixture.tolerance,
    );
    assert_close(
        attribute_number(circle, "cy"),
        required(fixture.expected.center_y),
        fixture.tolerance,
    );
    assert_close(
        attribute_number(circle, "r"),
        required(fixture.expected.radius),
        fixture.tolerance,
    );
    assert!(
        attribute(circle, "fill").eq_ignore_ascii_case(
            fixture
                .expected
                .fill
                .as_deref()
                .expect("circle fill should exist")
        )
    );
    assert!(!result.svg().contains("<path "));
    assert_eq!(result.shape_statistics().circles(), 1);
    assert_eq!(result.shape_statistics().rectangles(), 0);
    assert_eq!(result.shape_statistics().ellipses(), 0);
    assert_eq!(result.shape_statistics().lines(), 0);
    assert_eq!(result.shape_statistics().polygons(), 0);
}

#[test]
fn given_a_hollow_square_with_circle_like_area_when_circle_detection_runs_then_it_remains_a_path() {
    const IMAGE_SIZE: usize = 64;
    let mut pixels = vec![0_u8; IMAGE_SIZE * IMAGE_SIZE * 4];
    for y in 16..48 {
        for x in 16..48 {
            if (24..40).contains(&x) && (24..40).contains(&y) {
                continue;
            }
            let pixel_start = (y * IMAGE_SIZE + x) * 4;
            pixels[pixel_start..pixel_start + 4].copy_from_slice(&[14, 165, 233, 255]);
        }
    }
    let circle_only = NativeShapeTypes::new(true, false, false, false, false);
    let options = ConversionOptions::default()
        .with_shape_detection(ShapeDetectionOptions::new(true, circle_only));

    let result = convert_rgba_with_options_result(&pixels, IMAGE_SIZE, IMAGE_SIZE, options)
        .expect("hollow contour should convert through the path fallback");

    assert!(result.svg().contains("<path "));
    assert!(!result.svg().contains("<circle "));
    assert_eq!(result.shape_statistics().circles(), 0);
}
