export const palettes = {
  aurora: ["#101c2e", "#1f5f84", "#498d65", "#c8b16b", "#f2f0df", "#82d9bd"],
  ember: ["#20121a", "#642434", "#b44834", "#ef8f39", "#ffd17d", "#ff674d"],
  reef: ["#062033", "#0b638a", "#269a91", "#8fc878", "#f0e4a8", "#7fdff0"],
  dust: ["#231d1a", "#5c3d30", "#a76a43", "#d6a968", "#eadfb9", "#e26d5a"],
  glacier: ["#102034", "#1f5b74", "#75aec4", "#d8f0ef", "#ffffff", "#9bd9ff"],
  sulfur: ["#102016", "#39471b", "#82952f", "#d0c54c", "#f5f1aa", "#baef66"],
  mono: ["#111111", "#333333", "#686868", "#a6a6a6", "#eeeeee", "#ffffff"],
};

export const presets = {
  terrestrial: { body: 0, palette: "aurora", water: 0.49, terrain: 0.62, roughness: 0.54, clouds: 0.35, ice: 0.28, lava: 0, city: 0.18, rings: false, ringRadius: 0.22, ringTilt: 0.5, ringAngle: 0.08, ringWidth: 0.42, ringOpacity: 0.65, ringGaps: 0.45, ringDetail: 0.68, moons: 1, moonSpread: 0.42, moonTilt: 0.38, moonSpeed: 0.35, moonSize: 0.45, storm: 0.18, atmosphere: 0.62 },
  gas: { body: 1, palette: "dust", water: 0.45, terrain: 0.5, roughness: 0.45, clouds: 0.2, ice: 0, lava: 0, city: 0, rings: true, ringRadius: 0.16, ringTilt: 0.42, ringAngle: 0.04, ringWidth: 0.62, ringOpacity: 0.78, ringGaps: 0.62, ringDetail: 0.78, moons: 4, moonSpread: 0.68, moonTilt: 0.44, moonSpeed: 0.45, moonSize: 0.42, storm: 0.75, atmosphere: 0.72 },
  ice: { body: 2, palette: "glacier", water: 0.38, terrain: 0.4, roughness: 0.5, clouds: 0.25, ice: 0.92, lava: 0, city: 0.03, rings: false, ringRadius: 0.26, ringTilt: 0.36, ringAngle: 0.94, ringWidth: 0.34, ringOpacity: 0.52, ringGaps: 0.36, ringDetail: 0.52, moons: 2, moonSpread: 0.52, moonTilt: 0.32, moonSpeed: 0.28, moonSize: 0.38, storm: 0.18, atmosphere: 0.48 },
  lava: { body: 3, palette: "ember", water: 0.24, terrain: 0.75, roughness: 0.82, clouds: 0.1, ice: 0, lava: 0.9, city: 0, rings: false, ringRadius: 0.2, ringTilt: 0.5, ringAngle: 0.08, ringWidth: 0.36, ringOpacity: 0.5, ringGaps: 0.5, ringDetail: 0.7, moons: 1, moonSpread: 0.48, moonTilt: 0.34, moonSpeed: 0.5, moonSize: 0.34, storm: 0.25, atmosphere: 0.38 },
  ocean: { body: 4, palette: "reef", water: 0.78, terrain: 0.34, roughness: 0.34, clouds: 0.48, ice: 0.15, lava: 0, city: 0.08, rings: false, ringRadius: 0.22, ringTilt: 0.58, ringAngle: 0.1, ringWidth: 0.4, ringOpacity: 0.52, ringGaps: 0.28, ringDetail: 0.45, moons: 1, moonSpread: 0.4, moonTilt: 0.42, moonSpeed: 0.32, moonSize: 0.42, storm: 0.36, atmosphere: 0.68 },
  desert: { body: 5, palette: "dust", water: 0.16, terrain: 0.68, roughness: 0.44, clouds: 0.08, ice: 0.03, lava: 0, city: 0.05, rings: false, ringRadius: 0.24, ringTilt: 0.36, ringAngle: 0.9, ringWidth: 0.48, ringOpacity: 0.56, ringGaps: 0.72, ringDetail: 0.8, moons: 2, moonSpread: 0.56, moonTilt: 0.28, moonSpeed: 0.34, moonSize: 0.36, storm: 0.22, atmosphere: 0.44 },
  toxic: { body: 6, palette: "sulfur", water: 0.45, terrain: 0.52, roughness: 0.62, clouds: 0.78, ice: 0, lava: 0.22, city: 0, rings: true, ringRadius: 0.18, ringTilt: 0.56, ringAngle: 0.12, ringWidth: 0.5, ringOpacity: 0.72, ringGaps: 0.54, ringDetail: 0.72, moons: 3, moonSpread: 0.6, moonTilt: 0.5, moonSpeed: 0.46, moonSize: 0.36, storm: 0.58, atmosphere: 0.9 },
  star: { body: 7, palette: "ember", water: 0.1, terrain: 0.7, roughness: 0.85, clouds: 0, ice: 0, lava: 1, city: 0, rings: false, ringRadius: 0.16, ringTilt: 0.52, ringAngle: 0.08, ringWidth: 0.38, ringOpacity: 0.55, ringGaps: 0.4, ringDetail: 0.55, moons: 0, moonSpread: 0.48, moonTilt: 0.36, moonSpeed: 0.4, moonSize: 0.3, storm: 0.55, atmosphere: 1 },
  blackhole: { body: 8, palette: "mono", water: 0.25, terrain: 0.5, roughness: 0.7, clouds: 0, ice: 0, lava: 0, city: 0, rings: true, ringRadius: 0.02, ringTilt: 0.24, ringAngle: 0.03, ringWidth: 0.92, ringOpacity: 1, ringGaps: 0.18, ringDetail: 0.86, moons: 0, moonSpread: 0.5, moonTilt: 0.2, moonSpeed: 0.25, moonSize: 0.28, storm: 0, atmosphere: 1 },
};

