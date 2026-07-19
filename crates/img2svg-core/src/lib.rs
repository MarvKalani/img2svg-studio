//! Deterministic browser-independent raster-to-SVG core.

use std::error::Error;
use std::f64::consts::PI;
use std::fmt;

use visioncortex::color_clusters::{HIERARCHICAL_MAX, KeyingAction, Runner, RunnerConfig};
use visioncortex::{Color, ColorImage, PathSimplifyMode, PointF64};

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

#[derive(Debug, PartialEq, Eq)]
pub enum ConversionError {
    InvalidDimensions,
    PixelLength { actual: usize, expected: usize },
    TransparentKeyUnavailable,
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
        }
    }
}

impl Error for ConversionError {}

pub fn convert_rgba(pixels: &[u8], width: usize, height: usize) -> Result<String, ConversionError> {
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
    let clusters = Runner::new(
        RunnerConfig {
            batch_size: 25_600,
            deepen_diff: 16,
            diagonal: false,
            good_max_area: width * height,
            good_min_area: 16,
            hierarchical: HIERARCHICAL_MAX,
            hollow_neighbours: 1,
            is_same_color_a: 2,
            is_same_color_b: 1,
            key_color,
            keying_action,
        },
        image,
    )
    .run();

    let view = clusters.view();
    let mut paths = Vec::with_capacity(clusters.output_len());
    for &cluster_index in view.clusters_output.iter().rev() {
        let cluster = view.get_cluster(cluster_index);
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
            paths.push(svg_path(&path_data, cluster.residue_color(), offset));
        }
    }

    Ok(format!(
        "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"{width}\" height=\"{height}\" viewBox=\"0 0 {width} {height}\">{}</svg>",
        paths.join("")
    ))
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

fn svg_path(path_data: &str, color: Color, offset: PointF64) -> String {
    let opacity = if color.a < 255 {
        format!(" fill-opacity=\"{}\"", format_opacity(color.a))
    } else {
        String::new()
    };
    format!(
        "<path d=\"{path_data}\" fill=\"{}\"{opacity} transform=\"translate({},{})\"/>",
        color.to_hex_string(),
        offset.x,
        offset.y
    )
}

fn format_opacity(alpha: u8) -> String {
    let formatted = format!("{:.3}", f64::from(alpha) / 255.0);
    formatted
        .trim_end_matches('0')
        .trim_end_matches('.')
        .to_owned()
}
