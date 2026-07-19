//! Deterministic browser-independent raster-to-SVG core.

use std::collections::BTreeMap;
use std::error::Error;
use std::f64::consts::PI;
use std::fmt;

use visioncortex::color_clusters::{HIERARCHICAL_MAX, KeyingAction, Runner, RunnerConfig};
use visioncortex::{BoundingRect, Color, ColorImage, PathSimplifyMode, PointF64};

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
const MINIMUM_NATIVE_SHAPE_SPAN_PIXELS: f64 = 4.0;
const MAXIMUM_CIRCLE_ASPECT_ERROR: f64 = 0.03;
const MAXIMUM_CIRCLE_AREA_ERROR: f64 = 0.08;
const MAXIMUM_RECTANGLE_AREA_ERROR: f64 = 0.02;
const MINIMUM_RECTANGLE_ASPECT_RATIO: f64 = 0.1;

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

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum NativeShapeKind {
    Circle,
    Rectangle,
    Ellipse,
    Line,
    Polygon,
}

impl NativeShapeKind {
    const ORDERED: [Self; 5] = [
        Self::Circle,
        Self::Rectangle,
        Self::Ellipse,
        Self::Line,
        Self::Polygon,
    ];
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct NativeShapeTypes {
    circle: bool,
    ellipse: bool,
    line: bool,
    polygon: bool,
    rectangle: bool,
}

impl NativeShapeTypes {
    const CIRCLE_FLAG: u32 = 1 << 0;
    const RECTANGLE_FLAG: u32 = 1 << 1;
    const ELLIPSE_FLAG: u32 = 1 << 2;
    const LINE_FLAG: u32 = 1 << 3;
    const POLYGON_FLAG: u32 = 1 << 4;

    pub const fn new(
        circle: bool,
        rectangle: bool,
        ellipse: bool,
        line: bool,
        polygon: bool,
    ) -> Self {
        Self {
            circle,
            ellipse,
            line,
            polygon,
            rectangle,
        }
    }

    pub const fn all() -> Self {
        Self::new(true, true, true, true, true)
    }

    pub const fn from_flags(flags: u32) -> Self {
        Self::new(
            flags & Self::CIRCLE_FLAG != 0,
            flags & Self::RECTANGLE_FLAG != 0,
            flags & Self::ELLIPSE_FLAG != 0,
            flags & Self::LINE_FLAG != 0,
            flags & Self::POLYGON_FLAG != 0,
        )
    }

    pub const fn is_enabled(self, shape: NativeShapeKind) -> bool {
        match shape {
            NativeShapeKind::Circle => self.circle,
            NativeShapeKind::Rectangle => self.rectangle,
            NativeShapeKind::Ellipse => self.ellipse,
            NativeShapeKind::Line => self.line,
            NativeShapeKind::Polygon => self.polygon,
        }
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct ShapeDetectionOptions {
    enabled: bool,
    types: NativeShapeTypes,
}

impl ShapeDetectionOptions {
    const ENABLED_FLAG: u32 = 1 << 5;

    pub const fn new(enabled: bool, types: NativeShapeTypes) -> Self {
        Self { enabled, types }
    }

    pub const fn enabled(self) -> bool {
        self.enabled
    }

    pub const fn types(self) -> NativeShapeTypes {
        self.types
    }

    pub const fn from_flags(flags: u32) -> Self {
        Self::new(
            flags & Self::ENABLED_FLAG != 0,
            NativeShapeTypes::from_flags(flags),
        )
    }
}

impl Default for ShapeDetectionOptions {
    fn default() -> Self {
        Self::new(false, NativeShapeTypes::all())
    }
}

#[derive(Clone, Copy, Debug, Default, PartialEq, Eq)]
pub struct ShapeStatistics {
    circles: usize,
    ellipses: usize,
    lines: usize,
    polygons: usize,
    rectangles: usize,
}

impl ShapeStatistics {
    pub const fn circles(self) -> usize {
        self.circles
    }

    pub const fn ellipses(self) -> usize {
        self.ellipses
    }

    pub const fn lines(self) -> usize {
        self.lines
    }

    pub const fn polygons(self) -> usize {
        self.polygons
    }

    pub const fn rectangles(self) -> usize {
        self.rectangles
    }

    fn record(&mut self, shape: NativeShapeKind) {
        match shape {
            NativeShapeKind::Circle => self.circles += 1,
            NativeShapeKind::Rectangle => self.rectangles += 1,
            NativeShapeKind::Ellipse => self.ellipses += 1,
            NativeShapeKind::Line => self.lines += 1,
            NativeShapeKind::Polygon => self.polygons += 1,
        }
    }
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
    for &cluster_index in view.clusters_output.iter().rev() {
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
            };
            if let Some(detected_shape) = detect_native_shape(candidate, options.shape_detection) {
                shape_statistics.record(detected_shape.kind);
                svg_elements.push(detected_shape.svg);
            } else {
                svg_elements.push(svg_path(
                    &path_data,
                    cluster.residue_color(),
                    offset,
                    options.scale_percent,
                ));
            }
        }
    }

