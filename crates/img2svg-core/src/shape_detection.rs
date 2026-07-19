use std::collections::{BTreeMap, BTreeSet};
use std::f64::consts::PI;

use visioncortex::{BoundingRect, Color};

use crate::visioncortex_shape::confirms_circle_occupancy;
use crate::{format_opacity, scale_factor};

const MINIMUM_NATIVE_SHAPE_SPAN_PIXELS: f64 = 4.0;
const MAXIMUM_CIRCLE_ASPECT_ERROR: f64 = 0.03;
const MAXIMUM_ELLIPTIC_AREA_ERROR: f64 = 0.08;
const MAXIMUM_ELLIPSE_OCCUPANCY_ERROR: f64 = 0.08;
const MAXIMUM_FILLED_BOX_AREA_ERROR: f64 = 0.02;
const MAXIMUM_POLYGON_AREA_ERROR: f64 = 0.08;
const MINIMUM_LINE_ASPECT_RATIO: f64 = 4.0;
const MINIMUM_RECTANGLE_ASPECT_RATIO: f64 = 0.1;
const POLYGON_SIMPLIFICATION_EPSILON: PolygonSimplificationEpsilon =
    PolygonSimplificationEpsilon::new(2.0);

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

    pub(crate) const fn assembly_order(self) -> u8 {
        match self {
            Self::Circle => 0,
            Self::Rectangle => 1,
            Self::Ellipse => 2,
            Self::Line => 3,
            Self::Polygon => 4,
        }
    }
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

    pub(crate) fn record(&mut self, shape: NativeShapeKind) {
        match shape {
            NativeShapeKind::Circle => self.circles += 1,
            NativeShapeKind::Rectangle => self.rectangles += 1,
            NativeShapeKind::Ellipse => self.ellipses += 1,
            NativeShapeKind::Line => self.lines += 1,
            NativeShapeKind::Polygon => self.polygons += 1,
        }
    }
}

#[derive(Clone, Copy)]
pub(crate) struct ShapeCandidate<'a> {
    pub(crate) area: usize,
    pub(crate) cluster_color: Color,
    pub(crate) indices: &'a [u32],
    pub(crate) pixels: &'a [u8],
    pub(crate) rect: BoundingRect,
    pub(crate) scale_percent: u16,
    pub(crate) source_width: usize,
}

pub(crate) struct DetectedShape {
    pub(crate) kind: NativeShapeKind,
    pub(crate) svg: String,
}

#[derive(Clone, Copy)]
struct PolygonSimplificationEpsilon(f64);

impl PolygonSimplificationEpsilon {
    const fn new(pixels: f64) -> Self {
        Self(pixels)
    }

    fn accepts(self, deviation_pixels: f64) -> bool {
        deviation_pixels <= self.0
    }
}

pub(crate) fn detect_native_shape(
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
        NativeShapeKind::Ellipse => detect_ellipse(candidate),
        NativeShapeKind::Line => detect_line(candidate),
        NativeShapeKind::Polygon => detect_polygon(candidate),
    }
}