export const state = {
  body: 0,
  palette: "aurora",
  seed: Math.floor(Math.random() * 999999) + 1,
  size: 192,
  pixelSize: 128,
  animate: true,
  zoom: 0.94,
  spin: 0.28,
  terrain: 0.62,
  water: 0.49,
  roughness: 0.54,
  ice: 0.28,
  lava: 0,
  city: 0.18,
  clouds: 0.35,
  cloudSpeed: 0.35,
  storm: 0.18,
  atmosphere: 0.62,
  rings: false,
  ringRadius: 0.22,
  ringTilt: 0.46,
  ringAngle: 0.08,
  ringWidth: 0.55,
  ringOpacity: 0.7,
  ringGaps: 0.48,
  ringDetail: 0.68,
  moons: 1,
  moonSpread: 0.42,
  moonTilt: 0.38,
  moonSpeed: 0.35,
  moonSize: 0.45,
  stars: 0.58,
  lightX: -0.42,
  lightY: -0.34,
  shade: 0.82,
  dither: 0.35,
  frames: 32,
  columns: 8,
  videoSeconds: 4,
  videoFps: 24,
  batch: 12,
};

export const presetButtons = [
  ["terrestrial", "Terra"],
  ["gas", "Gas"],
  ["ice", "Ice"],
  ["lava", "Lava"],
  ["ocean", "Ocean"],
  ["desert", "Desert"],
  ["toxic", "Toxic"],
  ["star", "Star"],
  ["blackhole", "Void"],
];

export const bodyOptions = [
  [0, "Terrestrial"],
  [1, "Gas giant"],
  [2, "Ice world"],
  [3, "Lava world"],
  [4, "Ocean world"],
  [5, "Desert world"],
  [6, "Toxic world"],
  [7, "Star"],
  [8, "Black hole"],
];

