//! Browser binding for img2svg-core.

use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn convert_rgba(
    pixels: &[u8],
    width: u32,
    height: u32,
    color_precision: u32,
    filter_speckle: u32,
    scale_percent: u32,
) -> Result<String, JsValue> {
    let options =
        img2svg_core::ConversionOptions::try_new(color_precision, filter_speckle, scale_percent)
            .map_err(|_| JsValue::from_f64(4.0))?;
    img2svg_core::convert_rgba_with_options(pixels, width as usize, height as usize, options)
        .map_err(|error| JsValue::from_f64(error_code_value(error.code())))
}

fn error_code_value(code: img2svg_core::ConversionErrorCode) -> f64 {
    match code {
        img2svg_core::ConversionErrorCode::InvalidDimensions => 1.0,
        img2svg_core::ConversionErrorCode::PixelLength => 2.0,
        img2svg_core::ConversionErrorCode::TransparentKeyUnavailable => 3.0,
        img2svg_core::ConversionErrorCode::InvalidOptions => 4.0,
    }
}
