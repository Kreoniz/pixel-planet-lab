# Pixel Planet Lab

**Website:** https://kreoniz.github.io/pixel-planet-lab/

A Vite/WebGL2 pixel planet generator inspired by Deep-Fold's browser toy, with extra controls for biomes, clouds, rings, moons, city lights, batch seeds, pixel-grid resolution, PNG export, and spritesheet export.

## Run

```sh
corepack pnpm install
corepack pnpm dev
```

## Build

```sh
corepack pnpm build
```

The build writes bundled/minified assets to `dist/` and then creates `.gz` and `.br` versions of compressible assets.

## Deploy

GitHub Pages is deployed automatically from `main` using `.github/workflows/deploy.yml`.
The GitHub Pages **Source** must be set to **GitHub Actions** in repository settings.
The site is served under `/pixel-planet-lab/`; push to `main` or manually dispatch the workflow to publish.

## Notes

- Rendering is done in a fragment shader at the selected pixel grid, so the CPU mostly handles UI and exports.
- PNG export upscales the current pixel grid to the selected output size with smoothing disabled.
- Sheet export writes a PNG spritesheet using the selected output size, frame count, and column count.
- Planet code is a base64-encoded JSON config for quick sharing. Existing codes still work with **Load**.
- **Share link** copies a URL with a URL-safe planet code in its fragment; opening it restores the same settings. The link stays entirely client-side.
- Importing a code accepts either a raw code or a shared URL, validates settings, and ignores unknown keys.

## Tests

```sh
corepack pnpm test
```

Pull requests run the Node tests and the production build in GitHub Actions.

## Editor

The interface retains the compact, dark two-column preview and control panel.

- Settings use native collapsible sections; World and Surface open initially.
- Discrete options use selects, counts use number inputs, and coverage/opacity use percentages. Continuous effects remain sliders.
- Unavailable controls are disabled with explanations, without erasing settings when the planet type changes.
- Enable **Move light** to drag lighting in the preview; otherwise touch gestures scroll normally. Choose a preset or generate optional variations.
- Small transitions respect reduced-motion preferences.

## Performance

The preview pauses its frame loop when not animating, when neither the main nor compact preview is visible, in a hidden tab, or while an export preview is open. The default target is 30 FPS (adjustable from 5 to 60), with real-time simulation independent of the rendering cadence. Unused ring/moon shader paths and moon orbit calculations are skipped. Optional spritesheet/video/batch routines load on demand, and production GLSL literals are compacted without additional runtime packages.

The favicon uses the image-generated dark variant, optimized locally to a 64px indexed PNG (1.9 KB).

## Keyboard shortcuts

Press **?** in the editor (or click its small **?** button) for the complete list.

| Shortcut | Action |
| --- | --- |
| `R` / `M` | Randomize / mutate the planet |
| `A` | Toggle animation |
| `1`–`9` | Select a planet preset in toolbar order |
| `B` | Generate batch variations |
| `Mod+S` | Download a PNG |
| `Mod+Shift+L` | Copy the share link |
| `?` | Open or close shortcut help |
| `Escape` | Close shortcut help (native dialog behavior) |

`Mod` is **Ctrl** on Linux/Windows and **Command** on macOS.
Shortcuts do not run while focus is in a text/number input, select, or other editable field, or while an export preview dialog is open. Native keyboard events handle these shortcuts without runtime packages. Typing, IME composition, held keys, unrelated modifiers and open export dialogs do not trigger editor actions.

## Rendering and experimentation

**Preview FPS** is a target (5–60 FPS), not a promise of hardware throughput.
It affects only the current editor; WebM export uses its own requested FPS. A labeled Play/Pause action sits beside the timeline.
Pausing freezes all shader effects at the same simulation timestamp. Scrub the
expanding absolute timeline or step one frame backward/forward to inspect motion.

**Pixel grid** is the internal shader resolution; **Output** is exported PNG
resolution. Use Chunky / Balanced / Fine buttons, or the complete size menu.
The editor warns when scaling isn't an integer multiple (uneven pixel widths)
or when output is downscaled.

