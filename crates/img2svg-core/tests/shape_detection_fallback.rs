use img2svg_core::{
    ConversionOptions, NativeShapeKind, NativeShapeTypes, ShapeDetectionOptions, convert_rgba,
    convert_rgba_with_options,
};

const IMAGE_SIZE: usize = 32;

#[test]
fn given_shape_detection_is_disabled_when_converted_then_the_existing_svg_is_byte_identical() {
    let pixels = irregular_fixture_rgba();
    let existing_svg =
        convert_rgba(&pixels, IMAGE_SIZE, IMAGE_SIZE).expect("existing conversion should work");
    let disabled_options = ConversionOptions::default()
        .with_shape_detection(ShapeDetectionOptions::new(false, NativeShapeTypes::all()));

    let disabled_svg = convert_rgba_with_options(&pixels, IMAGE_SIZE, IMAGE_SIZE, disabled_options)
        .expect("disabled shape detection should work");

    assert_eq!(disabled_svg, existing_svg);
}

#[test]
fn given_an_unknown_contour_when_all_detectors_are_enabled_then_it_remains_a_path() {
    let pixels = irregular_fixture_rgba();
    let enabled_options = ConversionOptions::default()
        .with_shape_detection(ShapeDetectionOptions::new(true, NativeShapeTypes::all()));

    let svg = convert_rgba_with_options(&pixels, IMAGE_SIZE, IMAGE_SIZE, enabled_options)
        .expect("fallback conversion should work");

    assert!(svg.contains("<path "));
    for native_element in ["<circle ", "<rect ", "<ellipse ", "<line ", "<polygon "] {
        assert!(!svg.contains(native_element));
    }
}

#[test]
fn given_the_wasm_bitfield_when_decoded_then_global_and_type_switches_remain_typed() {
    let options = ShapeDetectionOptions::from_flags(49);

    assert!(options.enabled());
    assert!(options.types().is_enabled(NativeShapeKind::Circle));
    assert!(options.types().is_enabled(NativeShapeKind::Polygon));
    assert!(!options.types().is_enabled(NativeShapeKind::Rectangle));
    assert!(!options.types().is_enabled(NativeShapeKind::Ellipse));
    assert!(!options.types().is_enabled(NativeShapeKind::Line));
}

fn irregular_fixture_rgba() -> Vec<u8> {
    let mut pixels = vec![0_u8; IMAGE_SIZE * IMAGE_SIZE * 4];
    for y in 3..29 {
        let left = 4 + (y % 4);
        let right = 27 - ((y * 3) % 5);
        for x in left..right {
            let pixel_start = (y * IMAGE_SIZE + x) * 4;
            pixels[pixel_start..pixel_start + 4].copy_from_slice(&[236, 72, 153, 255]);
        }
    }
    pixels
}
