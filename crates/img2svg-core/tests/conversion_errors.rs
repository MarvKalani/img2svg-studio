use img2svg_core::{ConversionError, ConversionErrorCode, convert_rgba};

#[test]
fn given_a_successful_run_when_invalid_dimensions_follow_then_a_typed_error_is_returned() {
    let valid_svg = convert_rgba(&[14, 165, 233, 255], 1, 1).expect("one pixel should convert");
    assert!(valid_svg.starts_with("<svg"));

    let error = convert_rgba(&[], 0, 1).expect_err("zero width must be rejected");

    assert_eq!(error, ConversionError::InvalidDimensions);
    assert_eq!(error.code(), ConversionErrorCode::InvalidDimensions);
    assert_eq!(error.to_string(), "Image dimensions must be positive.");
}

#[test]
fn given_an_invalid_rgba_length_when_converted_then_the_error_reports_both_lengths() {
    let error = convert_rgba(&[0, 0, 0, 255], 2, 1).expect_err("four bytes are missing");

    assert_eq!(error.code(), ConversionErrorCode::PixelLength);
    assert_eq!(
        error,
        ConversionError::PixelLength {
            actual: 4,
            expected: 8,
        }
    );
    assert_eq!(error.to_string(), "RGBA byte length is 4; expected 8.");
}

#[test]
fn given_all_preferred_keys_are_visible_when_converted_then_an_unused_key_is_found() {
    let pixels = [
        [255, 0, 255, 255],
        [0, 255, 255, 255],
        [255, 255, 0, 255],
        [255, 0, 0, 255],
        [0, 255, 0, 255],
        [0, 0, 255, 255],
        [255, 255, 255, 255],
        [1, 1, 1, 255],
        [0, 0, 0, 0],
    ]
    .concat();

    let svg = convert_rgba(&pixels, 9, 1).expect("canvas RGBA should remain convertible");

    assert!(svg.starts_with("<svg"));
}
