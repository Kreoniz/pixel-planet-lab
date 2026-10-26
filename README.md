# Pixel Planet Lab

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

## Notes

- Rendering is done in a fragment shader at the selected pixel grid, so the CPU mostly handles UI and exports.
- PNG export upscales the current pixel grid to the selected output size with smoothing disabled.
- Sheet export writes a PNG spritesheet using the selected output size, frame count, and column count.
- Planet code is a base64-encoded JSON config for quick sharing.
