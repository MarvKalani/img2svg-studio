mod support;

use img2svg_core::{
    ConversionOptions, NativeShapeTypes, ShapeDetectionOptions, convert_rgba_with_options_result,
};
use support::{assert_close, attribute, load_fixture, svg_element};

#[test]
fn given_the_triangle_fixture_when_only_polygon_detection_is_enabled_then_three_manifest_points_match()
 {
    let fixture = load_fixture("triangle", "polygon");
    let polygon_only = NativeShapeTypes::new(false, false, false, false, true);
    let options = ConversionOptions::default()
        .with_shape_detection(ShapeDetectionOptions::new(true, polygon_only));

    let result =
        convert_rgba_with_options_result(&fixture.pixels, fixture.width, fixture.height, options)
            .expect("triangle fixture should convert");
    let polygon = svg_element(result.svg(), "polygon");
    let actual_points = parse_points(attribute(polygon, "points"));
    let expected_points = fixture
        .expected
        .points
        .as_deref()
        .expect("polygon points should exist");

    assert_eq!(actual_points.len(), 3);
    for (actual, expected) in actual_points.iter().zip(expected_points) {
        assert_close(actual[0], expected[0], fixture.tolerance);
        assert_close(actual[1], expected[1], fixture.tolerance);
    }
    assert!(
        attribute(polygon, "fill").eq_ignore_ascii_case(
            fixture
                .expected
                .fill
                .as_deref()
                .expect("polygon fill should exist")
        )
    );
    assert!(!result.svg().contains("<path "));
    assert_eq!(result.shape_statistics().polygons(), 1);
}

#[test]
fn given_a_curved_contour_when_only_polygon_detection_is_enabled_then_it_remains_a_path() {
    let fixture = load_fixture("circle", "circle");
    let polygon_only = NativeShapeTypes::new(false, false, false, false, true);
    let options = ConversionOptions::default()
        .with_shape_detection(ShapeDetectionOptions::new(true, polygon_only));

    let result =
        convert_rgba_with_options_result(&fixture.pixels, fixture.width, fixture.height, options)
            .expect("curved fixture should convert through the fallback");

    assert!(result.svg().contains("<path "));
    assert!(!result.svg().contains("<polygon "));
    assert_eq!(result.shape_statistics().polygons(), 0);
}

fn parse_points(value: &str) -> Vec<[f64; 2]> {
    value
        .split(' ')
        .map(|point| {
            let (x, y) = point
                .split_once(',')
                .expect("polygon point should contain two coordinates");
            [
                x.parse().expect("polygon x should be numeric"),
                y.parse().expect("polygon y should be numeric"),
            ]
        })
        .collect()
}
