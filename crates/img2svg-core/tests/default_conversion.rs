use img2svg_core::convert_rgba;

const IMAGE_SIZE: usize = 256;

#[test]
fn given_circle_rgba_when_converted_then_svg_is_valid_deterministic_and_transparent() {
    let pixels = circle_fixture_rgba();

    let first_svg = convert_rgba(&pixels, IMAGE_SIZE, IMAGE_SIZE).expect("circle should convert");
    let second_svg =
        convert_rgba(&pixels, IMAGE_SIZE, IMAGE_SIZE).expect("circle should convert twice");

    assert!(first_svg.starts_with("<svg xmlns=\"http://www.w3.org/2000/svg\""));
    assert!(first_svg.contains("viewBox=\"0 0 256 256\""));
    assert!(first_svg.contains("<path "));
    assert!(!first_svg.contains("fill-opacity=\"0\""));
    assert_eq!(first_svg, second_svg);
}

fn circle_fixture_rgba() -> Vec<u8> {
    let mut pixels = vec![0_u8; IMAGE_SIZE * IMAGE_SIZE * 4];
    let center = 128_i32;
    let radius_squared = 64_i32.pow(2);

    for y in 0..IMAGE_SIZE {
        for x in 0..IMAGE_SIZE {
            let distance_x = x as i32 - center;
            let distance_y = y as i32 - center;
            if distance_x.pow(2) + distance_y.pow(2) <= radius_squared {
                let pixel_start = (y * IMAGE_SIZE + x) * 4;
                pixels[pixel_start..pixel_start + 4].copy_from_slice(&[14, 165, 233, 255]);
            }
        }
    }

    pixels
}
