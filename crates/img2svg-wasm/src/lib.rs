//! Browser binding for img2svg-core.

use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn convert_rgba(pixels: &[u8], width: u32, height: u32) -> Result<String, JsValue> {
    img2svg_core::convert_rgba(pixels, width as usize, height as usize)
        .map_err(|error| JsValue::from_str(&error.to_string()))
}