export const paletteOptions = Object.keys(palettes).map((key) => [key, title(key)]);
export const pixelOptions = [32, 48, 64, 96, 128, 192, 256, 384, 512].map((value) => [value, `${value} px`]);
export const outputOptions = [64, 96, 128, 192, 256, 384, 512].map((value) => [value, `${value} px`]);

export const actions = [
  ["randomize", "Random"],
  ["mutate", "Mutate"],
  ["exportPng", "PNG"],
  ["exportSheet", "Sheet"],
  ["exportVideo", "Video"],
  ["copyCode", "Copy code"],
  ["shareLink", "Share link"],
  ["loadCode", "Load"],
];

export const controlSections = [
  {
    title: "World",
    meta: '<span id="fps">0 fps</span>',
    controls: [
      { key: "body", label: "Type", type: "select", options: bodyOptions },
      { key: "palette", label: "Palette", type: "select", options: paletteOptions },
      { key: "seed", label: "Seed", type: "number", min: 1, max: 999999, step: 1, span: "half" },
      { key: "size", label: "Output", type: "select", options: outputOptions, span: "half" },
      { key: "pixelSize", label: "Pixel grid", type: "select", options: pixelOptions },
      { key: "animate", label: "Animate", type: "checkbox" },
      { key: "zoom", label: "Zoom", type: "range", min: 0.65, max: 1.18, step: 0.01 },
      { key: "spin", label: "Spin", type: "range", min: 0, max: 1, step: 0.01 },
    ],
  },
  {
    title: "Surface",
    controls: [
      { key: "terrain", label: "Terrain", type: "range" },
      { key: "water", label: "Water", type: "percent" },
      { key: "roughness", label: "Roughness", type: "range" },
      { key: "ice", label: "Ice caps", type: "range" },
      { key: "lava", label: "Lava veins", type: "percent" },
      { key: "city", label: "Cities", type: "percent" },
    ],
  },
  {
    title: "Layers",
    controls: [
      { key: "clouds", label: "Clouds", type: "percent" },
      { key: "cloudSpeed", label: "Cloud speed", type: "range" },
      { key: "storm", label: "Storms", type: "range" },
      { key: "atmosphere", label: "Atmosphere", type: "range" },
      { key: "rings", label: "Rings", type: "checkbox" },
      { key: "ringRadius", label: "Ring radius", type: "range" },
      { key: "ringTilt", label: "Ring tilt", type: "range" },
      { key: "ringAngle", label: "Ring angle", type: "range" },
      { key: "ringWidth", label: "Ring width", type: "range" },
      { key: "ringOpacity", label: "Ring opacity", type: "percent" },
      { key: "ringGaps", label: "Ring gaps", type: "range" },
      { key: "ringDetail", label: "Ring detail", type: "range" },
      { key: "moons", label: "Moons", type: "number", min: 0, max: 8, step: 1 },
      { key: "moonSpread", label: "Moon spread", type: "range" },
      { key: "moonTilt", label: "Moon tilt", type: "range" },
      { key: "moonSpeed", label: "Moon speed", type: "range" },
      { key: "moonSize", label: "Moon size", type: "range" },
      { key: "stars", label: "Stars", type: "percent" },
    ],
  },
  {
    title: "Light",
    controls: [
      { key: "lightX", label: "Light X", type: "range", min: -1, max: 1 },
      { key: "lightY", label: "Light Y", type: "range", min: -1, max: 1 },
      { key: "shade", label: "Shade", type: "range" },
      { key: "dither", label: "Dither", type: "range" },
    ],
  },
  {
    title: "Export",
    controls: [
      { key: "frames", label: "Frames", type: "number", min: 1, max: 96, step: 1, span: "half" },
      { key: "columns", label: "Columns", type: "number", min: 1, max: 16, step: 1, span: "half" },
      { key: "videoSeconds", label: "Video seconds", type: "number", min: 1, max: 20, step: 1, span: "half" },
      { key: "videoFps", label: "Video FPS", type: "number", min: 8, max: 60, step: 1, span: "half" },
      { key: "batch", label: "Batch size", type: "number", min: 4, max: 24, step: 1 },
      { action: "exportSheet", label: "Spritesheet PNG", type: "button" },
      { action: "exportVideo", label: "Export WebM", type: "button" },
      { action: "copyCode", label: "Copy code", type: "button" },
      { action: "loadCode", label: "Import code", type: "button" },
    ],
  },
];