    let target_width = scaled_dimension(width, options.scale_percent)?;
    let target_height = scaled_dimension(height, options.scale_percent)?;

    Ok(ConversionResult {
        shape_statistics,
        svg: format!(
            "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"{target_width}\" height=\"{target_height}\" viewBox=\"0 0 {target_width} {target_height}\">{}</svg>",
            svg_elements.join("")
        ),
    })
}

#[derive(Clone, Copy)]
struct ShapeCandidate<'a> {
    area: usize,
    cluster_color: Color,
    indices: &'a [u32],
    pixels: &'a [u8],
    rect: BoundingRect,
    scale_percent: u16,
}

struct DetectedShape {
    kind: NativeShapeKind,
    svg: String,
}

fn detect_native_shape(
    candidate: ShapeCandidate<'_>,
    options: ShapeDetectionOptions,
) -> Option<DetectedShape> {
    if !options.enabled() {
        return None;
    }

    NativeShapeKind::ORDERED
        .into_iter()
        .filter(|shape| options.types().is_enabled(*shape))
        .find_map(|shape| detect_shape(shape, candidate))
}

fn detect_shape(shape: NativeShapeKind, candidate: ShapeCandidate<'_>) -> Option<DetectedShape> {
    match shape {
        NativeShapeKind::Circle => detect_circle(candidate),
        NativeShapeKind::Rectangle => detect_rectangle(candidate),
        NativeShapeKind::Ellipse | NativeShapeKind::Line | NativeShapeKind::Polygon => None,
    }
}

fn detect_rectangle(candidate: ShapeCandidate<'_>) -> Option<DetectedShape> {
    let width = f64::from(candidate.rect.width());
    let height = f64::from(candidate.rect.height());
    if width < MINIMUM_NATIVE_SHAPE_SPAN_PIXELS || height < MINIMUM_NATIVE_SHAPE_SPAN_PIXELS {
        return None;
    }

    let expected_area = width * height;
    let area_error = (candidate.area as f64 - expected_area).abs() / expected_area;
    let aspect_ratio = width.min(height) / width.max(height);
    // Thin filled clusters remain available for the dedicated line detector instead of becoming rectangles.
    if area_error > MAXIMUM_RECTANGLE_AREA_ERROR || aspect_ratio < MINIMUM_RECTANGLE_ASPECT_RATIO {
        return None;
    }

    Some(DetectedShape {
        kind: NativeShapeKind::Rectangle,
        svg: svg_rectangle(
            f64::from(candidate.rect.left),
            f64::from(candidate.rect.top),
            width,
            height,
            dominant_color(candidate),
            candidate.scale_percent,
        ),
    })
}

