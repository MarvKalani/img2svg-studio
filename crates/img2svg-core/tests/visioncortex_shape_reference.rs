mod support;

use std::hint::black_box;
use std::time::{Duration, Instant};

use support::load_scene_fixture;
use visioncortex::{BinaryImage, Shape};

#[test]
fn given_ground_truth_fixtures_when_visioncortex_classifies_them_then_positive_and_negative_evidence_is_known()
 {
    let circle = fixture_shape("circle");
    let ellipse = fixture_shape("ellipse");
    let rectangle = fixture_shape("rectangle");
    let triangle = fixture_shape("triangle");

    assert_eq!(classifications(&circle), [true, true, false, false]);
    assert_eq!(classifications(&ellipse), [false, true, false, false]);
    // Upstream rejects the ideal rectangle but accepts the triangle as a quadrilateral.
    assert_eq!(classifications(&rectangle), [false, false, false, false]);
    assert_eq!(classifications(&triangle), [false, false, true, true]);
}

#[test]
fn given_a_hollow_shape_when_visioncortex_checks_circle_geometry_then_it_rejects_the_false_positive()
 {
    let mut image = BinaryImage::new_w_h(32, 32);
    for y in 0..32 {
        for x in 0..32 {
            if !(8..24).contains(&x) || !(8..24).contains(&y) {
                image.set_pixel(x, y, true);
            }
        }
    }

    assert!(!Shape::from(image).is_circle());
}

#[test]
fn given_the_reference_shapes_when_all_public_classifiers_run_then_runtime_stays_bounded() {
    let shapes = [
        fixture_shape("circle"),
        fixture_shape("ellipse"),
        fixture_shape("rectangle"),
        fixture_shape("triangle"),
    ];
    let started = Instant::now();

    for _ in 0..10 {
        for shape in &shapes {
            black_box(shape.is_circle());
            black_box(shape.is_ellipse());
            black_box(shape.is_quadrilateral());
            black_box(shape.is_isosceles_triangle());
        }
    }

    assert!(
        started.elapsed() < Duration::from_secs(5),
        "reference classification exceeded the five-second test budget"
    );
}

fn classifications(shape: &Shape) -> [bool; 4] {
    [
        shape.is_circle(),
        shape.is_ellipse(),
        shape.is_quadrilateral(),
        shape.is_isosceles_triangle(),
    ]
}

fn fixture_shape(fixture_id: &str) -> Shape {
    let fixture = load_scene_fixture(fixture_id);
    let occupied = fixture
        .pixels
        .chunks_exact(4)
        .enumerate()
        .filter(|(_, rgba)| rgba[3] > 0)
        .map(|(index, _)| (index % fixture.width, index / fixture.width))
        .collect::<Vec<_>>();
    let left = occupied.iter().map(|(x, _)| *x).min().expect("shape left");
    let right = occupied.iter().map(|(x, _)| *x).max().expect("shape right") + 1;
    let top = occupied.iter().map(|(_, y)| *y).min().expect("shape top");
    let bottom = occupied
        .iter()
        .map(|(_, y)| *y)
        .max()
        .expect("shape bottom")
        + 1;
    let mut image = BinaryImage::new_w_h(right - left, bottom - top);
    for (x, y) in occupied {
        image.set_pixel(x - left, y - top, true);
    }
    Shape::from(image)
}
