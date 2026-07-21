# Demo video script

Target length: **2:35**. Spoken language: **English**. The final video must stay below three
minutes and be publicly visible on YouTube.

## Recording setup

- Record Chrome at 1920×1080 with browser zoom at 100%.
- Use the deployed `studio.img2.download` build and a clean profile.
- Keep `portrait.png` ready in the file picker; the owner logo is bundled in the Studio.
- Cache MODNet before recording, then unload it so the load state remains visible without waiting
  for a full network download during the take.
- Close personal tabs, notifications and unrelated DevTools panels.
- In ChatGPT Settings → Plugins → img2svg Studio, press **Refresh** once and verify ten actions.
- Record voice and screen together; use no copyrighted music.

## Timed narration and shots

### 0:00–0:15 — Problem

**Screen:** Empty Studio workspace, then move toward **Choose image**.

**Voice:** “Raster-to-SVG conversion is usually a black box. Change a setting, lose the old
result, and guess whether the output improved. img2svg Studio turns that process into a local,
reproducible visual experiment.”

### 0:15–0:42 — First deterministic run

**Screen:** Choose **Logo demo**, point at the original 1280×876 raster size, the Logo preset,
Speckle 16 and zero-decimal paths, then choose **Convert** and show the 542-path run.

**Voice:** “The image stays in this browser. A Rust and WebAssembly engine traces arbitrary
content. It starts at the original 1280 by 876 pixels and produces a measured 542-path result.”

### 0:42–1:15 — History and A/B evidence

**Screen:** Change **Raster size** to 576 pixels, convert again, assign Original to A and Run 2 to
B, then drag the divider across the logo and show the measured 315-path optimized run.

**Voice:** “Every conversion is an immutable run. The divider keeps Original on the left and SVG
on the right while both stay aligned under zoom and pan. Each download still contains the exact
SVG bytes of its run.”

### 1:15–1:48 — Local AI lifecycle

**Screen:** Load `portrait.png`, expand the AI Manager, load MODNet, choose **Remove background**,
then show **AI result · V2** and **Restore original**.

**Voice:** “Optional AI is local too. Models download only after an explicit action, are verified,
and can be cancelled, retried or unloaded. MODNet removes this background in the browser. The
result becomes a versioned conversion input, while the original remains restorable. SlimSAM uses
the same lifecycle for positive and negative point selection.”

### 1:48–2:10 — WebMCP

**Screen:** In the visible Studio choose **Connect ChatGPT**. In ChatGPT ask: “Inspect the connected
Studio, list my presets, load Jury Logo and accept the current draft.” Show the preset controls and
History update in the Studio without manual input there.

**Voice:** “ChatGPT is controlling this same visible Studio through typed WebMCP contracts. It can
use presets stored only in my browser because the local Companion relays commands, never the image.
The tools call the same controllers as the UI, and the complete interface still works manually.”

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

## Technical rehearsal — 20 July 2026

The product shots passed in Chrome 150 before recording:

- the bundled faceted logo produced 315 paths at 842×576 instead of the previous 2,798 paths;
- Original and the optimized SVG remained aligned at 100 and 156 percent synchronized zoom;
- SVG B downloaded as a non-empty Marv-Kalani logo SVG;
- MODNet background removal completed locally through WebGPU;
- the WebMCP inventory and state-changing tools were operated in the visible Studio; and
- the Chrome warning and error log stayed empty.

The final take still requires the spoken recording, runtime measurement and signed-out YouTube
check.
