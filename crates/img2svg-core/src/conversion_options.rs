use std::fmt;

use crate::shape_detection::ShapeDetectionOptions;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum ConversionOptionError {
    ColorPrecision,
    CornerThreshold,
    CurveFittingMode,
    FilterSpeckle,
    HierarchicalMode,
    LayerDifference,
    LengthThreshold,
    MaxIterations,
    PathPrecision,
    ScalePercent,
    SpliceThreshold,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum CurveFittingMode {
    Pixel,
    Polygon,
    Spline,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum HierarchicalMode {
    Cutout,
    Stacked,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct ConversionOptions {
    color_precision: u8,
    corner_threshold_degrees: u8,
    curve_fitting_mode: CurveFittingMode,
    filter_speckle: u16,
    hierarchical_mode: HierarchicalMode,
    layer_difference: u8,
    length_threshold_tenths: u8,
    max_iterations: u8,
    path_precision: u8,
    scale_percent: u16,
    shape_detection: ShapeDetectionOptions,
    splice_threshold_degrees: u8,
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
            corner_threshold_degrees: 60,
            curve_fitting_mode: CurveFittingMode::Spline,
            filter_speckle: u16::try_from(filter_speckle)
                .map_err(|_| ConversionOptionError::FilterSpeckle)?,
            hierarchical_mode: HierarchicalMode::Stacked,
            layer_difference: 16,
            length_threshold_tenths: 40,
            max_iterations: 10,
            path_precision: 2,
            scale_percent: u16::try_from(scale_percent)
                .map_err(|_| ConversionOptionError::ScalePercent)?,
            shape_detection: ShapeDetectionOptions::default(),
            splice_threshold_degrees: 45,
        })
    }

    pub const fn color_precision(self) -> u8 {
        self.color_precision
    }

    pub const fn filter_speckle(self) -> u16 {
        self.filter_speckle
    }

    pub const fn corner_threshold_degrees(self) -> u8 {
        self.corner_threshold_degrees
    }

    pub const fn curve_fitting_mode(self) -> CurveFittingMode {
        self.curve_fitting_mode
    }

    pub const fn hierarchical_mode(self) -> HierarchicalMode {
        self.hierarchical_mode
    }

    pub const fn layer_difference(self) -> u8 {
        self.layer_difference
    }

    pub const fn length_threshold_tenths(self) -> u8 {
        self.length_threshold_tenths
    }

    pub const fn max_iterations(self) -> u8 {
        self.max_iterations
    }

    pub const fn path_precision(self) -> u8 {
        self.path_precision
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

    #[allow(clippy::too_many_arguments)]
    pub fn try_with_tracing_options(
        mut self,
        hierarchical_mode: u32,
        curve_fitting_mode: u32,
        layer_difference: u32,
        corner_threshold_degrees: u32,
        length_threshold_tenths: u32,
        max_iterations: u32,
        splice_threshold_degrees: u32,
    ) -> Result<Self, ConversionOptionError> {
        self.hierarchical_mode = match hierarchical_mode {
            0 => HierarchicalMode::Stacked,
            1 => HierarchicalMode::Cutout,
            _ => return Err(ConversionOptionError::HierarchicalMode),
        };
        self.curve_fitting_mode = match curve_fitting_mode {
            0 => CurveFittingMode::Pixel,
            1 => CurveFittingMode::Polygon,
            2 => CurveFittingMode::Spline,
            _ => return Err(ConversionOptionError::CurveFittingMode),
        };
        if layer_difference > 255 {
            return Err(ConversionOptionError::LayerDifference);
        }
        if corner_threshold_degrees > 180 {
            return Err(ConversionOptionError::CornerThreshold);
        }
        if !(35..=100).contains(&length_threshold_tenths) {
            return Err(ConversionOptionError::LengthThreshold);
        }
        if !(1..=20).contains(&max_iterations) {
            return Err(ConversionOptionError::MaxIterations);
        }
        if splice_threshold_degrees > 180 {
            return Err(ConversionOptionError::SpliceThreshold);
        }
        self.layer_difference = layer_difference as u8;
        self.corner_threshold_degrees = corner_threshold_degrees as u8;
        self.length_threshold_tenths = length_threshold_tenths as u8;
        self.max_iterations = max_iterations as u8;
        self.splice_threshold_degrees = splice_threshold_degrees as u8;
        Ok(self)
    }

    pub const fn splice_threshold_degrees(self) -> u8 {
        self.splice_threshold_degrees
    }

    pub fn try_with_path_precision(
        mut self,
        path_precision: u32,
    ) -> Result<Self, ConversionOptionError> {
        if path_precision > 4 {
            return Err(ConversionOptionError::PathPrecision);
        }
        self.path_precision =
            u8::try_from(path_precision).map_err(|_| ConversionOptionError::PathPrecision)?;
        Ok(self)
    }
}

impl Default for ConversionOptions {
    fn default() -> Self {
        Self {
            color_precision: 6,
            corner_threshold_degrees: 60,
            curve_fitting_mode: CurveFittingMode::Spline,
            filter_speckle: 4,
            hierarchical_mode: HierarchicalMode::Stacked,
            layer_difference: 16,
            length_threshold_tenths: 40,
            max_iterations: 10,
            path_precision: 2,
            scale_percent: 100,
            shape_detection: ShapeDetectionOptions::default(),
            splice_threshold_degrees: 45,
        }
    }
}

impl fmt::Display for ConversionOptionError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::ColorPrecision => formatter.write_str("color precision"),
            Self::CornerThreshold => formatter.write_str("corner threshold"),
            Self::CurveFittingMode => formatter.write_str("curve fitting mode"),
            Self::FilterSpeckle => formatter.write_str("speckle filter"),
            Self::HierarchicalMode => formatter.write_str("hierarchical mode"),
            Self::LayerDifference => formatter.write_str("layer difference"),
            Self::LengthThreshold => formatter.write_str("length threshold"),
            Self::MaxIterations => formatter.write_str("maximum iterations"),
            Self::PathPrecision => formatter.write_str("path precision"),
            Self::ScalePercent => formatter.write_str("scale percent"),
            Self::SpliceThreshold => formatter.write_str("splice threshold"),
        }
    }
}
