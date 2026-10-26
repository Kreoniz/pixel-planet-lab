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
