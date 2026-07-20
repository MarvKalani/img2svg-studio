# OpenAI Build Week submission

Last reviewed: 20 July 2026

The submission closes on **21 July 2026 at 5:00 PM Pacific Time**, which is **22 July
2026 at 02:00 CEST**. Devpost does not allow content changes after the deadline.

Official references:

- [OpenAI Build Week](https://openai.com/build-week/)
- [Devpost challenge](https://openai.devpost.com/)
- [Official rules](https://openai.devpost.com/rules)
- [Submission FAQ](https://openai.devpost.com/details/faqs)

## Submission identity

| Field | Value |
| --- | --- |
| Project | img2svg Studio |
| Tagline | A local-first raster-to-SVG lab that turns tuning into reproducible evidence. |
| Track | Developer Tools |
| Devpost participation | Registered on 20 July 2026 |
| Demo | [studio.img2.download](https://studio.img2.download) — live |
| Repository | [github.com/MarvKalani/img2svg-studio](https://github.com/MarvKalani/img2svg-studio) — public |
| Video | owner must provide public YouTube URL |
| Codex `/feedback` Session ID | owner must generate from this primary build task |
| License | [Business Source License 1.1](../LICENSE.md), changing to Apache-2.0 by 20 July 2030 |

## Ready-to-paste Devpost description

### Inspiration

Raster-to-vector conversion is usually a black box. You change a setting, lose the previous
result, and judge quality from memory. We wanted a converter that behaves like a small visual lab:
every experiment is reproducible, its parameters are visible, and humans and browser agents can
operate the same product without sending private source images to a server.

### What it does

img2svg Studio loads PNG, JPEG and WebP images locally and converts them into deterministic SVG in
the browser. Each conversion becomes an immutable run in a visual history. Users can assign two
runs to A and B, move a layer-aligned comparison slider, inspect only the parameters that differ,
restore old settings, and download the exact SVG associated with either run.

The same static build is installable as a PWA. Supported systems can share an image directly into
img2svg or open PNG, JPEG and WebP files with it; those entries still use the normal local decoder.
The glossy candy app icon is itself a dogfooding artifact: we created a raster source, converted it
with img2svg's own WASM tracer, and rendered the install sizes from that SVG.

The Rust/WebAssembly engine traces arbitrary contours and can emit native circles, rectangles,
ellipses, lines and triangles when geometric evidence is strong. Ambiguous content safely remains
an SVG path.

Two optional AI workflows also stay local. MODNet removes a background, and SlimSAM Smart Select
refines a mask from positive and negative points. Models download only after an explicit action,
their files are checked by size and SHA-256, and they can be cancelled, retried and unloaded. An
applied AI result becomes a versioned conversion input while the original remains restorable.

Chrome's WebMCP imperative API exposes fourteen narrow tools for workspace inspection, parameter
changes, conversion, history, A/B selection, downloads and model actions. Those tools call the same
typed controllers as the visible UI, so agent actions remain visible and manual operation still
works when WebMCP is unavailable.

### How we built it

The static UI uses TypeScript 7 and Vite. Conversion runs in a Web Worker, crosses a small WASM
boundary, and executes in a Rust core built on the `visioncortex` tracing foundation used by
VTracer. MODNet and SlimSAM run through Transformers.js with WebGPU and a MODNet WASM fallback.
The submitted browser Studio has no backend, image upload, account or telemetry path. Its optional
ChatGPT companion is a separate stateless integration and is not needed for the public demo.

We built the Studio during OpenAI Build Week with Codex and GPT-5.6 Sol. Each feature was delivered
as a vertical test-driven slice: an executable Given–When–Then contract, the smallest coherent
implementation, direct browser review, documentation and a focused commit. Codex connected work
that normally spans product, design, frontend, Rust, model integration and QA: it turned the UI
mockup into the product, designed typed boundaries, generated geometric ground truth, audited
dormant shape algorithms, integrated real model lifecycles, tracked the evolving WebMCP API and
ran deterministic, accessibility and privacy audits.

### Challenges

Reliable native shape recognition was harder than merely calling existing algorithms. We measured
the dormant `visioncortex` shape helpers against positive and negative fixtures and retained only
the behavior that improved real output. The same evidence-first approach prevented hollow rings,
triangles and rectangles from being misclassified.

Browser model lifecycle was the second hard boundary: large downloads, cache corruption,
cancellation, inference already in flight and GPU resource disposal all had to produce one simple
user-facing state machine. WebMCP also changed during the build from the older navigator surface to
`document.modelContext`, so the adapter is deliberately small and feature-detected.

### Accomplishments

- A complete local conversion → history → A/B → export workflow.
- Deterministic Rust/WASM output with structural ground-truth tests.
- Two real, unloadable in-browser AI workflows rather than simulated model cards.
- One visible application-service layer shared by UI and WebMCP.
- An installable image share/file-open path with an app icon made through our own converter.
- Zero Axe violations in the audited core path and no cross-origin conversion traffic.
- A reproducible production-demo test that runs against local preview or the public URL.

### What we learned

“Local-first” is more than avoiding an upload endpoint: model URLs, caches, object-URL ownership,
workers and agent tools all need explicit boundaries. We also learned that a trustworthy SVG tool
benefits more from observable experiments and safe fallbacks than from promising perfect automatic
recognition.

### What's next

After Build Week, we want to persist workspaces locally, add more measurable output-quality metrics
and use the same shared-controller pattern to extend agent-assisted batch experimentation.

## Judge path

No account or paid access is required.

1. Open `https://studio.img2.download` in Google Chrome 150 or newer.
2. Choose **Logo-Demo laden** to open the bundled faceted owner logo and its measured local profile.
3. Choose **Convert**; the 1280×876 source is prepared to 842×576 and a strict facet becomes a
   native polygon while ambiguous facets remain paths.
4. Change **Raster size** to 720 px and **Color precision** to 5, then convert again.
5. Assign Run 1 to A and Run 2 to B, then inspect the two differing parameters.
6. Download SVG B.
7. Optional: load MODNet or SlimSAM from the AI Manager. This intentionally downloads a pinned
   model artifact; normal conversion itself remains offline.
8. Optional: install the PWA and use the operating system's share or file-open entry for an image.

Local fallback:

```bash
npm ci
npm --prefix web run test:demo
```

## Devpost Hackathons Plugin

The optional Devpost Hackathons Plugin is a submission assistant inside Codex, not a dependency of
img2svg Studio and not an Apps SDK deployment target. It provides Build Week context and these
useful finalization commands:

- `$prepare-submission` audits security, eligibility and required submission material.
- `$submit` fills and sends the Devpost submission.

We use it for the final audit and form workflow after demo, repository, video and `/feedback`
Session ID are ready. The official rules and Hackathon website remain authoritative if the plugin
differs. Plugin use is optional and provides no judging advantage.

## Pre-existing work disclosure

`img2.download` is a separate pre-existing converter owned by the project author. The new
img2svg Studio application, Rust/WASM engine, history and A/B workflow, in-browser AI workflows,
tests and documentation in this repository were built during the submission period with Codex and
GPT-5.6. The `integrations/img2-download/` directory is a small new WebMCP adapter prepared for the
older product and is clearly separated from the Studio.

The dated Git history and the primary Codex build task provide the implementation record required
for an existing-project disclosure.

## Final checklist

### Product and evidence

- [x] Production build succeeds.
- [x] A fresh detached checkout passes `npm ci`, `npm run check` and the production-demo test.
- [x] Local production-preview judge path passes in Google Chrome.
- [x] Accessibility, damaged/oversized input and network audits pass automatically.
- [x] Third-party code and model inventory exists.
- [x] Public-repository preflight finds no tracked credentials, local paths or build caches.
- [x] Direct manual Chrome acceptance is recorded for every completed product slice.
- [x] Public demo passes `IMG2SVG_DEMO_BASE_URL=https://studio.img2.download npm --prefix web run test:demo`.

### Owner actions

Use the [timed English demo script](release/DEMO_SCRIPT.md) for the recording and final take check.

- [x] Join the OpenAI Build Week event on Devpost and confirm eligibility.
- [ ] Confirm the Developer Tools track.
- [x] Adopt BSL 1.1 with an Apache-2.0 change license and publish the Symbiosis Pact.
- [x] Create the public GitHub repository and push `main`.
- [x] Connect the repository to Cloudflare Pages and attach `studio.img2.download`.
- [ ] Generate the `/feedback` Session ID from this primary Codex build task.
- [ ] Record the English demo, keep it below three minutes and publish it publicly on YouTube.
- [ ] Paste the final links into Devpost and submit before the deadline.
- [ ] Open demo, repository and YouTube links in a signed-out browser after submission.

If the repository is private, it must be shared with `testing@devpost.com` and
`build-week-event@openai.com`; a public repository with an explicit license is the recommended,
lower-friction judge path.
