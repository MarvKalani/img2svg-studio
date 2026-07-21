//! Browser binding for img2svg-core.

use wasm_bindgen::prelude::*;

#[wasm_bindgen]
// Scalar arguments keep this narrow WASM ABI allocation-free; the core immediately groups them.
#[allow(clippy::too_many_arguments)]
pub fn convert_rgba(
    pixels: &[u8],
    width: u32,
    height: u32,
    color_precision: u32,
    filter_speckle: u32,
    path_precision: u32,
    hierarchical_mode: u32,
    curve_fitting_mode: u32,
    layer_difference: u32,
    corner_threshold_degrees: u32,
    length_threshold_tenths: u32,
    max_iterations: u32,
    splice_threshold_degrees: u32,
    scale_percent: u32,
    shape_detection_flags: u32,
) -> Result<String, JsValue> {
    let options = conversion_options(
        color_precision,
        filter_speckle,
        path_precision,
        hierarchical_mode,
        curve_fitting_mode,
        layer_difference,
        corner_threshold_degrees,
        length_threshold_tenths,
        max_iterations,
        splice_threshold_degrees,
        scale_percent,
        shape_detection_flags,
    )?;
    img2svg_core::convert_rgba_with_options(pixels, width as usize, height as usize, options)
        .map_err(|error| JsValue::from_f64(error_code_value(error.code())))
}

#[wasm_bindgen]
#[allow(clippy::too_many_arguments)]
pub fn convert_rgba_with_progress(
    pixels: &[u8],
    width: u32,
    height: u32,
    color_precision: u32,
    filter_speckle: u32,
    path_precision: u32,
    hierarchical_mode: u32,
    curve_fitting_mode: u32,
    layer_difference: u32,
    corner_threshold_degrees: u32,
    length_threshold_tenths: u32,
    max_iterations: u32,
    splice_threshold_degrees: u32,
    scale_percent: u32,
    shape_detection_flags: u32,
    progress_callback: &js_sys::Function,
) -> Result<String, JsValue> {
    let options = conversion_options(
        color_precision,
        filter_speckle,
        path_precision,
        hierarchical_mode,
        curve_fitting_mode,
        layer_difference,
        corner_threshold_degrees,
        length_threshold_tenths,
        max_iterations,
        splice_threshold_degrees,
        scale_percent,
        shape_detection_flags,
    )?;
    img2svg_core::convert_rgba_with_options_and_progress(
        pixels,
        width as usize,
        height as usize,
        options,
        |progress| {
            // Progress must never make an otherwise valid local conversion fail.
            let _ = progress_callback.call3(
                &JsValue::NULL,
                &JsValue::from_str(progress_phase(progress.phase())),
                &JsValue::from_f64(progress.completed() as f64),
                &JsValue::from_f64(progress.total() as f64),
            );
        },
    )
    .map(img2svg_core::ConversionResult::into_svg)
    .map_err(|error| JsValue::from_f64(error_code_value(error.code())))
}

#[allow(clippy::too_many_arguments)]
fn conversion_options(
    color_precision: u32,
    filter_speckle: u32,
    path_precision: u32,
    hierarchical_mode: u32,
    curve_fitting_mode: u32,
    layer_difference: u32,
    corner_threshold_degrees: u32,
    length_threshold_tenths: u32,
    max_iterations: u32,
    splice_threshold_degrees: u32,
    scale_percent: u32,
    shape_detection_flags: u32,
) -> Result<img2svg_core::ConversionOptions, JsValue> {
    img2svg_core::ConversionOptions::try_new(color_precision, filter_speckle, scale_percent)
        .and_then(|options| options.try_with_path_precision(path_precision))
        .and_then(|options| {
            options.try_with_tracing_options(
                hierarchical_mode,
                curve_fitting_mode,
                layer_difference,
                corner_threshold_degrees,
                length_threshold_tenths,
                max_iterations,
                splice_threshold_degrees,
            )
        })
        .map_err(|_| JsValue::from_f64(4.0))
        .map(|options| {
            options.with_shape_detection(img2svg_core::ShapeDetectionOptions::from_flags(
                shape_detection_flags,
            ))
        })
}

const fn progress_phase(phase: img2svg_core::ConversionProgressPhase) -> &'static str {
    match phase {
        img2svg_core::ConversionProgressPhase::Clustering => "clustering",
        img2svg_core::ConversionProgressPhase::CutoutClustering => "cutout-clustering",
        img2svg_core::ConversionProgressPhase::Tracing => "tracing",
    }
}

fn error_code_value(code: img2svg_core::ConversionErrorCode) -> f64 {
    match code {
        img2svg_core::ConversionErrorCode::InvalidDimensions => 1.0,
        img2svg_core::ConversionErrorCode::PixelLength => 2.0,
        img2svg_core::ConversionErrorCode::TransparentKeyUnavailable => 3.0,
        img2svg_core::ConversionErrorCode::InvalidOptions => 4.0,
    }
}
