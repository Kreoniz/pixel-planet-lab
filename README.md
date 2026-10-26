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