**Undo / Redo** work for parameter changes, presets, randomization, seed-only
rerolls, and light dragging. Use `Ctrl/Cmd+Z` and `Ctrl/Cmd+Shift+Z`.
The last planet is saved locally, restoring automatically next time unless a
shared planet URL is supplied. Editor-only FPS and type/palette locks are stored
separately; share links remain portable.

**Random** can keep planet type and/or palette via Lock toggles. **Seed ↻**
changes only the seed without changing any other parameters (`Shift+R`).
Switching presets resets stale world-specific effects but retains export settings.

**Spritesheets** now sample a configurable time span; procedural planets are not
guaranteed to loop seamlessly. Browser-safe canvas dimension checks fail with an
actionable message before allocating huge sheets. Batch variations are generated
incrementally and can be interrupted by subsequent editing.


## Shader and visual inspiration

The illustrated terrestrial/ocean shader uses independent water, land, and
cloud layers inspired by [Deep-Fold/PixelPlanets](https://github.com/Deep-Fold/PixelPlanets).
Clouds use independently warped 3D weather-noise clusters, with small
discrete highlights and subtle shadows rather than continuous broad ribbons.
The new WebGL2 shader code is independently implemented; Deep-Fold's layer
compositing and palette treatment inspired its visual direction. We preserve
attribution and the upstream [MIT license](licenses/Deep-Fold-PixelPlanets-MIT.txt)
(Copyright © 2020 Deep-Fold). The editor and other world types remain independent.

## Mobile and toxic planet refinement

On phone-sized viewports, the eight toolbar actions use two rows of four buttons,
the timeline gets a dedicated row, and type/palette controls occupy full-width
fields. Buttons retain readable labels and the page allows additional bottom
spacing for mobile browser controls.

The Toxic body uses a separate, multi-scale 3D atmospheric noise field:
domain-warped weather patterns, mid-frequency flow, fine aerosols and wispy
cloud layers. This avoids the oversized smooth blobs that appeared with the
previous single-noise shader. Existing planet seeds, palette choices and
shareable configuration codes remain valid.


## Exporting transparent planet assets

The **Export** section now offers three PNG/spritesheet presets:

- **Full scene** (default): retains the previous opaque output, stars, moons, rings and atmosphere.
- **Planet only**: transparent background; excludes stars, moons, rings and outer glow.
- **Planet + rings**: transparent background with any enabled rings and outer glow, but no moons or stars.

Expand **Customize layers** to toggle background transparency, moons, rings,
outer glow and stars individually. Stars are omitted from transparent output.
These choices are stored in browser preferences, not in planet share codes or
undo history. They never change the live editor or the selected planet's properties.

Exports use an offscreen RGBA8 WebGL2 framebuffer and retain proper transparent
pixels through nearest-neighbor PNG and spritesheet scaling. The interactive
canvas stays opaque, so normal previews look the same. WebM exports the full
scene; GIF and APNG respect the selected layers as described below.

A **Preview PNG layers** action renders the selected export layers over a checkerboard without changing the editor preview or downloading a file.


## Animated PNG and GIF in the same export workflow

Open **Export → Animated exports** to create APNG (full color, full alpha)
or GIF (256-color indexed animation, binary transparency). Both respect the
same Full scene / Planet only / Planet + rings / Custom layers settings as PNG
and spritesheets.

Set duration (1–12 seconds), FPS (4–30), and whether the animation repeats.
Encoding is limited to **120 frames** to prevent expensive mobile exports.

**Seamless rotation** samples one complete planetary revolution, holding
secondary shader clocks fixed so the animation starts and ends on matching
rotation phases. Disable it for a timed sequence where clouds, storms and moons
advance naturally; timed sequences are not guaranteed to loop seamlessly.
Spritesheets use the same frame sampler and seamless setting.

Select **Preview loop** to inspect the animation over the checkerboard before
exporting. Pause or play it within the preview dialog; closing the dialog
releases the temporary WebGL resources. Long exports show progress and include
a Cancel action.

Exports capture the planet and export settings when started. You can keep editing
while frames are encoded without changing the world, resolution or filename of
the export already in progress.

GIF is a compatibility format: its palette is limited to 256 colors and alpha
is either visible or transparent. APNG is the recommended high-quality option
for transparent pixel planets. All animation preferences remain local to the
browser; they do not modify the preview, planet share codes or undo history.


## Illustrated moon rendering

Moons use a lightweight, seeded WebGL surface shader with four material families
(rock, ice, iron-rich regolith and basalt), circular impact basins, thin
directionally lit crater rims, stepped day/night shading, and subtly varied
relative sizes. Moon geometry remains entirely procedural without external
textures or asset downloads.

Orbital positions use golden-angle phase offsets, projected orbit depth
and slower motion for more distant moons; front/back passes still let moons
travel behind the main planet. Existing Moons, Moon spread, Moon tilt,
Moon speed and Moon size controls remain compatible with saved planets, share
codes, PNG, spritesheets and transparent animations. Moon rendering is skipped
when an export explicitly excludes moons.

Moon orbital positions are now calculated once per frame on the CPU and uploaded as a small uniform array, avoiding repeated orbit trigonometry across background fragments.


## Refined editor and opt-in moons

World, Surface, Atmosphere, Rings, Moons, Light and Export have section links.
On phones and tablets, each section offers a **Back to preview** link. Desktop
previews stay in view beside the independently scrolling settings panel. Touch
controls have larger targets, unavailable controls show their reason, and ring
and moon details appear only when enabled. Preset buttons apply a preset without
claiming an exact selection after subsequent edits.

Moons start **off** for new worlds, every preset, random planets and variations.
Set **Moons → Moon count** above zero to reveal spread, tilt, speed and size.
Saved planets and shared codes keep their explicit moon counts. The illustrated
moon geology, craters and CPU-computed orbit positions from PR #8 are retained.

Export starts with output size and shared layers, then separate native disclosure
sections for animations, spritesheets, WebM and planet codes. Seamless rotation
and its explanation are shared by animations and spritesheets. Progress and
cancellation are visible inside Export; PNG previews use the requested output
pixel dimensions. The default output is 256px for crisp 2× scaling of the 128px
grid. GIF frame timing preserves the requested duration at fractional
centisecond frame rates.

There are no runtime dependencies, web fonts, textures or new framework assets.
The production entry JavaScript is about 27 KB gzip; optional encoders and export
tools remain separate chunks loaded on demand. Browser QA uses software WebGL,
so rendering throughput on a particular device must be assessed on that device.


## Precision editing and creative exploration

Every continuous control has a synchronized numeric input. Type an exact value
or drag the slider; each finished edit is one undo step. Percentage controls use
0–100, while other values show the same units as their sliders. **Reset this type**
restores the authored settings while keeping the seed, output and playback choices.
Changing **Type** also starts from that type’s authored settings, so a new lava
world has visible lava rather than inheriting an unrelated world’s parameters.
Both actions can be undone.

**Browse palette colors** shows named six-color swatches without replacing the
native palette menu. Palette changes keep the seed. On phones and tablets,
**Pin preview** keeps a small live view above the controls; **Unpin** and **View
full planet** remain available there. It copies the existing WebGL render into a
small 2D canvas; it does not start another shader or renderer. Pinning is a local
editor preference and does not enter shared planet codes.

**Similar worlds** generates nearby ideas while keeping the current type and
palette. **All planet types** explores authored families, respects the type and
palette locks, and uses suitable palette choices and bounded parameter variation.
Fresh generated worlds and presets fit ring systems inside the frame. Similar
worlds retain custom framing. Each variation stores the complete settings used
for its thumbnail, so later edits do not change what selecting it loads.

These refinements were implemented in two successive review-and-improve rounds:
Terra reviewed precision editing and generation first; Sol independently reviewed
the resulting UI, framing, palette discovery and mobile editing. Regression tests
cover all nine generated families, deterministic seeds and locks, complete
variation selection, ring framing, Toxic control behavior and preview reuse.


Section navigation scrolls instantly, and control sections open without height
animation. Desktop section links remain visible inside the scrolling panel.
Mobile section spacing adapts to whether the compact preview is pinned. Preview
playback and FPS preferences are grouped under **World → Preview options**;
Play/Pause remains beside the main timeline.
