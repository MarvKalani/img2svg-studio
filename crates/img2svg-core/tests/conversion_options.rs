use img2svg_core::{
    ConversionOptionError, ConversionOptions, CurveFittingMode, HierarchicalMode,
    convert_rgba_with_options,
};

#[test]
fn given_canonical_defaults_when_read_then_all_values_are_explicit() {
    let options = ConversionOptions::default();

    assert_eq!(options.color_precision(), 6);
    assert_eq!(options.corner_threshold_degrees(), 60);
    assert_eq!(options.curve_fitting_mode(), CurveFittingMode::Spline);
    assert_eq!(options.filter_speckle(), 4);
    assert_eq!(options.hierarchical_mode(), HierarchicalMode::Stacked);
    assert_eq!(options.layer_difference(), 16);
    assert_eq!(options.length_threshold_tenths(), 40);
    assert_eq!(options.max_iterations(), 10);
    assert_eq!(options.path_precision(), 2);
    assert_eq!(options.scale_percent(), 100);
    assert_eq!(options.splice_threshold_degrees(), 45);
}

#[test]
fn given_invalid_values_when_options_are_created_then_each_range_is_rejected() {
    assert_eq!(
        ConversionOptions::try_new(0, 4, 100),
        Err(ConversionOptionError::ColorPrecision)
    );
    assert_eq!(
        ConversionOptions::try_new(7, 1_001, 100),
        Err(ConversionOptionError::FilterSpeckle)
    );
    assert_eq!(
        ConversionOptions::try_new(7, 4, 401),
        Err(ConversionOptionError::ScalePercent)
    );
    assert_eq!(
        ConversionOptions::default().try_with_path_precision(5),
        Err(ConversionOptionError::PathPrecision)
    );
    assert_eq!(
        ConversionOptions::default().try_with_tracing_options(0, 2, 16, 60, 34, 10, 45),
        Err(ConversionOptionError::LengthThreshold)
    );
}

#[test]
fn given_the_same_pixels_when_curve_mode_changes_then_the_svg_geometry_changes() {
    let pixels = (0..24 * 24)
        .flat_map(|index| {
            let x = index % 24;
            let y = index / 24;
            if x > y / 3 && x < 23 - y / 4 {
                [14, 165, 233, 255]
            } else {
                [0, 0, 0, 255]
            }
        })
        .collect::<Vec<_>>();
    let polygon = ConversionOptions::default()
        .try_with_tracing_options(0, 1, 16, 60, 40, 10, 45)
        .expect("polygon tracing options should be valid");
    let spline = ConversionOptions::default();

    let polygon_svg =
        convert_rgba_with_options(&pixels, 24, 24, polygon).expect("polygon should convert");
    let spline_svg =
        convert_rgba_with_options(&pixels, 24, 24, spline).expect("spline should convert");

    assert_ne!(polygon_svg, spline_svg);
}

#[test]
fn given_the_same_pixels_when_path_precision_is_lowered_then_coordinates_use_fewer_bytes() {
    let pixels = (0..16 * 16)
        .flat_map(|index| {
            let x = index % 16;
            let y = index / 16;
            if x > y / 2 && x < 15 - y / 3 {
                [14, 165, 233, 255]
            } else {
                [0, 0, 0, 255]
            }
        })
        .collect::<Vec<_>>();
    let rounded = ConversionOptions::default()
        .try_with_path_precision(0)
        .expect("zero decimal places should be valid");
    let detailed = ConversionOptions::default();

    let rounded_svg =
        convert_rgba_with_options(&pixels, 16, 16, rounded).expect("rounded SVG should convert");
    let detailed_svg =
        convert_rgba_with_options(&pixels, 16, 16, detailed).expect("detailed SVG should convert");

    assert!(rounded_svg.len() < detailed_svg.len());
    assert_ne!(rounded_svg, detailed_svg);
}

#[test]
fn given_the_same_pixels_when_precision_or_speckle_changes_then_the_svg_changes() {
    let mut close_colors = Vec::with_capacity(8 * 4 * 4);
    for _y in 0..4 {
        for x in 0..8 {
            let channel = if x < 4 { 0 } else { 255 };
            close_colors.extend_from_slice(&[channel, channel, channel, 255]);
        }
    }
    let low_precision = ConversionOptions::try_new(1, 0, 100).expect("valid low precision");
    let high_precision = ConversionOptions::try_new(8, 0, 100).expect("valid high precision");
    let low_precision_svg = convert_rgba_with_options(&close_colors, 8, 4, low_precision)
        .expect("low precision should convert");
    let high_precision_svg = convert_rgba_with_options(&close_colors, 8, 4, high_precision)
        .expect("high precision should convert");
    assert_ne!(low_precision_svg, high_precision_svg);

    let mut speckle_pixels = vec![0_u8; 16 * 16 * 4];
    for y in 0..3 {
        for x in 0..3 {
            let pixel_start = (y * 16 + x) * 4;
            speckle_pixels[pixel_start..pixel_start + 4].copy_from_slice(&[14, 165, 233, 255]);
        }
    }
    let keep_speckle = ConversionOptions::try_new(7, 0, 100).expect("valid zero filter");
    let remove_speckle = ConversionOptions::try_new(7, 4, 100).expect("valid default filter");
    let detailed_svg = convert_rgba_with_options(&speckle_pixels, 16, 16, keep_speckle)
        .expect("speckle should convert");
    let filtered_svg = convert_rgba_with_options(&speckle_pixels, 16, 16, remove_speckle)
        .expect("filtered speckle should convert");
    assert!(detailed_svg.contains("<path "));
    assert_ne!(detailed_svg, filtered_svg);
}

#[test]
fn given_a_256_pixel_fixture_when_scaled_to_half_then_the_svg_is_128_pixels() {
    let pixels = vec![14_u8; 256 * 256 * 4];
    let options = ConversionOptions::try_new(7, 4, 50).expect("valid half scale");

    let svg = convert_rgba_with_options(&pixels, 256, 256, options)
        .expect("scaled fixture should convert");

    assert!(svg.contains("width=\"128\" height=\"128\" viewBox=\"0 0 128 128\""));
    assert!(svg.contains("transform=\"scale(0.5) translate("));
}
