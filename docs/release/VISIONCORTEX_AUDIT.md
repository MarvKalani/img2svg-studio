# Visioncortex shape audit

Audit date: 19 July 2026

## Source and license

VTracer 0.6.5 uses Visioncortex for tracing but does not invoke its public `Shape` classifiers.
img2svg Studio already pins `visioncortex` 0.8.10 directly, so no VTracer fork or copied upstream
source is required. Visioncortex and VTracer are published under MIT OR Apache-2.0.

- [Pinned Visioncortex source](https://github.com/visioncortex/visioncortex/tree/ca6a3a59c32aab641f048a1d4510f2832bc19291)
- [Upstream Shape implementation](https://github.com/visioncortex/visioncortex/blob/ca6a3a59c32aab641f048a1d4510f2832bc19291/src/shape/geometry.rs)

## Ground-truth result

| Fixture | `is_circle` | `is_ellipse` | `is_quadrilateral` | `is_isosceles_triangle` |
| --- | ---: | ---: | ---: | ---: |
| Circle | yes | yes | no | no |
| Ellipse | no | yes | no | no |
| Rectangle | no | no | no | no |
| Triangle | no | no | yes | yes |

`Shape::is_circle()` adds useful pixel-occupancy evidence after the Studio's cheap aspect-ratio and
area checks. It rejects a hollow 32×32 ring whose total area is otherwise within 4.5% of a circle.
The runtime adapter therefore retains only this classifier.

`is_ellipse()` duplicates a stricter existing occupancy test. `is_quadrilateral()` rejects the
ideal rectangle and classifies the triangle as a quadrilateral. `is_isosceles_triangle()` finds
the fixture but provides no corner geometry required for SVG output. Those three methods remain
reference evidence and are not part of the product path.

The debug reference run classified all four fixtures through all four methods ten times in 0.66
seconds on Apple Silicon. The regression budget is a deliberately loose five seconds. The product
allocates a cropped `BinaryImage` only after a contour already passes the cheaper circle checks.

## Acceptance

- 13 Rust reference and ground-truth tests passed.
- Mixed conversion remained deterministic and emitted `circle`, `rect`, `line`, `polygon`.
- Direct Chrome 150 acceptance showed the same four elements and a clean console.
