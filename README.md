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
- Drag the preview to move the light; choose a preset, or generate optional variations.
- Small transitions respect reduced-motion preferences.

## Performance

The preview pauses its frame loop when not animating, offscreen, or in a hidden tab. Animations are capped to 30 FPS, and unused ring/moon shader paths are skipped. Optional spritesheet/video/batch routines load on demand, and production GLSL literals are compacted without additional runtime packages.

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
Shortcuts do not run while focus is in a text/number input, select, or other editable field. This uses the framework-independent `@tanstack/hotkeys` core; no new framework or devtools bundle is required.

## Rendering and experimentation

**Preview FPS** is a target (5–60 FPS), not a promise of hardware throughput.
It affects only the current editor; WebM export uses its own requested FPS.
Pausing freezes all shader effects at the same simulation timestamp. Scrub the
compact 60-second timeline or step one frame backward/forward to inspect motion.

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
canvas stays opaque, so normal previews look the same. WebM still exports the
full scene; animated GIF/APNG with transparency is a separate follow-up.

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