const controlHelp = {
  body: "Switches the base shader behavior: rocky worlds, gas bands, lava, star plasma, black hole disk, and so on.",
  palette: "Chooses the six-color palette used by terrain, atmosphere, rings, stars, and special effects.",
  seed: "Changes the procedural noise pattern for terrain, clouds, moons, rings, and stars.",
  size: "Final exported PNG size. It can be larger than the internal pixel grid.",
  pixelSize: "Internal render resolution. Lower values look chunkier; higher values add finer pixel detail.",
  animate: "Runs rotation, clouds, moons, storms, and plasma over time.",
  zoom: "Scales the main planet in the preview.",
  spin: "Changes planet rotation speed without changing the current rotation phase.",
  terrain: "Controls continent amount, mountain strength, band density, or plasma detail depending on planet type.",
  water: "Sets the ocean/sea threshold on rocky worlds; lower values reveal more land.",
  roughness: "Adds finer surface noise, sharper coastlines, rougher lava cracks, and busier gas detail.",
  ice: "Adds polar caps and high-altitude snow/ice on supported rocky worlds.",
  lava: "Adds glowing cracks and emissive hot regions, strongest on lava worlds.",
  city: "Adds warm night-side city lights on land for rocky worlds. They only show clearly on the dark side.",
  clouds: "Adds a moving cloud layer over rocky worlds.",
  cloudSpeed: "Controls only cloud drift speed, not planet rotation.",
  storm: "Strengthens gas giant spots, star flares, toxic turbulence, and storm-like detail.",
  atmosphere: "Controls rim glow and halo intensity around the planet.",
  rings: "Enables a procedural ring system around supported bodies.",
  ringRadius: "Moves ring inner edge outward from the planet.",
  ringTilt: "Flattens or opens the ring ellipse.",
  ringAngle: "Rotates the ring plane on screen.",
  ringWidth: "Controls how thick the ring band is.",
  ringOpacity: "Controls ring visibility.",
  ringGaps: "Adds more lane gaps and broken ring structure.",
  ringDetail: "Adds finer dust and lane variation to rings.",
  moons: "Sets how many moons orbit the planet. They now pass behind and in front of the planet.",
  moonSpread: "Controls moon orbit radius spacing.",
  moonTilt: "Controls how flat or open moon orbits are.",
  moonSpeed: "Controls moon orbital speed.",
  moonSize: "Controls moon radius.",
  stars: "Controls background star density.",
  lightX: "Moves the light horizontally. You can also drag on the preview.",
  lightY: "Moves the light vertically. You can also drag on the preview.",
  shade: "Controls day/night contrast.",
  dither: "Adds pixel noise before quantization for a less smooth, more pixel-art look.",
  frames: "Number of animation frames in the exported spritesheet.",
  columns: "Column count in the exported spritesheet.",
  videoSeconds: "Length of exported WebM video.",
  videoFps: "Frame rate of exported WebM video.",
  exportSheet: "Exports all selected animation frames as one PNG spritesheet.",
  exportVideo: "Records the current animation as a WebM video using the browser MediaRecorder.",
  copyCode: "Copies this planet configuration for later reuse.",
  loadCode: "Imports a planet code or shared URL.",
  batch: "Controls and generates the random planet strip; click a generated preview to load it.",
};

for (const section of controlSections) {
  for (const control of section.controls) {
    control.help = controlHelp[control.key ?? control.action] ?? "";
  }
}

function title(value) {
  return value[0].toUpperCase() + value.slice(1);
}
