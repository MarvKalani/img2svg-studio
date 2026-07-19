//! Deterministic browser-independent raster-to-SVG core.

use std::error::Error;
use std::f64::consts::PI;
use std::fmt;

use visioncortex::color_clusters::{HIERARCHICAL_MAX, KeyingAction, Runner, RunnerConfig};
use visioncortex::{Color, ColorImage, PathSimplifyMode, PointF64};

mod shape_detection;
mod visioncortex_shape;

pub use shape_detection::{
    NativeShapeKind, NativeShapeTypes, ShapeDetectionOptions, ShapeStatistics,
};
use shape_detection::{ShapeCandidate, detect_native_shape};

const TRANSPARENT_KEY_CANDIDATES: [(u8, u8, u8); 8] = [
    (255, 0, 255),
    (0, 255, 255),
    (255, 255, 0),
    (255, 0, 0),
    (0, 255, 0),
    (0, 0, 255),
    (255, 255, 255),
    (1, 1, 1),
];
const PATH_ASSEMBLY_ORDER: u8 = u8::MAX;

struct OrderedSvgElement {
    assembly_order: u8,
    cluster_order: usize,
    markup: String,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum ConversionErrorCode {
    InvalidDimensions,
    PixelLength,
    TransparentKeyUnavailable,
    InvalidOptions,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum ConversionOptionError {
    ColorPrecision,
    FilterSpeckle,
    ScalePercent,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ConversionResult {
    shape_statistics: ShapeStatistics,
    svg: String,
}

impl ConversionResult {
    pub fn svg(&self) -> &str {
        &self.svg
    }

    pub const fn shape_statistics(&self) -> ShapeStatistics {
        self.shape_statistics
    }

    pub fn into_svg(self) -> String {
        self.svg
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct ConversionOptions {
    color_precision: u8,
    filter_speckle: u16,
    scale_percent: u16,
    shape_detection: ShapeDetectionOptions,
}

impl ConversionOptions {
    pub fn try_new(
        color_precision: u32,
        filter_speckle: u32,
        scale_percent: u32,
    ) -> Result<Self, ConversionOptionError> {
        if !(1..=8).contains(&color_precision) {
            return Err(ConversionOptionError::ColorPrecision);
        }
        if filter_speckle > 1_000 {
            return Err(ConversionOptionError::FilterSpeckle);
        }
        if !(10..=400).contains(&scale_percent) {
            return Err(ConversionOptionError::ScalePercent);
        }

        Ok(Self {
            color_precision: u8::try_from(color_precision)
                .map_err(|_| ConversionOptionError::ColorPrecision)?,
            filter_speckle: u16::try_from(filter_speckle)
                .map_err(|_| ConversionOptionError::FilterSpeckle)?,
            scale_percent: u16::try_from(scale_percent)
                .map_err(|_| ConversionOptionError::ScalePercent)?,
            shape_detection: ShapeDetectionOptions::default(),
        })
    }

    pub const fn color_precision(self) -> u8 {
        self.color_precision
    }

    pub const fn filter_speckle(self) -> u16 {
        self.filter_speckle
    }

    pub const fn scale_percent(self) -> u16 {
        self.scale_percent
    }

    pub const fn shape_detection(self) -> ShapeDetectionOptions {
        self.shape_detection
    }

    pub const fn with_shape_detection(mut self, shape_detection: ShapeDetectionOptions) -> Self {
        self.shape_detection = shape_detection;
        self
    }
}

impl Default for ConversionOptions {
    fn default() -> Self {
        Self {
            color_precision: 7,
            filter_speckle: 4,
            scale_percent: 100,
            shape_detection: ShapeDetectionOptions::default(),
        }
    }
}

#[derive(Debug, PartialEq, Eq)]
pub enum ConversionError {
    InvalidDimensions,
    PixelLength { actual: usize, expected: usize },
    TransparentKeyUnavailable,
    InvalidOptions(ConversionOptionError),
}

impl ConversionError {
    pub const fn code(&self) -> ConversionErrorCode {
        match self {
            Self::InvalidDimensions => ConversionErrorCode::InvalidDimensions,
            Self::PixelLength { .. } => ConversionErrorCode::PixelLength,
            Self::TransparentKeyUnavailable => ConversionErrorCode::TransparentKeyUnavailable,
            Self::InvalidOptions(_) => ConversionErrorCode::InvalidOptions,
        }
    }
}

impl From<ConversionOptionError> for ConversionError {
    fn from(error: ConversionOptionError) -> Self {
        Self::InvalidOptions(error)
    }
}

impl fmt::Display for ConversionError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::InvalidDimensions => formatter.write_str("Image dimensions must be positive."),
            Self::PixelLength { actual, expected } => write!(
                formatter,
                "RGBA byte length is {actual}; expected {expected}."
            ),
            Self::TransparentKeyUnavailable => {
                formatter.write_str("No deterministic transparency key is available.")
            }
            Self::InvalidOptions(option) => {
                write!(formatter, "Invalid conversion option: {option}.")
            }
        }
    }
}

impl Error for ConversionError {}

impl fmt::Display for ConversionOptionError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::ColorPrecision => formatter.write_str("color precision"),
            Self::FilterSpeckle => formatter.write_str("speckle filter"),
            Self::ScalePercent => formatter.write_str("scale percent"),
        }
    }
}

