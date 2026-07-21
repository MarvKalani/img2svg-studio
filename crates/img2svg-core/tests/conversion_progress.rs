use img2svg_core::{
    ConversionOptions, ConversionProgress, ConversionProgressPhase,
    convert_rgba_with_options_and_progress,
};

#[test]
fn given_a_conversion_when_progress_is_observed_then_native_phases_are_bounded_and_complete() {
    let size = 64;
    let pixels = (0..size * size)
        .flat_map(|index| {
            let x = index % size;
            let y = index / size;
            if x < size / 2 && y < size / 2 {
                [14, 165, 233, 255]
            } else {
                [118, 77, 216, 255]
            }
        })
        .collect::<Vec<_>>();
    let mut events = Vec::new();

    let result = convert_rgba_with_options_and_progress(
        &pixels,
        size,
        size,
        ConversionOptions::default(),
        |progress| events.push(progress),
    )
    .expect("progress conversion should succeed");

    assert!(!result.svg().is_empty());
    assert_phase_is_monotone(&events, ConversionProgressPhase::Clustering);
    assert_phase_is_monotone(&events, ConversionProgressPhase::Tracing);
    let tracing = events
        .iter()
        .filter(|event| event.phase() == ConversionProgressPhase::Tracing)
        .collect::<Vec<_>>();
    assert_eq!(tracing.first().map(|event| event.completed()), Some(0));
    assert_eq!(
        tracing.last().map(|event| event.completed()),
        tracing.last().map(|event| event.total())
    );
    assert!(tracing.last().is_some_and(|event| event.total() > 0));
    let output_elements = ["path", "circle", "rect", "ellipse", "line", "polygon"]
        .into_iter()
        .map(|element| result.svg().matches(&format!("<{element} ")).count())
        .sum::<usize>();
    assert_eq!(
        tracing.last().map(|event| event.total()),
        Some(output_elements)
    );
}

#[test]
fn given_cutout_layering_when_progress_is_observed_then_the_second_clustering_phase_is_explicit() {
    let pixels = [[14, 165, 233, 255], [118, 77, 216, 255]]
        .into_iter()
        .cycle()
        .take(64 * 64)
        .flatten()
        .collect::<Vec<_>>();
    let options = ConversionOptions::default()
        .try_with_tracing_options(1, 2, 16, 60, 40, 10, 45)
        .expect("cutout options should be valid");
    let mut events = Vec::new();

    convert_rgba_with_options_and_progress(&pixels, 64, 64, options, |progress| {
        events.push(progress);
    })
    .expect("cutout conversion should succeed");

    assert_phase_is_monotone(&events, ConversionProgressPhase::CutoutClustering);
}

fn assert_phase_is_monotone(events: &[ConversionProgress], phase: ConversionProgressPhase) {
    let matching = events
        .iter()
        .filter(|event| event.phase() == phase)
        .collect::<Vec<_>>();
    assert!(!matching.is_empty());
    assert!(
        matching
            .iter()
            .all(|event| event.completed() <= event.total())
    );
    assert!(
        matching
            .windows(2)
            .all(|pair| pair[0].completed() <= pair[1].completed())
    );
    assert_eq!(
        matching.last().map(|event| event.completed()),
        matching.last().map(|event| event.total())
    );
}
