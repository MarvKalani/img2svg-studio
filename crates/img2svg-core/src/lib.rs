//! Deterministic browser-independent raster-to-SVG core.

use std::error::Error;
use std::f64::consts::PI;
use std::fmt;

use visioncortex::color_clusters::{HIERARCHICAL_MAX, KeyingAction, Runner, RunnerConfig};
use visioncortex::{Color, ColorImage, PathSimplifyMode, PointF64};

mod conversion_options;
mod shape_detection;
mod visioncortex_shape;

pub use conversion_options::{
    ConversionOptionError, ConversionOptions, CurveFittingMode, HierarchicalMode,
};
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
pub enum ConversionProgressPhase {
    Clustering,
    CutoutClustering,
    Tracing,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct ConversionProgress {
    completed: usize,
    phase: ConversionProgressPhase,
    total: usize,
}

impl ConversionProgress {
    pub const fn completed(self) -> usize {
        self.completed
    }

    pub const fn phase(self) -> ConversionProgressPhase {
        self.phase
    }

    pub const fn total(self) -> usize {
        self.total
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum ConversionErrorCode {
    InvalidDimensions,
    PixelLength,
    TransparentKeyUnavailable,
    InvalidOptions,
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
    convert_rgba_with_options_and_progress(pixels, width, height, options, |_| {})
}

pub fn convert_rgba_with_options_and_progress(
    pixels: &[u8],
    width: usize,
    height: usize,
    options: ConversionOptions,
    mut report_progress: impl FnMut(ConversionProgress),
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
    let minimum_cluster_area = usize::from(options.filter_speckle()).pow(2);
    let has_visible_pixels = pixels.chunks_exact(4).any(|pixel| pixel[3] != 0);
    let mut clusters = run_clusters(
        Runner::new(
            RunnerConfig {
                batch_size: 25_600,
                deepen_diff: i32::from(options.layer_difference()),
                diagonal: options.layer_difference() == 0,
                good_max_area: width * height,
                good_min_area: minimum_cluster_area,
                hierarchical: HIERARCHICAL_MAX,
                hollow_neighbours: 1,
                is_same_color_a: i32::from(8 - options.color_precision()),
                is_same_color_b: 1,
                key_color,
                keying_action: match options.hierarchical_mode() {
                    HierarchicalMode::Cutout => KeyingAction::Keep,
                    HierarchicalMode::Stacked => keying_action,
                },
            },
            image,
        ),
        ConversionProgressPhase::Clustering,
        has_visible_pixels,
        &mut report_progress,
    );

    if options.hierarchical_mode() == HierarchicalMode::Cutout {
        let flattened_image = clusters.view().to_color_image();
        clusters = run_clusters(
            Runner::new(
                RunnerConfig {
                    batch_size: 25_600,
                    deepen_diff: 0,
                    diagonal: false,
                    good_max_area: width * height,
                    good_min_area: 0,
                    hierarchical: 64,
                    hollow_neighbours: 0,
                    is_same_color_a: 0,
                    is_same_color_b: 1,
                    key_color,
                    keying_action: KeyingAction::Discard,
                },
                flattened_image,
            ),
            ConversionProgressPhase::CutoutClustering,
            has_visible_pixels,
            &mut report_progress,
        );
    }

    let view = clusters.view();
    let traced_cluster_indices = view
        .clusters_output
        .iter()
        .rev()
        .copied()
        .filter(|&cluster_index| view.get_cluster(cluster_index).area() >= minimum_cluster_area)
        .collect::<Vec<_>>();
    let tracing_total = traced_cluster_indices.len();
    let tracing_report_interval = tracing_total.div_ceil(100).max(1);
    report_progress(progress(ConversionProgressPhase::Tracing, 0, tracing_total));
    let mut svg_elements = Vec::with_capacity(tracing_total);
    let mut shape_statistics = ShapeStatistics::default();
    for (cluster_order, &cluster_index) in traced_cluster_indices.iter().enumerate() {
        let cluster = view.get_cluster(cluster_index);
        let compound_path = cluster.to_compound_path(
            &view,
            false,
            path_simplify_mode(options.curve_fitting_mode()),
            degrees_to_radians(options.corner_threshold_degrees()),
            f64::from(options.length_threshold_tenths()) / 10.0,
            usize::from(options.max_iterations()),
            degrees_to_radians(options.splice_threshold_degrees()),
        );
        let (path_data, offset) = compound_path.to_svg_string(
            true,
            PointF64::default(),
            Some(u32::from(options.path_precision())),
        );
        if !path_data.is_empty() {
            let candidate = ShapeCandidate {
                area: cluster.area(),
                cluster_color: cluster.residue_color(),
                indices: &cluster.indices,
                pixels,
                rect: cluster.rect,
                scale_percent: options.scale_percent(),
                source_width: width,
            };
            if let Some(detected_shape) = detect_native_shape(candidate, options.shape_detection())
            {
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
                        options.scale_percent(),
                    ),
                });
            }
        }
        let completed = cluster_order + 1;
        // Bound WASM crossings while keeping every displayed count native and the final exact.
        if completed == tracing_total || completed.is_multiple_of(tracing_report_interval) {
            report_progress(progress(
                ConversionProgressPhase::Tracing,
                completed,
                tracing_total,
            ));
        }
    }

    // Raster clusters carry no authoring order, so native types use one canonical z-order.
    svg_elements.sort_by_key(|element| (element.assembly_order, element.cluster_order));

    let target_width = scaled_dimension(width, options.scale_percent())?;
    let target_height = scaled_dimension(height, options.scale_percent())?;

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

fn run_clusters(
    runner: Runner,
    phase: ConversionProgressPhase,
    report_intermediate_progress: bool,
    report_progress: &mut impl FnMut(ConversionProgress),
) -> visioncortex::color_clusters::Clusters {
    const CLUSTERING_TOTAL: usize = 100;
    report_progress(progress(phase, 0, CLUSTERING_TOTAL));
    let mut builder = runner.start();
    let mut last_completed = 0;
    loop {
        let complete = builder.tick();
        let completed = if complete {
            CLUSTERING_TOTAL
        } else if report_intermediate_progress {
            builder.progress().min(CLUSTERING_TOTAL as u32) as usize
        } else {
            0
        };
        if completed > last_completed {
            report_progress(progress(phase, completed, CLUSTERING_TOTAL));
            last_completed = completed;
        }
        if complete {
            return builder.result();
        }
    }
}

const fn progress(
    phase: ConversionProgressPhase,
    completed: usize,
    total: usize,
) -> ConversionProgress {
    ConversionProgress {
        completed,
        phase,
        total,
    }
}

fn path_simplify_mode(mode: CurveFittingMode) -> PathSimplifyMode {
    match mode {
        CurveFittingMode::Pixel => PathSimplifyMode::None,
        CurveFittingMode::Polygon => PathSimplifyMode::Polygon,
        CurveFittingMode::Spline => PathSimplifyMode::Spline,
    }
}

fn degrees_to_radians(degrees: u8) -> f64 {
    f64::from(degrees) / 180.0 * PI
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