pub fn convert_rgba(pixels: &[u8], width: usize, height: usize) -> Result<String, ConversionError> {
    convert_rgba_with_options(pixels, width, height, ConversionOptions::default())
}

pub fn convert_rgba_with_options(
    pixels: &[u8],
    width: usize,
    height: usize,
    options: ConversionOptions,
) -> Result<String, ConversionError> {
    convert_rgba_with_options_result(pixels, width, height, options).map(ConversionResult::into_svg)
}

pub fn convert_rgba_with_options_result(
    pixels: &[u8],
    width: usize,
    height: usize,
    options: ConversionOptions,
) -> Result<ConversionResult, ConversionError> {
    let expected_length = expected_rgba_length(width, height)?;
    if pixels.len() != expected_length {
        return Err(ConversionError::PixelLength {
            actual: pixels.len(),
            expected: expected_length,
        });
    }

    let mut image = ColorImage {
        height,
        pixels: pixels.to_vec(),
        width,
    };
    let (key_color, keying_action) = prepare_transparency(&mut image)?;
    let minimum_cluster_area = usize::from(options.filter_speckle).pow(2);
    let clusters = Runner::new(
        RunnerConfig {
            batch_size: 25_600,
            deepen_diff: 16,
            diagonal: false,
            good_max_area: width * height,
            good_min_area: minimum_cluster_area,
            hierarchical: HIERARCHICAL_MAX,
            hollow_neighbours: 1,
            is_same_color_a: i32::from(8 - options.color_precision),
            is_same_color_b: 1,
            key_color,
            keying_action,
        },
        image,
    )
    .run();

    let view = clusters.view();
    let mut svg_elements = Vec::with_capacity(clusters.output_len());
    let mut shape_statistics = ShapeStatistics::default();
    for (cluster_order, &cluster_index) in view.clusters_output.iter().rev().enumerate() {
        let cluster = view.get_cluster(cluster_index);
        if cluster.area() < minimum_cluster_area {
            continue;
        }
        let compound_path = cluster.to_compound_path(
            &view,
            false,
            PathSimplifyMode::Spline,
            PI / 3.0,
            4.0,
            10,
            PI / 4.0,
        );
        let (path_data, offset) = compound_path.to_svg_string(true, PointF64::default(), Some(2));
        if !path_data.is_empty() {
            let candidate = ShapeCandidate {
                area: cluster.area(),
                cluster_color: cluster.residue_color(),
                indices: &cluster.indices,
                pixels,
                rect: cluster.rect,
                scale_percent: options.scale_percent,
                source_width: width,
            };
            if let Some(detected_shape) = detect_native_shape(candidate, options.shape_detection) {
                shape_statistics.record(detected_shape.kind);
                svg_elements.push(OrderedSvgElement {
                    assembly_order: detected_shape.kind.assembly_order(),
                    cluster_order,
                    markup: detected_shape.svg,
                });
            } else {
                svg_elements.push(OrderedSvgElement {
                    assembly_order: PATH_ASSEMBLY_ORDER,
                    cluster_order,
                    markup: svg_path(
                        &path_data,
                        cluster.residue_color(),
                        offset,
                        options.scale_percent,
                    ),
                });
            }
        }
    }

    // Raster clusters carry no authoring order, so native types use one canonical z-order.
    svg_elements.sort_by_key(|element| (element.assembly_order, element.cluster_order));

    let target_width = scaled_dimension(width, options.scale_percent)?;
    let target_height = scaled_dimension(height, options.scale_percent)?;

    Ok(ConversionResult {
        shape_statistics,
        svg: format!(
            "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"{target_width}\" height=\"{target_height}\" viewBox=\"0 0 {target_width} {target_height}\">{}</svg>",
            svg_elements
                .into_iter()
                .map(|element| element.markup)
                .collect::<String>()
        ),
    })
}