fn detect_rectangle(candidate: ShapeCandidate<'_>) -> Option<DetectedShape> {
    let width = f64::from(candidate.rect.width());
    let height = f64::from(candidate.rect.height());
    if width < MINIMUM_NATIVE_SHAPE_SPAN_PIXELS || height < MINIMUM_NATIVE_SHAPE_SPAN_PIXELS {
        return None;
    }

    let expected_area = width * height;
    let area_error = relative_area_error(candidate.area, expected_area);
    let aspect_ratio = width.min(height) / width.max(height);
    // Thin filled clusters remain available for the dedicated line detector instead of becoming rectangles.
    if area_error > MAXIMUM_FILLED_BOX_AREA_ERROR || aspect_ratio < MINIMUM_RECTANGLE_ASPECT_RATIO {
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

fn detect_line(candidate: ShapeCandidate<'_>) -> Option<DetectedShape> {
    let width = f64::from(candidate.rect.width());
    let height = f64::from(candidate.rect.height());
    if width < MINIMUM_NATIVE_SHAPE_SPAN_PIXELS || height < MINIMUM_NATIVE_SHAPE_SPAN_PIXELS {
        return None;
    }

    let aspect_ratio = width.max(height) / width.min(height);
    let expected_area = width * height;
    if aspect_ratio < MINIMUM_LINE_ASPECT_RATIO
        || relative_area_error(candidate.area, expected_area) > MAXIMUM_FILLED_BOX_AREA_ERROR
    {
        return None;
    }

    let left = f64::from(candidate.rect.left);
    let top = f64::from(candidate.rect.top);
    let right = f64::from(candidate.rect.right);
    let bottom = f64::from(candidate.rect.bottom);
    let (start_x, start_y, end_x, end_y, stroke_width) = if width > height {
        (left, top + height / 2.0, right, top + height / 2.0, height)
    } else {
        (left + width / 2.0, top, left + width / 2.0, bottom, width)
    };

    Some(DetectedShape {
        kind: NativeShapeKind::Line,
        svg: svg_line(
            start_x,
            start_y,
            end_x,
            end_y,
            stroke_width,
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
    let area_error = relative_area_error(candidate.area, expected_area);
    // Tight independent bounds favor the lossless path fallback over false native geometry.
    if aspect_error > MAXIMUM_CIRCLE_ASPECT_ERROR
        || area_error > MAXIMUM_ELLIPTIC_AREA_ERROR
        || !confirms_circle_occupancy(candidate.indices, candidate.rect, candidate.source_width)
    {
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

fn detect_ellipse(candidate: ShapeCandidate<'_>) -> Option<DetectedShape> {
    let width = f64::from(candidate.rect.width());
    let height = f64::from(candidate.rect.height());
    if width < MINIMUM_NATIVE_SHAPE_SPAN_PIXELS || height < MINIMUM_NATIVE_SHAPE_SPAN_PIXELS {
        return None;
    }

    let aspect_error = (width - height).abs() / width.max(height);
    let expected_area = PI * width * height / 4.0;
    if aspect_error <= MAXIMUM_CIRCLE_ASPECT_ERROR
        || relative_area_error(candidate.area, expected_area) > MAXIMUM_ELLIPTIC_AREA_ERROR
        || ellipse_occupancy_error(candidate, width, height) > MAXIMUM_ELLIPSE_OCCUPANCY_ERROR
    {
        return None;
    }

    Some(DetectedShape {
        kind: NativeShapeKind::Ellipse,
        svg: svg_ellipse(
            (f64::from(candidate.rect.left) + f64::from(candidate.rect.right)) / 2.0,
            (f64::from(candidate.rect.top) + f64::from(candidate.rect.bottom)) / 2.0,
            width / 2.0,
            height / 2.0,
            dominant_color(candidate),
            candidate.scale_percent,
        ),
    })
}

fn detect_polygon(candidate: ShapeCandidate<'_>) -> Option<DetectedShape> {
    let points = triangle_points(candidate, POLYGON_SIMPLIFICATION_EPSILON)?;
    Some(DetectedShape {
        kind: NativeShapeKind::Polygon,
        svg: svg_polygon(&points, dominant_color(candidate), candidate.scale_percent),
    })
}

fn triangle_points(
    candidate: ShapeCandidate<'_>,
    epsilon: PolygonSimplificationEpsilon,
) -> Option<[[f64; 2]; 3]> {
    let row_count = usize::try_from(candidate.rect.height()).ok()?;
    let mut row_spans = vec![None::<(usize, usize)>; row_count];
    for &pixel_index in candidate.indices {
        let pixel_index = pixel_index as usize;
        let x = pixel_index % candidate.source_width;
        let y = pixel_index / candidate.source_width;
        let row = y.checked_sub(candidate.rect.top as usize)?;
        let span = row_spans.get_mut(row)?;
        *span = Some(match *span {
            Some((minimum_x, maximum_x)) => (minimum_x.min(x), maximum_x.max(x)),
            None => (x, x),
        });
    }
    let spans = row_spans.into_iter().collect::<Option<Vec<_>>>()?;
    let &(top_left, top_right) = spans.first()?;
    let &(bottom_left, bottom_right_inclusive) = spans.last()?;
    let top_x = (top_left + top_right) as f64 / 2.0;
    let top_y = f64::from(candidate.rect.top);
    let bottom_y = f64::from(candidate.rect.bottom - 1);
    let bottom_left = bottom_left as f64;
    let bottom_right = (bottom_right_inclusive + 1) as f64;
    let triangle_height = bottom_y - top_y;
    let triangle_base = bottom_right - bottom_left;
    if triangle_height < MINIMUM_NATIVE_SHAPE_SPAN_PIXELS
        || triangle_base < MINIMUM_NATIVE_SHAPE_SPAN_PIXELS
        || !(bottom_left < top_x && top_x < bottom_right)
        || relative_area_error(candidate.area, triangle_base * triangle_height / 2.0)
            > MAXIMUM_POLYGON_AREA_ERROR
    {
        return None;
    }

    for (row, (actual_left, actual_right_inclusive)) in spans.into_iter().enumerate() {
        let progress = row as f64 / triangle_height;
        let expected_left = top_x + (bottom_left - top_x) * progress;
        let expected_right = top_x + (bottom_right - top_x) * progress;
        // Pixel centers keep the typed edge tolerance symmetric at both raster boundaries.
        let actual_left = actual_left as f64 + 0.5;
        let actual_right = actual_right_inclusive as f64 + 0.5;
        if !epsilon.accepts((actual_left - expected_left).abs())
            || !epsilon.accepts((actual_right - expected_right).abs())
        {
            return None;
        }
    }

    Some([
        [top_x, top_y],
        [bottom_right, bottom_y],
        [bottom_left, bottom_y],
    ])
}

fn ellipse_occupancy_error(candidate: ShapeCandidate<'_>, width: f64, height: f64) -> f64 {
    let actual_pixels = candidate
        .indices
        .iter()
        .map(|index| *index as usize)
        .collect::<BTreeSet<_>>();
    let center_x = f64::from(candidate.rect.left) + width / 2.0;
    let center_y = f64::from(candidate.rect.top) + height / 2.0;
    let radius_x = width / 2.0;
    let radius_y = height / 2.0;
    let mut expected_pixel_count = 0_usize;
    let mut mismatched_pixel_count = 0_usize;

    for y in candidate.rect.top..candidate.rect.bottom {
        for x in candidate.rect.left..candidate.rect.right {
            let normalized_x = (f64::from(x) + 0.5 - center_x) / radius_x;
            let normalized_y = (f64::from(y) + 0.5 - center_y) / radius_y;
            let expected = normalized_x * normalized_x + normalized_y * normalized_y <= 1.0;
            let pixel_index = y as usize * candidate.source_width + x as usize;
            let actual = actual_pixels.contains(&pixel_index);
            expected_pixel_count += usize::from(expected);
            mismatched_pixel_count += usize::from(expected != actual);
        }
    }

    // Comparing occupancy rejects jagged clusters that happen to share only area and bounds.
    mismatched_pixel_count as f64 / expected_pixel_count.max(1) as f64
}

fn relative_area_error(actual_area: usize, expected_area: f64) -> f64 {
    (actual_area as f64 - expected_area).abs() / expected_area
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
    let opacity = fill_opacity(color);
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
    let opacity = fill_opacity(color);
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

fn svg_ellipse(
    center_x: f64,
    center_y: f64,
    radius_x: f64,
    radius_y: f64,
    color: Color,
    scale_percent: u16,
) -> String {
    let opacity = fill_opacity(color);
    let transform = shape_scale_transform(scale_percent);
    format!(
        "<ellipse cx=\"{}\" cy=\"{}\" rx=\"{}\" ry=\"{}\" fill=\"{}\"{opacity}{transform}/>",
        format_svg_number(center_x),
        format_svg_number(center_y),
        format_svg_number(radius_x),
        format_svg_number(radius_y),
        color.to_hex_string()
    )
}

fn svg_line(
    start_x: f64,
    start_y: f64,
    end_x: f64,
    end_y: f64,
    stroke_width: f64,
    color: Color,
    scale_percent: u16,
) -> String {
    let opacity = stroke_opacity(color);
    let transform = shape_scale_transform(scale_percent);
    format!(
        "<line x1=\"{}\" y1=\"{}\" x2=\"{}\" y2=\"{}\" stroke=\"{}\" stroke-width=\"{}\"{opacity}{transform}/>",
        format_svg_number(start_x),
        format_svg_number(start_y),
        format_svg_number(end_x),
        format_svg_number(end_y),
        color.to_hex_string(),
        format_svg_number(stroke_width)
    )
}

fn svg_polygon(points: &[[f64; 2]], color: Color, scale_percent: u16) -> String {
    let points = points
        .iter()
        .map(|[x, y]| format!("{},{}", format_svg_number(*x), format_svg_number(*y)))
        .collect::<Vec<_>>()
        .join(" ");
    let opacity = fill_opacity(color);
    let transform = shape_scale_transform(scale_percent);
    format!(
        "<polygon points=\"{points}\" fill=\"{}\"{opacity}{transform}/>",
        color.to_hex_string()
    )
}

fn fill_opacity(color: Color) -> String {
    if color.a < 255 {
        format!(" fill-opacity=\"{}\"", format_opacity(color.a))
    } else {
        String::new()
    }
}

fn stroke_opacity(color: Color) -> String {
    if color.a < 255 {
        format!(" stroke-opacity=\"{}\"", format_opacity(color.a))
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
