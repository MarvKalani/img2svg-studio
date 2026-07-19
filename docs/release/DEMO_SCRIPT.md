# Demo video script

Target length: **2:35**. Spoken language: **English**. The final video must stay below three
minutes and be publicly visible on YouTube.

## Recording setup

- Record Chrome at 1920×1080 with browser zoom at 100%.
- Use the deployed `studio.img2.download` build and a clean profile.
- Keep `mixed.png` and `portrait.png` ready in the file picker.
- Cache MODNet before recording, then unload it so the load state remains visible without waiting
  for a full network download during the take.
- Close personal tabs, notifications and unrelated DevTools panels.
- Record voice and screen together; use no copyrighted music.

## Timed narration and shots

### 0:00–0:15 — Problem

**Screen:** Empty Studio workspace, then move toward **Choose image**.

**Voice:** “Raster-to-SVG conversion is usually a black box. Change a setting, lose the old
result, and guess whether the output improved. img2svg Studio turns that process into a local,
reproducible visual experiment.”

### 0:15–0:42 — First deterministic run

**Screen:** Load `mixed.png`, enable **Native shapes**, choose **Convert**, and point at the
circle, rectangle, line and triangle.

**Voice:** “The image stays in this browser. A Rust and WebAssembly engine traces arbitrary
content and emits native SVG geometry when the evidence is strong. This fixture becomes four real
SVG elements; ambiguous content would safely remain a path.”

### 0:42–1:15 — History and A/B evidence

**Screen:** Change **Color precision** to 5, convert again, assign Run 1 to A and Run 2 to B, move
the comparison slider and show the filtered difference table.

**Voice:** “Every conversion is an immutable run. I can make a second variant, assign both runs to
A and B, compare them on the same geometry, and see exactly which parameter changed. Each download
still contains the exact SVG bytes of its run.”

### 1:15–1:48 — Local AI lifecycle

**Screen:** Load `portrait.png`, expand the AI Manager, load MODNet, choose **Remove background**,
then show **AI result · V2** and **Restore original**.

**Voice:** “Optional AI is local too. Models download only after an explicit action, are verified,
and can be cancelled, retried or unloaded. MODNet removes this background in the browser. The
result becomes a versioned conversion input, while the original remains restorable. SlimSAM uses
the same lifecycle for positive and negative point selection.”

### 1:48–2:10 — WebMCP

**Screen:** Open Chrome DevTools **Application → WebMCP**, show the registered tools, invoke
`get_workspace_state`, then invoke `configure_conversion` and show the slider moving in the page.

**Voice:** “Thirteen typed WebMCP tools let a browser agent inspect and operate this same visible
workflow. Tools call the same controllers as the UI—there is no hidden automation copy—and the
complete manual interface still works without WebMCP.”

### 2:10–2:29 — Codex and GPT-5.6

**Screen:** Quick cut to the architecture diagram, passing release test, and focused Git history.

**Voice:** “I built the Studio during OpenAI Build Week with Codex and GPT-5.6 Sol. We used small
test-driven vertical slices across product design, TypeScript, Rust, browser models, WebMCP and
accessibility. Codex also audited dormant shape algorithms against generated geometric ground
truth instead of trusting them blindly.”

### 2:29–2:35 — Close

**Screen:** Return to the A/B workspace and project title.

**Voice:** “img2svg Studio: private pixels in, explainable SVG experiments out.”

## Take acceptance

- Runtime is below 2:55, including transitions.
- The voice clearly says both “Codex” and “GPT-5.6”.
- Local conversion, history, A/B, one AI result and WebMCP are visibly demonstrated.
- No spinner, failed request, console error, private data or placeholder URL appears.
- Text is readable at normal YouTube 1080p playback.
- The final YouTube visibility is **Public**, and the link opens while signed out.

## Technical rehearsal — 19 July 2026

The product shots passed in Chrome 150 before recording:

- the geometric example produced four native SVG elements, two runs and one visible A/B
  difference;
- SVG B downloaded as a non-empty 336-byte file;
- MODNet background removal completed locally through WebGPU;
- the WebMCP inventory and state-changing tools were operated in the visible Studio; and
- the Chrome warning and error log stayed empty.

The final take still requires the public deployment URL, spoken recording, runtime measurement and
signed-out YouTube check.
