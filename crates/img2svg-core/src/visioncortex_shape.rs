use visioncortex::{BinaryImage, BoundingRect, Shape};

pub(crate) fn confirms_circle_occupancy(
    indices: &[u32],
    rect: BoundingRect,
    source_width: usize,
) -> bool {
    let Ok(width) = usize::try_from(rect.width()) else {
        return false;
    };
    let Ok(height) = usize::try_from(rect.height()) else {
        return false;
    };
    let Ok(left) = usize::try_from(rect.left) else {
        return false;
    };
    let Ok(top) = usize::try_from(rect.top) else {
        return false;
    };
    if width == 0 || height == 0 || source_width == 0 {
        return false;
    }

    let mut image = BinaryImage::new_w_h(width, height);
    for &index in indices {
        let index = index as usize;
        let Some(x) = (index % source_width).checked_sub(left) else {
            return false;
        };
        let Some(y) = (index / source_width).checked_sub(top) else {
            return false;
        };
        if x >= width || y >= height {
            return false;
        }
        image.set_pixel(x, y, true);
    }

    Shape::from(image).is_circle()
}