fn detect_circle(candidate: ShapeCandidate<'_>) -> Option<DetectedShape> {
    let width = f64::from(candidate.rect.width());
    let height = f64::from(candidate.rect.height());
    if width < MINIMUM_NATIVE_SHAPE_SPAN_PIXELS || height < MINIMUM_NATIVE_SHAPE_SPAN_PIXELS {
        return None;
    }

    let aspect_error = (width - height).abs() / width.max(height);
    let expected_area = PI * width * height / 4.0;
    let area_error = (candidate.area as f64 - expected_area).abs() / expected_area;
    // Tight independent bounds favor the lossless path fallback over false native geometry.
    if aspect_error > MAXIMUM_CIRCLE_ASPECT_ERROR || area_error > MAXIMUM_CIRCLE_AREA_ERROR {
        return None;
    }

    let center_x = (f64::from(candidate.rect.left) + f64::from(candidate.rect.right)) / 2.0;
    let center_y = (f64::from(candidate.rect.top) + f64::from(candidate.rect.bottom)) / 2.0;
    let radius = (width + height) / 4.0;
    Some(DetectedShape {
        kind: NativeShapeKind::Circle,
        svg: svg_circle(
            center_x,
            center_y,
            radius,
            dominant_color(candidate),
            candidate.scale_percent,
        ),
    })
}

fn dominant_color(candidate: ShapeCandidate<'_>) -> Color {
    let mut counts = BTreeMap::<[u8; 4], usize>::new();
    for &pixel_index in candidate.indices {
        let start = pixel_index as usize * 4;
        if let Some(pixel) = candidate.pixels.get(start..start + 4) {
            let rgba = [pixel[0], pixel[1], pixel[2], pixel[3]];
            *counts.entry(rgba).or_default() += 1;
        }
    }

    counts
        .into_iter()
        .max_by_key(|(_, count)| *count)
        .map(|(rgba, _)| Color::new_rgba(rgba[0], rgba[1], rgba[2], rgba[3]))
        .unwrap_or(candidate.cluster_color)
}

fn svg_circle(
    center_x: f64,
    center_y: f64,
    radius: f64,
    color: Color,
    scale_percent: u16,
) -> String {
    let opacity = shape_opacity(color);
    let transform = shape_scale_transform(scale_percent);
    format!(
        "<circle cx=\"{}\" cy=\"{}\" r=\"{}\" fill=\"{}\"{opacity}{transform}/>",
        format_svg_number(center_x),
        format_svg_number(center_y),
        format_svg_number(radius),
        color.to_hex_string()
    )
}

fn svg_rectangle(
    x: f64,
    y: f64,
    width: f64,
    height: f64,
    color: Color,
    scale_percent: u16,
) -> String {
    let opacity = shape_opacity(color);
    let transform = shape_scale_transform(scale_percent);
    format!(
        "<rect x=\"{}\" y=\"{}\" width=\"{}\" height=\"{}\" fill=\"{}\"{opacity}{transform}/>",
        format_svg_number(x),
        format_svg_number(y),
        format_svg_number(width),
        format_svg_number(height),
        color.to_hex_string()
    )
}

fn shape_opacity(color: Color) -> String {
    if color.a < 255 {
        format!(" fill-opacity=\"{}\"", format_opacity(color.a))
    } else {
        String::new()
    }
}

fn shape_scale_transform(scale_percent: u16) -> String {
    if scale_percent == 100 {
        String::new()
    } else {
        format!(" transform=\"scale({})\"", scale_factor(scale_percent))
    }
}

fn format_svg_number(value: f64) -> String {
    let formatted = format!("{value:.2}");
    formatted
        .trim_end_matches('0')
        .trim_end_matches('.')
        .to_owned()
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

fn scale_factor(scale_percent: u16) -> String {
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

fn format_opacity(alpha: u8) -> String {
    let formatted = format!("{:.3}", f64::from(alpha) / 255.0);
    formatted
        .trim_end_matches('0')
        .trim_end_matches('.')
        .to_owned()
}
