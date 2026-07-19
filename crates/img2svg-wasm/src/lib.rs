//! Browser binding for img2svg-core.

use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn convert_rgba(pixels: &[u8], width: u32, height: u32) -> Result<String, JsValue> {
    img2svg_core::convert_rgba(pixels, width as usize, height as usize)
        .map_err(|error| JsValue::from_f64(error_code_value(error.code())))
}

fn error_code_value(code: img2svg_core::ConversionErrorCode) -> f64 {
    match code {
        img2svg_core::ConversionErrorCode::InvalidDimensions => 1.0,
        img2svg_core::ConversionErrorCode::PixelLength => 2.0,
        img2svg_core::ConversionErrorCode::TransparentKeyUnavailable => 3.0,
    }
}