fn scaled_dimension(dimension: usize, scale_percent: u16) -> Result<usize, ConversionError> {
    dimension
        .checked_mul(usize::from(scale_percent))
        .and_then(|scaled| scaled.checked_add(50))
        .map(|scaled| (scaled / 100).max(1))
        .ok_or(ConversionError::InvalidDimensions)
}

fn expected_rgba_length(width: usize, height: usize) -> Result<usize, ConversionError> {
    if width == 0 || height == 0 {
        return Err(ConversionError::InvalidDimensions);
    }

    width
        .checked_mul(height)
        .and_then(|pixel_count| pixel_count.checked_mul(4))
        .ok_or(ConversionError::InvalidDimensions)
}

fn prepare_transparency(image: &mut ColorImage) -> Result<(Color, KeyingAction), ConversionError> {
    if !image.pixels.chunks_exact(4).any(|pixel| pixel[3] == 0) {
        return Ok((Color::default(), KeyingAction::Keep));
    }

    // visioncortex compares RGB channels while clustering. Replacing fully transparent pixels
    // with an unused deterministic RGB key prevents them from merging with visible black.
    let key_color = TRANSPARENT_KEY_CANDIDATES
        .into_iter()
        .map(|(red, green, blue)| Color::new(red, green, blue))
        .find(|candidate| !rgb_exists(image, candidate))
        .ok_or(ConversionError::TransparentKeyUnavailable)?;

    for pixel in image.pixels.chunks_exact_mut(4) {
        if pixel[3] == 0 {
            pixel.copy_from_slice(&[key_color.r, key_color.g, key_color.b, 255]);
        }
    }

    Ok((key_color, KeyingAction::Discard))
}

fn rgb_exists(image: &ColorImage, color: &Color) -> bool {
    image
        .pixels
        .chunks_exact(4)
        .any(|pixel| pixel[0] == color.r && pixel[1] == color.g && pixel[2] == color.b)
}

fn svg_path(path_data: &str, color: Color, offset: PointF64, scale_percent: u16) -> String {
    let opacity = if color.a < 255 {
        format!(" fill-opacity=\"{}\"", format_opacity(color.a))
    } else {
        String::new()
    };
    let transform = if scale_percent == 100 {
        format!("translate({},{})", offset.x, offset.y)
    } else {
        format!(
            "scale({}) translate({},{})",
            scale_factor(scale_percent),
            offset.x,
            offset.y
        )
    };
    format!(
        "<path d=\"{path_data}\" fill=\"{}\"{opacity} transform=\"{transform}\"/>",
        color.to_hex_string()
    )
}

pub(crate) fn scale_factor(scale_percent: u16) -> String {
    let whole = scale_percent / 100;
    let fraction = scale_percent % 100;
    if fraction == 0 {
        whole.to_string()
    } else if fraction.is_multiple_of(10) {
        format!("{whole}.{}", fraction / 10)
    } else {
        format!("{whole}.{fraction:02}")
    }
}

pub(crate) fn format_opacity(alpha: u8) -> String {
    let formatted = format!("{:.3}", f64::from(alpha) / 255.0);
    formatted
        .trim_end_matches('0')
        .trim_end_matches('.')
        .to_owned()
}
