mod support;

use img2svg_core::{
    ConversionOptions, NativeShapeTypes, ShapeDetectionOptions, convert_rgba_with_options_result,
};
use support::{
    ExpectedShape, assert_close, attribute, attribute_number, load_scene_fixture, required,
};

#[test]
fn given_the_mixed_fixture_when_all_detectors_run_twice_then_manifest_order_geometry_and_bytes_match()
 {
    let fixture = load_scene_fixture("mixed");
    let options = ConversionOptions::default()
        .with_shape_detection(ShapeDetectionOptions::new(true, NativeShapeTypes::all()));

    let first =
        convert_rgba_with_options_result(&fixture.pixels, fixture.width, fixture.height, options)
            .expect("mixed fixture should convert");
    let second =
        convert_rgba_with_options_result(&fixture.pixels, fixture.width, fixture.height, options)
            .expect("repeated mixed fixture should convert");

    assert_eq!(first.svg(), second.svg());
    assert!(!first.svg().contains("<path "));
    let elements = native_elements(first.svg());
    assert_eq!(elements.len(), fixture.expected.len());
    for (element, expected) in elements.into_iter().zip(&fixture.expected) {
        assert_shape_matches(element, expected, fixture.tolerance);
    }
    assert_eq!(first.shape_statistics().circles(), 1);
    assert_eq!(first.shape_statistics().rectangles(), 1);
    assert_eq!(first.shape_statistics().ellipses(), 0);
    assert_eq!(first.shape_statistics().lines(), 1);
    assert_eq!(first.shape_statistics().polygons(), 1);
}

fn native_elements(svg: &str) -> Vec<&str> {
    let mut elements = ["circle", "rect", "ellipse", "line", "polygon"]
        .into_iter()
        .filter_map(|name| {
            let marker = format!("<{name} ");
            let start = svg.find(&marker)?;
            let end = svg[start..].find("/>")? + start + 2;
            Some((start, &svg[start..end]))
        })
        .collect::<Vec<_>>();
    elements.sort_by_key(|(start, _)| *start);
    elements.into_iter().map(|(_, element)| element).collect()
}

fn assert_shape_matches(element: &str, expected: &ExpectedShape, tolerance: f64) {
    assert!(element.starts_with(&format!("<{} ", expected.element)));
    match expected.element.as_str() {
        "circle" => assert_numbers(
            element,
            tolerance,
            &[
                ("cx", expected.center_x),
                ("cy", expected.center_y),
                ("r", expected.radius),
            ],
        ),
        "rect" => assert_numbers(
            element,
            tolerance,
            &[
                ("x", expected.x),
                ("y", expected.y),
                ("width", expected.width),
                ("height", expected.height),
            ],
        ),
        "line" => assert_numbers(
            element,
            tolerance,
            &[
                ("x1", expected.start_x),
                ("y1", expected.start_y),
                ("x2", expected.end_x),
                ("y2", expected.end_y),
                ("stroke-width", expected.stroke_width),
            ],
        ),
        "polygon" => {
            let actual_points = parse_points(attribute(element, "points"));
            let expected_points = expected
                .points
                .as_deref()
                .expect("polygon points should exist");
            assert_eq!(actual_points.len(), expected_points.len());
            for (actual, expected) in actual_points.iter().zip(expected_points) {
                assert_close(actual[0], expected[0], tolerance);
                assert_close(actual[1], expected[1], tolerance);
            }
        }
        element => panic!("unexpected mixed-fixture element {element}"),
    }

    let expected_color = expected
        .fill
        .as_deref()
        .or(expected.stroke.as_deref())
        .expect("shape color should exist");
    let color_attribute = if expected.stroke.is_some() {
        "stroke"
    } else {
        "fill"
    };
    assert!(attribute(element, color_attribute).eq_ignore_ascii_case(expected_color));
}

fn assert_numbers(element: &str, tolerance: f64, values: &[(&str, Option<f64>)]) {
    for &(name, expected) in values {
        assert_close(
            attribute_number(element, name),
            required(expected),
            tolerance,
        );
    }
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
