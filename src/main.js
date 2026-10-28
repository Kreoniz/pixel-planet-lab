import "./styles.css";
import { palettes, presets, state, defaultPlanetState } from "./config.js";
import { decodePlanetCode, encodePlanetCode, normalizePlanetState } from "./planet-state.js";
import { renderApp, syncUi, syncEditorUi, syncTimelineUi, syncExportUi, syncAnimationUi } from "./ui.js";
import { createFramePlan } from "./animation-frames.js";
import { createAnimationStore, normalizeAnimationSettings, animationSummary } from "./animation-settings.js";
import { chooseExportPreset, updateExportOption, createExportOptionStore } from "./export-options.js";
import { createHistory, createSessionStore, normalizePreferences, nextPresetState } from "./editor-state.js";
import { registerEditorHotkeys } from "./hotkeys.js";
import { generatePlanet, resetPlanet } from "./planet-generator.js";
import { moonOrbitVectors } from "./moon-orbits.js";
import { installMissingChunkRecovery } from "./missing-chunk-recovery.js";

renderApp(document.querySelector("#app"));

const canvas = document.querySelector("#planetCanvas");
const gl = canvas.getContext("webgl2", {
  antialias: false,
  alpha: false,
  depth: false,
  preserveDrawingBuffer: true,
});

const statusEl = document.querySelector("#status");

// An older tab can survive a Cloudflare Pages preview deployment. Vite
// dispatches vite:preloadError when it tries to import a now-missing chunk.
// Reload once onto the new deployment, or show a safe manual recovery action.
installMissingChunkRecovery(window, {
  buildId: import.meta.url,
  onFailure() {
    // Keep this recovery action outside #status: an awaiting export's catch
    // handler may update #status after Vite emits the preload error.
    if (document.querySelector("[data-refresh-preview-notice]")) return;
    const notice = document.createElement("div");
    notice.dataset.refreshPreviewNotice = "";
    notice.className = "reload-preview-notice";
    notice.setAttribute("role", "alert");
    notice.append(document.createTextNode("Preview assets have changed. "));
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.refreshPreview = "";
    button.textContent = "Reload preview";
    button.addEventListener("click", () => window.location.reload());
    notice.append(button);
    statusEl.after(notice);
  },
});
const fpsEl = document.querySelector("#fps");
const batchStrip = document.querySelector("#batchStrip");


const vertexSource = `#version 300 es
precision highp float;

out vec2 vUv;

void main() {
  vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
  vUv = p;
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

const fragmentSource = `#version 300 es
precision highp float;

out vec4 outColor;

uniform vec2 uResolution;
uniform float uTime;
uniform float uTurn;
uniform float uSeed;
uniform int uBody;
uniform int uMoons;
uniform vec3 uPalette[6];
uniform float uZoom;
uniform float uLightX;
uniform float uLightY;
uniform float uWater;
uniform float uTerrain;
uniform float uRoughness;
uniform float uClouds;
uniform float uCloudSpeed;
uniform float uAtmosphere;
uniform float uStars;
uniform float uCity;
uniform float uStorm;
uniform float uIce;
uniform float uLava;
uniform float uRings;
uniform float uRingRadius;
uniform float uRingTilt;
uniform float uRingAngle;
uniform float uRingWidth;
uniform float uRingOpacity;
uniform float uRingGaps;
uniform float uRingDetail;
uniform float uShade;
uniform float uDither;
uniform float uMoonSpread;
uniform float uMoonTilt;
uniform float uMoonSpeed;
uniform float uMoonSize;
uniform vec4 uMoonData[8];

// Scene-composition flags apply to offscreen exports only. The preview always
// draws the full opaque scene using defaults supplied by draw().
uniform float uExportTransparent;
uniform float uExportMoons;
uniform float uExportRings;
uniform float uExportGlow;
uniform float uExportStars;
uniform float uExportLoop;

struct Surface {
  vec3 color;
  float height;
  float land;
  float glow;
};

struct Ring {
  float mask;
  float front;
  vec3 color;
};

float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float hash31(vec3 p) {
  p = fract(p * 0.3183099 + vec3(0.11, 0.17, 0.23));
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

float noise(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);

  float n000 = hash31(i + vec3(0.0, 0.0, 0.0));
  float n100 = hash31(i + vec3(1.0, 0.0, 0.0));
  float n010 = hash31(i + vec3(0.0, 1.0, 0.0));
  float n110 = hash31(i + vec3(1.0, 1.0, 0.0));
  float n001 = hash31(i + vec3(0.0, 0.0, 1.0));
  float n101 = hash31(i + vec3(1.0, 0.0, 1.0));
  float n011 = hash31(i + vec3(0.0, 1.0, 1.0));
  float n111 = hash31(i + vec3(1.0, 1.0, 1.0));

  float nx00 = mix(n000, n100, f.x);
  float nx10 = mix(n010, n110, f.x);
  float nx01 = mix(n001, n101, f.x);
  float nx11 = mix(n011, n111, f.x);
  float nxy0 = mix(nx00, nx10, f.y);
  float nxy1 = mix(nx01, nx11, f.y);
  return mix(nxy0, nxy1, f.z);
}

float fbm(vec3 p) {
  float value = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 5; i++) {
    value += amp * noise(p);
    p = p * 2.03 + vec3(9.7, 4.1, 6.3);
    amp *= 0.5;
  }
  return value;
}

vec3 rotateY(vec3 p, float a) {
  float s = sin(a);
  float c = cos(a);
  return vec3(c * p.x + s * p.z, p.y, -s * p.x + c * p.z);
}

vec3 rotateX(vec3 p, float a) {
  float s = sin(a);
  float c = cos(a);
  return vec3(p.x, c * p.y - s * p.z, s * p.y + c * p.z);
}

mat2 rotate2(float a) {
  float s = sin(a);
  float c = cos(a);
  return mat2(c, -s, s, c);
}

// Coastlines start from a continent-scale field. Small detail perturbs the
// borders; it does not replace the underlying landmass with visual noise.
float surfaceHeight(vec3 p) {
  float continent = fbm(p * (1.2 + uTerrain * 1.1) + vec3(uSeed * 0.13, 0.0, 0.0));
  float detail = noise(p * (5.0 + uRoughness * 6.0) + vec3(0.0, uSeed * 0.19, 0.0));
  float ridge = 1.0 - abs(noise(p * (8.0 + uTerrain * 4.0) + vec3(0.0, 0.0, uSeed * 0.17)) - 0.5) * 2.0;
  float h = continent * 0.78 + detail * 0.22 + (ridge - 0.5) * uRoughness * 0.06;
  return clamp(pow(max(h, 0.0), mix(1.18, 0.84, uTerrain)), 0.0, 1.0);
}

Surface rockySurface(vec3 p) {
  Surface s;
  float h = surfaceHeight(p);
  float waterLine = clamp(uWater, 0.03, 0.95);
  float shore = smoothstep(waterLine - 0.035, waterLine + 0.035, h);
  float coast = 1.0 - smoothstep(0.008, 0.058, abs(h - waterLine));
  float high = smoothstep(min(0.82, waterLine + 0.08), min(0.99, waterLine + 0.32), h);
  float mountain = smoothstep(0.57, 0.84, h);
  float moisture = noise(p * 4.3 + vec3(uSeed * 0.31, 4.0, 0.0));
  float iceCap = clamp(smoothstep(0.52, 0.92, abs(p.y) + uIce * 0.17) +
      smoothstep(0.66, 0.92, h) * uIce * 0.35, 0.0, 1.0);

  vec3 sea = mix(uPalette[0] * 0.8, uPalette[1],
      smoothstep(waterLine - 0.3, waterLine + 0.07, h));
  if (uBody == 4) {
    // Ocean worlds need readable mid-tones, not a nearly black blue sphere.
    sea = mix(uPalette[1] * 0.92, uPalette[2] * 0.94,
        0.22 + 0.48 * smoothstep(0.18, 0.9, h));
  }
  sea = mix(sea, uPalette[5], coast * (uBody == 4 ? 0.22 : 0.13));

  float wetness = smoothstep(0.27, 0.76, moisture);
  vec3 plains = mix(uPalette[3] * 0.83, uPalette[2], wetness);
  plains = mix(plains, uPalette[3], high * 0.16);
  vec3 peaks = mix(uPalette[3], uPalette[4] * 0.87, mountain);
  vec3 land = mix(plains, peaks, mountain * 0.72);
  land = mix(land, uPalette[3], coast * 0.54);
  land = mix(land, uPalette[4], iceCap * uIce);

  s.color = mix(sea, land, shore);
  s.height = h;
  s.land = shore;
  s.glow = 0.0;

  if (uBody == 2) {
    // Frost is layered over underlying relief, with thin blue fractures.
    s.color = mix(s.color, mix(uPalette[2], uPalette[4], mountain),
        0.50 + iceCap * 0.38);
    float fracture = 1.0 - smoothstep(0.022, 0.095,
        abs(noise(p * 19.0 + vec3(uSeed * 0.11)) - 0.5));
    s.color = mix(s.color, uPalette[1], fracture * 0.14);
    s.land = max(s.land, 0.62);
  }

  if (uBody == 3) {
    // Thin connected hot contours read like fissures at sprite resolution.
    float cracks = 1.0 - smoothstep(0.028, 0.125, abs(noise(
        p * (9.0 + uRoughness * 8.0) + vec3(uSeed * 0.17, uTime * 0.015, 0.0)) - 0.5));
    float flow = smoothstep(0.22, 0.72,
        noise(p * 4.7 + vec3(0.0, uSeed * 0.37, 0.0)));
    float lava = max((1.0 - shore) * 0.8, cracks * flow) * uLava;
    s.color = mix(s.color * 0.27, vec3(1.0, 0.29, 0.055), lava);
    s.color += vec3(0.12, 0.025, 0.0) * lava;
    s.glow = lava;
  }

  if (uBody == 4) {
    float swell = noise(p * 15.0 + vec3(uSeed * 0.41, 0.0, uTime * 0.012));
    s.color = mix(sea, land, shore * 0.3);
    s.color += uPalette[5] * (swell - 0.5) * 0.09 * (1.0 - shore);
    s.land = shore * 0.32;
  }

  if (uBody == 5) {
    s.color = mix(uPalette[1] * 0.87, uPalette[3], h);
    s.color = mix(s.color, uPalette[4], smoothstep(0.64, 0.94, h) * 0.20);
    s.land = 1.0;
  }

  return s;
}

// A distinct toxic atmosphere: broad swirling weather systems carry finer
// turbulent clouds and mineral aerosols. Three scales avoid the smooth
// oversized patches produced by one low-frequency noise sample.
Surface toxicSurface(vec3 p) {
  Surface s;
  vec3 seedPos = vec3(uSeed * 0.013, uSeed * 0.021, uSeed * 0.017);
  float drift = uTime * 0.018;

  float broad = noise(p * 3.3 + seedPos + vec3(0.0, drift, 0.0));
  float curl = noise(p * 5.8 + seedPos * 1.37 + vec3(drift, 0.0, 3.1));
  float swirl = noise(p * 7.1 + seedPos * 0.83 + vec3(1.9, -drift, 0.0));
  vec3 warped = p + vec3(curl - 0.5, broad - 0.5, swirl - 0.5) *
      (0.18 + uRoughness * 0.12);

  float medium = fbm(warped * (6.8 + uTerrain * 3.5) +
      seedPos * 0.43 + vec3(0.0, drift * 0.45, 0.0));
  float small = noise(warped * (15.0 + uRoughness * 11.0) +
      seedPos * 1.49 + vec3(0.0, drift, 0.0));
  float detail = noise(warped * 32.0 + seedPos * 2.73);
  float streaks = sin(warped.y * 26.0 + broad * 4.6 +
      medium * 3.1 + warped.x * 2.9);

  float weather = broad * 0.36 + medium * 0.31 + small * 0.19 +
      (streaks * 0.5 + 0.5) * 0.14;
  vec3 depths = mix(uPalette[0] * 0.78, uPalette[1], 0.43);
  vec3 middle = mix(uPalette[1], uPalette[2], 0.35);
  vec3 highlights = mix(uPalette[3], uPalette[4], 0.36);
  s.color = mix(depths, middle, smoothstep(0.29, 0.66, weather));
  s.color = mix(s.color, highlights,
      smoothstep(0.62, 0.89, weather) * 0.67);

  // Fine wisps are grouped by weather rather than painted everywhere.
  float aerosols = smoothstep(0.58, 0.80, small * 0.64 + detail * 0.36);
  s.color = mix(s.color, uPalette[5],
      aerosols * smoothstep(0.39, 0.64, weather) *
      (0.07 + uStorm * 0.20));
  s.color *= 0.87 + medium * 0.19;
  s.height = weather;
  s.land = 1.0;
  s.glow = 0.0;
  return s;
}

Surface gasSurface(vec3 p) {
  Surface s;
  float warp = fbm(p * vec3(2.6, 3.6, 2.6) +
      vec3(uSeed * 0.37, uTime * 0.03, 0.0));
  // Broad flowing belts stay coherent as the globe rotates.
  float lat = p.y + (warp - 0.5) * 0.11;
  float major = sin(lat * (19.0 + uTerrain * 11.0) + uSeed * 0.3);
  float minor = sin(lat * (39.0 + uTerrain * 19.0) + warp * 1.8);
  float stripe = smoothstep(-0.45, 0.55, major * 0.78 + minor * 0.22);
  vec3 darkBelt = mix(uPalette[1] * 0.9, uPalette[2], 0.19 + 0.22 * warp);
  vec3 brightBelt = mix(uPalette[3], uPalette[4], 0.18 + 0.20 * warp);
  s.color = mix(darkBelt, brightBelt, stripe);

  float turbulence = noise(p * 10.5 + vec3(uSeed * 0.23, uTime * 0.06, 0.0));
  s.color = mix(s.color, uPalette[4], turbulence * uStorm * 0.12);

  // A shaped vortex with a bright outer spiral and a darker quiet eye.
  vec2 spot = vec2(p.x + 0.32 + sin(uSeed) * 0.08, p.y - 0.10);
  float r = length(spot / vec2(0.36, 0.19));
  float swirl = 0.5 + 0.5 * sin(atan(spot.y, spot.x) * 2.0 - r * 10.0 + uTime * 0.14);
  float vortex = (1.0 - smoothstep(0.20, 0.95, r)) * uStorm;
  s.color = mix(s.color, mix(uPalette[4], uPalette[5], swirl * 0.58), vortex * 0.67);
  s.color = mix(s.color, uPalette[1], (1.0 - smoothstep(0.04, 0.30, r)) * vortex * 0.68);
  s.height = turbulence;
  s.land = 1.0;
  s.glow = 0.0;
  return s;
}

Surface starSurface(vec3 p) {
  Surface s;
  float plasma = fbm(p * (6.8 + uRoughness * 14.0) +
      vec3(uSeed, uTime * 0.28, 0.0));
  float flare = smoothstep(0.50, 0.91,
      fbm(p * 18.0 + vec3(0.0, uSeed, uTime * 0.65)));
  s.color = mix(uPalette[2], uPalette[4], smoothstep(0.19, 0.83, plasma));
  s.color += uPalette[5] * flare * (0.30 + uStorm * 0.85);
  s.height = plasma;
  s.land = 1.0;
  s.glow = 1.0;
  return s;
}

Surface blackHoleSurface(vec3 p) {
  Surface s;
  float rim = pow(1.0 - abs(p.z), 1.8);
  s.color = vec3(0.002) + uPalette[4] * rim * 0.12;
  s.height = 0.0;
  s.land = 0.0;
  s.glow = 0.0;
  return s;
}

Surface getSurface(vec3 p) {
  if (uBody == 1) return gasSurface(p);
  if (uBody == 6) return toxicSurface(p);
  if (uBody == 7) return starSurface(p);
  if (uBody == 8) return blackHoleSurface(p);
  return rockySurface(p);
}

Ring getRing(vec2 uv, float radius) {
  float angle = (uRingAngle - 0.5) * 3.14159;
  vec2 screen = rotate2(angle) * uv;
  float tilt = mix(0.12, 0.88, uRingTilt);
  vec2 plane = vec2(screen.x, screen.y / tilt);
  float d = length(plane);
  float inner = radius * mix(1.02, 1.5, uRingRadius);
  float outer = inner + radius * mix(0.12, 1.02, uRingWidth);
  float aa = max(1.0 / min(uResolution.x, uResolution.y), 0.004);
  float band = smoothstep(inner, inner + aa * 5.0, d) * (1.0 - smoothstep(outer - aa * 5.0, outer, d));
  float a = atan(plane.y, plane.x);
  float detail = mix(12.0, 92.0, uRingDetail);
  float lanes = 0.58 + 0.42 * noise(vec3(d * detail, a * 4.0, uSeed));
  float grooveWave = abs(sin(d * detail * 1.65 + noise(vec3(a * 3.0, uSeed, 1.0)) * 2.0));
  float grooves = mix(1.0, smoothstep(0.16, 0.86, grooveWave), uRingGaps);
  float dust = 0.82 + 0.18 * hash12(floor(plane * (54.0 + detail)) + uSeed);
  float mask = band * lanes * grooves * dust * uRingOpacity;
  float front = 1.0 - smoothstep(-0.055, 0.055, screen.y);
  vec3 color = mix(uPalette[1], uPalette[4], smoothstep(inner, outer, d));
  color = mix(color, uPalette[5], lanes * 0.16);
  return Ring(mask, front, color);
}

vec3 background(vec2 uv) {
  // Sparse, stable stars rather than per-pixel static behind a tiny sprite.
  vec3 color = vec3(0.016, 0.022, 0.029);
  float grid = hash12(floor(gl_FragCoord.xy) + uSeed);
  float density = (uBody == 0 || uBody == 4) ? 0.45 : 1.0;
  float star = step(1.0 - uStars * density * 0.012, grid) * uExportStars;
  float bright = step(1.0 - uStars * density * 0.002,
      hash12(floor(gl_FragCoord.xy / 2.0) + uSeed * 7.0)) * uExportStars;
  color += star * vec3(0.54, 0.65, 0.72);
  color += bright * mix(vec3(0.58, 0.71, 0.84), uPalette[5], 0.33) * 0.60;

  if (uBody == 8 && uExportRings > 0.5) {
    Ring disk = getRing(uv, 0.46);
    color = mix(color, uPalette[3] * 0.83 + uPalette[5] * 0.35,
        disk.mask * 0.82);
  }

  return color;
}

// Premultiplied-alpha accumulation keeps partially transparent ring edges
// correctly colored, while producing the same appearance over opaque space.
vec4 overLayer(vec4 dst, vec3 rgb, float coverage) {
  float a = clamp(coverage, 0.0, 1.0);
  return vec4(dst.rgb * (1.0 - a) + rgb * a,
              dst.a * (1.0 - a) + a);
}

// A moon is a small lit sphere, not a flat grayscale noise disc. Four
// authored materials keep its colors readable even on a 128px grid.
vec3 moonRock(vec3 surface, vec3 normal, vec3 light, vec3 geologyLight, float fi) {
  vec3 seed = vec3(uSeed * 0.013, fi * 9.71, uSeed * 0.007);
  float kind = mod(floor(uSeed * 0.017) + fi, 4.0);
  // The closest moon has a material that fits its parent planet; more
  // distant moons vary independently with the seed and orbital index.
  if (fi < 0.5) {
    if (uBody == 0 || uBody == 4) kind = 0.0;
    else if (uBody == 2) kind = 1.0;
    else if (uBody == 6) kind = 2.0;
    else if (uBody == 3) kind = 3.0;
  }

  vec3 shadow = vec3(0.16, 0.18, 0.20);
  vec3 mid = vec3(0.39, 0.42, 0.43);
  vec3 bright = vec3(0.72, 0.73, 0.70);
  if (kind > 0.5 && kind < 1.5) {
    // Ice moon: pale blue mineral frost over darker fractures.
    shadow = vec3(0.14, 0.27, 0.34);
    mid = vec3(0.43, 0.61, 0.66);
    bright = vec3(0.83, 0.91, 0.91);
  } else if (kind > 1.5 && kind < 2.5) {
    // Iron-rich moon: oxidized ochre regolith.
    shadow = vec3(0.25, 0.16, 0.14);
    mid = vec3(0.55, 0.34, 0.28);
    bright = vec3(0.81, 0.61, 0.47);
  } else if (kind > 2.5) {
    // Dark basaltic moon with restrained cool highlights.
    shadow = vec3(0.10, 0.12, 0.14);
    mid = vec3(0.28, 0.31, 0.34);
    bright = vec3(0.50, 0.53, 0.54);
  }

  float rockField = noise(surface * 5.3 + seed);
  float grain = noise(surface * 16.0 + seed * 2.3);
  vec3 rock = mix(shadow, mid, 0.73 + (rockField - 0.5) * 0.28);
  rock = mix(rock, bright, smoothstep(0.56, 0.81, rockField) * 0.53);
  rock *= 0.89 + grain * 0.18;

  // Four deterministic circular impact basins: dark floors, thin bright
  // raised rims. Craters occupy the spherical surface rather than XY noise.
  float relief = 0.0;
  for (int crater = 0; crater < 4; crater++) {
    float k = float(crater);
    float longitude = hash12(vec2(fi * 17.1 + k * 13.7, uSeed * 0.011)) * 6.2831853;
    float z = mix(0.18, 0.96, hash12(vec2(k * 7.73, uSeed * 0.019 + fi * 2.1)));
    vec3 center = vec3(cos(longitude) * sqrt(1.0 - z * z),
                       sin(longitude) * sqrt(1.0 - z * z), z);
    float r = mix(0.15, 0.34,
        hash12(vec2(fi * 3.1 + k * 19.3, uSeed * 0.004)));
    float chord = length(surface - center);
    float basin = 1.0 - smoothstep(r * 0.38, r * 0.85, chord);
    float rim = smoothstep(r * 0.66, r * 0.83, chord) *
                (1.0 - smoothstep(r * 0.94, r * 1.15, chord));
    float rimLight = clamp(dot(normalize(surface - center + vec3(0.001)),
                               geologyLight), -1.0, 1.0);
    relief -= basin * 0.23;
    relief += rim * (0.11 + rimLight * 0.075);
  }

  float ndl = dot(normal, light);
  float day = smoothstep(-0.15, 0.18, ndl);
  float irradiance = 0.20 + day * 0.24 + max(ndl, 0.0) * 0.73;
  vec3 shaded = clamp((rock + vec3(relief)) * irradiance, 0.0, 1.0);
  // Compact palette-like values preserve sharp, legible moon features.
  return floor(shaded * 22.0 + 0.5) / 22.0;
}

vec4 drawMoons(vec4 color, vec2 uv, float radius, vec3 light, float frontPass) {
  if (uMoons <= 0 || uExportMoons < 0.5) return color;

  float bestDepth = -1e6;
  vec3 nearestMoon = color.rgb;
  bool foundMoon = false;
  for (int i = 0; i < 8; i++) {
    if (i >= uMoons) break;
    float fi = float(i);

    // Golden-angle phase spacing gives varied moon arrangements rather
    // than a row of equally spaced identical grey discs.
    // Orbital geometry is packed by the CPU once per frame, leaving only
    // a tiny silhouette test in the full-screen fragment loop.
    vec4 orbit = uMoonData[i];
    float r = orbit.z;
    float depth = orbit.w;
    if (r <= 0.0) continue;
    float front = step(0.0, depth);
    if (abs(front - frontPass) > 0.5) continue;
    vec2 mxy = (uv - orbit.xy) / r;
    // Bounding-box rejection avoids expensive crater noise in empty sky.
    if (abs(mxy.x) >= 1.0 || abs(mxy.y) >= 1.0) continue;
    float distanceSquared = dot(mxy, mxy);
    if (distanceSquared >= 1.0 || depth <= bestDepth) continue;

    float z = sqrt(max(0.0, 1.0 - distanceSquared));
    vec3 normal = normalize(vec3(mxy, z));
    // Slow synchronous spin preserves stable crater features as moons orbit.
    // Tidally slow texture rotation; secondary time is frozen for seamless
    // exported planet rotations, so moon features remain stable in the loop.
    float orbitSpeed = mix(0.08, 0.62, uMoonSpeed) / sqrt(1.0 + fi * 0.24);
    float phase = uSeed * 0.0007 + fi * 2.3999632 + uTime * orbitSpeed;
    float moonSpin = phase * 0.10 + fi * 1.47;
    vec3 surface = rotateY(normal, moonSpin);
    nearestMoon = moonRock(surface, normal, light, rotateY(light, moonSpin), fi);
    bestDepth = depth;
    foundMoon = true;
  }
  if (foundMoon) return vec4(nearestMoon, 1.0);
  return color;
}


// A fixed 4x4 Bayer threshold map, expressed without dynamic array indexing.
float bayer4(vec2 pixel) {
  vec2 cell = mod(floor(pixel), 4.0);
  vec2 lowCell = mod(cell, 2.0);
  vec2 highCell = floor(cell * 0.5);
  float low = 2.0 * lowCell.x + 3.0 * lowCell.y - 4.0 * lowCell.x * lowCell.y;
  float high = 2.0 * highCell.x + 3.0 * highCell.y - 4.0 * highCell.x * highCell.y;
  return (low * 4.0 + high + 0.5) / 16.0;
}

// Illustrative layers inspired by Deep-Fold/PixelPlanets (MIT, 2020).
// The water, land, and clouds select independent, discrete material colors.
vec3 illustratedSurface(vec3 p, vec3 normal, vec3 light, float turn) {
  vec3 seedPos = vec3(uSeed * 0.019, uSeed * 0.027, uSeed * 0.013);
  float lighting = dot(normal, light);
  float dither = (bayer4(gl_FragCoord.xy) - 0.5) * uDither * 0.17;
  float band = lighting + dither - (uShade - 0.5) * 0.08;

  // Water: three hand-picked shade groups, not an interpolated noise texture.
  vec3 oceanShade = mix(uPalette[0], uPalette[5], 0.42);
  vec3 water = band < -0.26 ? oceanShade :
      (band > 0.43 ? mix(uPalette[1], uPalette[4], 0.13) : uPalette[1]);

  // Land: coherent continent shapes, with higher frequencies only for edges.
  float continent = fbm(p * (2.15 + uTerrain * 0.85) + seedPos);
  float fine = noise(p * (4.0 + uRoughness * 6.0) + seedPos * 2.0);
  float height = continent * 0.84 + fine * 0.16;
  float landCutoff = mix(0.42, 0.60, uWater);
  float landMask = step(landCutoff, height);
  // Shallow water outlines larger continents with a single flat tint.
  if (landMask < 0.5 && height > landCutoff - 0.055 &&
      band > -0.29)
    water = mix(uPalette[1], uPalette[5], 0.40);

  vec3 landShade = mix(uPalette[0], uPalette[5], 0.72);
  vec3 landSun = mix(uPalette[2], uPalette[4], 0.14);
  vec3 land = band < -0.29 ? landShade :
      (band > 0.40 ? landSun : uPalette[2]);
  float biome = noise(p * 6.5 + seedPos + vec3(3.0, 9.0, 2.0));
  if (biome > 0.68 && band > -0.24)
    land = mix(uPalette[2], uPalette[5], 0.31);
  if (biome < 0.29 && band > 0.06) land = landShade;
  if (biome > 0.58 && biome < 0.66 && band > 0.17)
    land = mix(uPalette[2], uPalette[4], 0.19);
  // Broad, sparse highland patches instead of contour-map rings.
  if (height > landCutoff + 0.08 && band > -0.22) {
    float highland = noise(p * (7.0 + uRoughness * 4.0) +
        seedPos + vec3(2.0, 5.0, 8.0));
    if (highland > 0.72)
      land = mix(uPalette[2], uPalette[0], 0.23);
  }
  if (uIce > 0.0) {
    float frost = abs(p.y) + uIce * 0.19 +
        noise(p * 4.4 + seedPos + 14.0) * 0.08;
    if (frost > 0.94 && landMask > 0.5)
      land = mix(uPalette[4], uPalette[3], 0.20);
  }

  vec3 color = mix(water, land, landMask);
  if (uCity > 0.0 && band < -0.26 && landMask > 0.5) {
    float settlement = noise(p * 25.0 + seedPos + 8.0);
    if (settlement > mix(0.91, 0.76, uCity))
      color = mix(uPalette[4], vec3(1.0, 0.71, 0.36), 0.44);
  }

  // Compact painterly cloud clusters. Use 3D spherical coordinates so
  // cloud shapes rotate naturally without enormous projected bands.
  if (uClouds > 0.0) {
    vec3 cp = rotateY(p, uTime * uCloudSpeed * 0.045);
    vec3 offsets = seedPos * 0.53 + vec3(8.7, 2.4, 4.1);

    // Soft low-frequency warp groups clouds into asymmetric weather systems.
    float driftX = noise(cp * 1.8 + offsets);
    float driftY = noise(cp * 2.2 + offsets + 12.0);
    vec3 weather = cp * vec3(2.8, 3.5, 2.9) +
        vec3((driftX - 0.5) * 1.25, (driftY - 0.5) * 0.85, 0.0);
    float large = noise(weather + offsets * 0.12);
    float small = noise(weather * 2.25 + offsets + 3.2);
    float cloudField = large * 0.76 + small * 0.24;

    // Higher cover settings add *more independent clusters* rather than
    // making one large front wider until it blankets the hemisphere.
    float cutoff = mix(0.77, 0.53, uClouds);
    float jitter = (bayer4(gl_FragCoord.xy) - 0.5) * uDither * 0.042;
    float cloudMask = step(cutoff + jitter, cloudField);
    float brightCore = step(cutoff + 0.085, cloudField);
    float shadowEdge = step(cutoff - 0.045 + jitter, cloudField) -
        cloudMask;

    vec3 cloudShadow = mix(uPalette[0], vec3(0.65, 0.73, 0.76), 0.80);
    vec3 cloudBright = mix(uPalette[4], vec3(0.93, 0.97, 0.93), 0.88);
    // One subdued shadow band and two deliberately chosen cloud shades.
    if (band > -0.34) color = mix(color, cloudShadow, shadowEdge * 0.19);
    vec3 cloudTint = band < -0.24 ? cloudShadow :
        (brightCore > 0.5 ? cloudBright : mix(cloudShadow, cloudBright, 0.62));
    color = mix(color, cloudTint, cloudMask * 0.86);
  }

  // A narrow painted outline keeps the spherical silhouette crisp.
  if (length(normal.xy) > 0.975)
    color = mix(color, uPalette[0], 0.67);
  return color;
}

void main() {
  vec2 uv = gl_FragCoord.xy / uResolution * 2.0 - 1.0;
  uv.x *= uResolution.x / uResolution.y;

  float radius = ((uBody == 0 || uBody == 4) && uRings < 0.5 ? 0.84 : 0.68) * uZoom;
  vec3 light = normalize(vec3(uLightX, -uLightY, 0.9));
  vec4 scene = uExportTransparent > 0.5 ? vec4(0.0) :
      vec4(background(uv), 1.0);

  float rings = max(uRings, step(7.5, float(uBody))) * uExportRings;
  Ring ring = Ring(0.0, 0.0, vec3(0.0));
  // Ring noise is expensive; do not sample it on ringless worlds.
  if (rings > 0.5) ring = getRing(uv, radius);
  float backRing = ring.mask * rings * (1.0 - ring.front);
  scene = overLayer(scene, ring.color * 0.72, backRing);
  scene = drawMoons(scene, uv, radius, light, 0.0);

  float d = length(uv);
  if (d <= radius) {
    vec3 color = vec3(0.0);
    vec2 xy = uv / radius;
    float z = sqrt(max(0.0, 1.0 - dot(xy, xy)));
    vec3 normal = normalize(vec3(xy, z));
    float turn = uTurn + uSeed * 0.00628318;
    vec3 p = rotateY(normal, turn);
    p = rotateX(p, sin(uSeed) * 0.22);

    if (uBody == 0 || uBody == 4) {
      color = illustratedSurface(p, normal, light, turn);
    } else {
    Surface surf = getSurface(p);
    float ndl = dot(normal, light);
    float lit = max(ndl, 0.0);
    float daylight = smoothstep(-0.17, 0.23, ndl);
    float night = 1.0 - smoothstep(-0.08, 0.25, ndl);
    float rim = pow(1.0 - normal.z, 2.65);

    if (uBody != 7) {
      float ambient = mix(0.43, 0.16, uShade);
      float direct = daylight * (0.39 + lit * 0.81);
      color = surf.color * (ambient + direct);
      // Restrict watery highlights to bodies that actually have oceans.
      if (uBody != 1 && uBody != 5 && uBody != 8) {
        float spec = pow(max(dot(reflect(-light, normal),
            vec3(0.0, 0.0, 1.0)), 0.0), 24.0);
        float waterMask = 1.0 - surf.land;
        color += uPalette[5] * spec * waterMask * daylight *
            (0.29 + uWater * 0.39);
      }
      color *= 0.95 + surf.height * 0.10;
    } else {
      color = surf.color * (1.08 + rim * 0.34);
    }

    if (uCity > 0.0 && uBody != 1 && uBody != 7 && uBody != 8) {
      float cityNet = smoothstep(0.71, 0.95, fbm(p * 28.0 + vec3(uSeed * 1.7)));
      color += vec3(1.0, 0.63, 0.25) * cityNet * surf.land * night * uCity * 1.3;
    }

    if (uClouds > 0.0 && uBody != 1 && uBody != 7 && uBody != 8) {
      float cloudsTurn = uExportLoop > 0.5 ? turn :
          turn * 1.12 + uTime * uCloudSpeed * 0.25;
      vec3 cp = rotateY(normal, cloudsTurn);
      if (uBody == 6) {
        // Small atmospheric wisps, not another large blurry cloud mask.
        float haze = noise(cp * (10.5 + uRoughness * 5.0) +
            vec3(uSeed * 0.13, uTime * uCloudSpeed * 0.07, 0.0));
        float flecks = noise(cp * 25.0 +
            vec3(4.0, uSeed * 0.09, uTime * uCloudSpeed * 0.10));
        float currents = noise(cp * vec3(5.0, 19.0, 5.0) +
            vec3(uSeed * 0.12, 0.0, uTime * 0.025));
        float coverage = smoothstep(mix(0.78, 0.59, uClouds), 0.88,
            haze * 0.53 + flecks * 0.22 + currents * 0.25);
        vec3 mist = mix(uPalette[2], uPalette[4], 0.54) *
            (0.37 + daylight * 0.59);
        color = mix(color, mist, coverage * uClouds * 0.48);
      } else {
        float cloud = fbm(cp * (5.0 + uRoughness * 10.0) +
            vec3(0.0, uSeed, uTime * uCloudSpeed * 0.18));
        float coverage = smoothstep(mix(0.80, 0.56, uClouds), 0.93, cloud);
        color *= 1.0 - coverage * 0.14 * daylight;
        vec3 cloudColor = mix(uPalette[4], vec3(0.94, 0.96, 0.97), 0.32) *
            (0.27 + daylight * 0.72);
        color = mix(color, cloudColor, coverage * (0.27 + uClouds * 0.49));
      }
    }

    float sunward = clamp(0.45 + ndl * 0.55, 0.0, 1.0);
    color += uPalette[5] * rim * uAtmosphere *
        (0.07 + 0.23 * sunward + 0.28 * surf.glow);
    color += vec3(1.0, 0.24, 0.06) * surf.glow * 0.37;
    }
    scene = vec4(color, 1.0);
  }

  float frontRing = ring.mask * rings * ring.front;
  if (frontRing > 0.0) {
    float dimBehindPlanet = mix(1.0, 0.82, smoothstep(radius * 0.2, radius, d));
    scene = overLayer(scene, ring.color * dimBehindPlanet, frontRing);
  }

  if (d > radius && uAtmosphere > 0.0 && uExportGlow > 0.5) {
    float outerHalo = radius * (1.17 + uAtmosphere * 0.19);
    if (d < outerHalo) {
      float halo = 1.0 - smoothstep(radius * 1.005, outerHalo, d);
      float side = clamp(0.55 + dot(normalize(uv), light.xy) * 0.44, 0.0, 1.0);
      float starBoost = step(6.5, float(uBody));
      float strength = halo * halo * uAtmosphere *
          (0.10 + 0.22 * side + starBoost * 0.34);
      if (uExportTransparent > 0.5)
        scene = overLayer(scene, uPalette[5], strength);
      else
        scene.rgb += uPalette[5] * strength;
    }
  }

  scene = drawMoons(scene, uv, radius, light, 1.0);

  // Convert accumulated premultiplied RGB back to straight-alpha pixels.
  vec3 color = scene.a > 0.0001 ? scene.rgb / scene.a : vec3(0.0);
  if (uBody != 0 && uBody != 4) {
    color = clamp(color, 0.0, 1.0);
    color = pow(color, vec3(0.94));
    float offset = (bayer4(gl_FragCoord.xy) - 0.5) * uDither * 0.72;
    color = floor(color * 26.0 + 0.5 + offset) / 26.0;
  }
  outColor = vec4(clamp(color, 0.0, 1.0), scene.a);
}`;

let program;
let uniforms;
let dirty = true;
let rotationPhase = 0;
let lastTickSeconds = 0;
let fpsFrames = 0;
let fpsTime = 0;
let recordingVideo = false;
let previewVisible = true;
let framePending = false;
let lastRenderedMs = -Infinity;
const session = createSessionStore(() => window.localStorage);
const editorPrefs = session.loadPreferences();
const exportOptionStore = createExportOptionStore(() => window.localStorage);
let exportOptions = exportOptionStore.load();
const animationStore = createAnimationStore(() => window.localStorage);
let animationSettings = animationStore.load();
let animationPreviewLoop = null;
let previewRequest = 0;
let activeExportController = null;
let editHistory;
let simulationSeconds = 0;
let batchController = null;
const paletteVectors = Object.fromEntries(
  Object.entries(palettes).map(([name, colors]) => [name, hexPalette(colors)]),
);

if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
  state.animate = false;
}

if (!gl) {
  setStatus("WebGL2 is not available in this browser");
} else {
  program = createProgram(vertexSource, fragmentSource);
  uniforms = collectUniforms(program);
  gl.useProgram(program);
  bindUi();
  syncExportUi(exportOptions);
  syncAnimationUi(animationSettings, { busy: Boolean(activeExportController) });
  // A shared link takes precedence over the most recently saved local world.
  if (!new URLSearchParams(window.location.hash.slice(1)).has("planet")) {
    const saved = session.loadPlanetCode();
    if (saved) {
      try {
        Object.assign(state, decodePlanetCode(saved));
        setStatus("Restored your previous planet");
      } catch {
        setStatus("Saved planet is invalid; started a new world");
      }
    }
  }
  loadPlanetFromUrl();
  editHistory = createHistory(state);
  window.addEventListener("hashchange", loadPlanetFromUrl);
  syncUi(state);
  syncEditorUi(editorPrefs, editHistory);
  syncTimelineUi(simulationSeconds, state.animate);
  resizeCanvas();
  requestFrame();
  document.addEventListener("visibilitychange", () => {
    lastTickSeconds = 0;
    if (!document.hidden) requestFrame();
  });
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(([entry]) => {
      previewVisible = entry.isIntersecting;
      lastTickSeconds = 0;
      if (previewVisible) requestFrame();
    }).observe(canvas);
  }
}

function createProgram(vertex, fragment) {
  const vs = compile(gl.VERTEX_SHADER, vertex);
  const fs = compile(gl.FRAGMENT_SHADER, fragment);
  const nextProgram = gl.createProgram();
  gl.attachShader(nextProgram, vs);
  gl.attachShader(nextProgram, fs);
  gl.linkProgram(nextProgram);

  if (!gl.getProgramParameter(nextProgram, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(nextProgram) || "Could not link shader program");
  }

  gl.deleteShader(vs);
  gl.deleteShader(fs);
  return nextProgram;
}

function compile(type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(shader) || "Could not compile shader");
  }

  return shader;
}

function collectUniforms(shaderProgram) {
  const names = [
    "uResolution",
    "uTime",
    "uTurn",
    "uSeed",
    "uBody",
    "uMoons",
    "uMoonData[0]",
    "uPalette[0]",
    "uZoom",
    "uLightX",
    "uLightY",
    "uWater",
    "uTerrain",
    "uRoughness",
    "uClouds",
    "uCloudSpeed",
    "uAtmosphere",
    "uStars",
    "uCity",
    "uStorm",
    "uIce",
    "uLava",
    "uRings",
    "uRingRadius",
    "uRingTilt",
    "uRingAngle",
    "uRingWidth",
    "uRingOpacity",
    "uRingGaps",
    "uRingDetail",
    "uShade",
    "uDither",
    "uMoonSpread",
    "uMoonTilt",
    "uMoonSpeed",
    "uMoonSize",
    "uExportTransparent",
    "uExportMoons",
    "uExportRings",
    "uExportGlow",
    "uExportStars",
    "uExportLoop",
  ];
  return Object.fromEntries(names.map((name) => [name, gl.getUniformLocation(shaderProgram, name)]));
}

function requestFrame() {
  // Don't schedule an idle frame loop when the preview is offscreen or paused.
  if (framePending || !gl || document.hidden || !previewVisible || recordingVideo || isPreviewOpen()) return;
  framePending = true;
  requestAnimationFrame(tick);
}

function invalidate() {
  dirty = true;
  requestFrame();
}

function tick(time) {
  framePending = false;
  if (document.hidden || !previewVisible || recordingVideo || isPreviewOpen()) return;

  // Avoid driving high-cost procedural shaders at 60–144 FPS.
  if (state.animate && !dirty && time - lastRenderedMs < 1000 / editorPrefs.previewFps) {
    requestFrame();
    return;
  }

  const nowSeconds = time * 0.001;
  if (!lastTickSeconds) lastTickSeconds = nowSeconds;
  const delta = Math.max(0, nowSeconds - lastTickSeconds);
  lastTickSeconds = state.animate ? nowSeconds : 0;
  if (state.animate) {
    simulationSeconds += delta;
    rotationPhase += delta * spinSpeed();
  }

  if (state.animate || dirty) {
    // All shader effects use the same simulation clock. Paused worlds cannot jump.
    draw(simulationSeconds);
    dirty = false;
    lastRenderedMs = time;
    syncTimelineUi(simulationSeconds, state.animate);
    if (state.animate) updateFps(time);
    else {
      fpsFrames = 0;
      fpsTime = 0;
      fpsEl.textContent = "PAUSED";
    }
  }
  if (state.animate) requestFrame();
}

function draw(timeSeconds = simulationSeconds, turn = rotationPhase, target = null, planet = state) {
  if (!target) resizeCanvas(planet);
  gl.bindFramebuffer(gl.FRAMEBUFFER, target?.framebuffer ?? null);
  const size = target?.size ?? canvas.width;
  gl.viewport(0, 0, size, size);
  gl.useProgram(program);

  const palette = paletteVectors[planet.palette] || paletteVectors.aurora;
  gl.uniform2f(uniforms.uResolution, size, size);
  gl.uniform1f(uniforms.uTime, timeSeconds);
  gl.uniform1f(uniforms.uTurn, turn);
  gl.uniform1f(uniforms.uSeed, Number(planet.seed) || 1);
  gl.uniform1i(uniforms.uBody, Number(planet.body));
  gl.uniform1i(uniforms.uMoons, Number(planet.moons));
  if (Number(planet.moons) > 0 && target?.options?.moons !== false)
    gl.uniform4fv(uniforms["uMoonData[0]"], moonOrbitVectors(planet, timeSeconds));
  gl.uniform3fv(uniforms["uPalette[0]"], palette);
  gl.uniform1f(uniforms.uZoom, Number(planet.zoom));
  gl.uniform1f(uniforms.uLightX, Number(planet.lightX));
  gl.uniform1f(uniforms.uLightY, Number(planet.lightY));
  gl.uniform1f(uniforms.uWater, Number(planet.water));
  gl.uniform1f(uniforms.uTerrain, Number(planet.terrain));
  gl.uniform1f(uniforms.uRoughness, Number(planet.roughness));
  gl.uniform1f(uniforms.uClouds, Number(planet.clouds));
  gl.uniform1f(uniforms.uCloudSpeed, Number(planet.cloudSpeed));
  gl.uniform1f(uniforms.uAtmosphere, Number(planet.atmosphere));
  gl.uniform1f(uniforms.uStars, Number(planet.stars));
  gl.uniform1f(uniforms.uCity, Number(planet.city));
  gl.uniform1f(uniforms.uStorm, Number(planet.storm));
  gl.uniform1f(uniforms.uIce, Number(planet.ice));
  gl.uniform1f(uniforms.uLava, Number(planet.lava));
  gl.uniform1f(uniforms.uRings, planet.rings ? 1 : 0);
  gl.uniform1f(uniforms.uRingRadius, Number(planet.ringRadius));
  gl.uniform1f(uniforms.uRingTilt, Number(planet.ringTilt));
  gl.uniform1f(uniforms.uRingAngle, Number(planet.ringAngle));
  gl.uniform1f(uniforms.uRingWidth, Number(planet.ringWidth));
  gl.uniform1f(uniforms.uRingOpacity, Number(planet.ringOpacity));
  gl.uniform1f(uniforms.uRingGaps, Number(planet.ringGaps));
  gl.uniform1f(uniforms.uRingDetail, Number(planet.ringDetail));
  gl.uniform1f(uniforms.uShade, Number(planet.shade));
  gl.uniform1f(uniforms.uDither, Number(planet.dither));
  gl.uniform1f(uniforms.uMoonSpread, Number(planet.moonSpread));
  gl.uniform1f(uniforms.uMoonTilt, Number(planet.moonTilt));
  gl.uniform1f(uniforms.uMoonSpeed, Number(planet.moonSpeed));
  gl.uniform1f(uniforms.uMoonSize, Number(planet.moonSize));
  const layers = target?.options;
  gl.uniform1f(uniforms.uExportTransparent, layers?.transparent ? 1 : 0);
  gl.uniform1f(uniforms.uExportMoons, layers?.moons === false ? 0 : 1);
  gl.uniform1f(uniforms.uExportRings, layers?.rings === false ? 0 : 1);
  gl.uniform1f(uniforms.uExportGlow, layers?.glow === false ? 0 : 1);
  gl.uniform1f(uniforms.uExportStars, layers?.stars === false ? 0 : 1);
  gl.uniform1f(uniforms.uExportLoop, target?.seamless ? 1 : 0);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
}

function resizeCanvas(planet = state) {
  const size = renderSize(planet);
  if (canvas.width !== size || canvas.height !== size) {
    canvas.width = size;
    canvas.height = size;
  }
}

function bindUi() {
  document.querySelectorAll("[data-key]").forEach((input) => {
    // Sliders preview continuously; the final change creates one undo step.
    // Numeric fields commit on change so the user can type multiple digits.
    const eventType = input.type === "range" ? "input" : "change";
    input.addEventListener(eventType, () => {
      if (input.disabled) return;
      if (input.type === "number" && (input.value.trim() === "" || !Number.isFinite(Number(input.value)))) {
        syncUi(state);
        return;
      }
      state[input.dataset.key] = readInput(input);
      if (input.dataset.key === "animate") lastTickSeconds = 0;
      normalizeState();
      syncUi(state);
      invalidate();
      if (eventType === "change") recordEdit();
    });
    if (input.type === "range") input.addEventListener("change", recordEdit);
  });

  const presetInput = document.querySelector("[data-export-preset]");
  presetInput.addEventListener("change", () => {
    const next = chooseExportPreset(presetInput.value);
    if (!next) return;
    exportOptions = next;
    exportOptionStore.save(exportOptions);
    syncExportUi(exportOptions);
  });
  document.querySelectorAll("[data-export-option]").forEach((checkbox) => {
    checkbox.addEventListener("change", () => {
      exportOptions = updateExportOption(
        exportOptions, checkbox.dataset.exportOption, checkbox.checked,
      );
      exportOptionStore.save(exportOptions);
      syncExportUi(exportOptions);
    });
  });

  document.querySelectorAll("[data-animation-setting]").forEach((input) => {
    input.addEventListener("change", () => {
      const name = input.dataset.animationSetting;
      const value = input.type === "checkbox" ? input.checked : Number(input.value);
      animationSettings = normalizeAnimationSettings({ ...animationSettings, [name]: value });
      animationStore.save(animationSettings);
      syncAnimationUi(animationSettings, { busy: Boolean(activeExportController) });
    });
  });

  document.querySelectorAll("[data-grid-preset]").forEach((button) => {
    button.addEventListener("click", () => {
      state.pixelSize = Number(button.dataset.gridPreset);
      syncUi(state);
      invalidate();
      recordEdit();
    });
  });

  document.querySelectorAll("[data-lock-preference]").forEach((input) => {
    input.addEventListener("change", () => {
      editorPrefs[input.dataset.lockPreference] = input.checked;
      session.savePreferences(editorPrefs);
      syncEditorUi(editorPrefs, editHistory);
    });
  });

  document.querySelectorAll("[data-preference]").forEach((input) => {
    input.addEventListener(input.type === "range" ? "input" : "change", () => {
      Object.assign(editorPrefs, normalizePreferences({ ...editorPrefs, [input.dataset.preference]: input.type === "range" ? Number(input.value) : input.value }));
      session.savePreferences(editorPrefs);
      syncEditorUi(editorPrefs, editHistory);
      fpsFrames = 0;
      fpsTime = 0;
      invalidate();
    });
  });

  const timeline = document.querySelector("[data-timeline]");
  timeline.addEventListener("input", () => {
    state.animate = false;
    lastTickSeconds = 0;
    const nextTime = Number(timeline.value);
    rotationPhase += (nextTime - simulationSeconds) * spinSpeed();
    simulationSeconds = nextTime;
    syncUi(state);
    syncTimelineUi(simulationSeconds, false);
    invalidate();
  });
  timeline.addEventListener("change", recordEdit);

  document.querySelectorAll("[data-action]").forEach((button) => {
    button.addEventListener("click", () => actions[button.dataset.action]());
  });

  document.querySelectorAll("[data-section-link], .preview-link, .section-preview-link").forEach((link) => {
    link.addEventListener("click", navigateEditorLink);
  });

  document.querySelectorAll("[data-preset]").forEach((button) => {
    button.addEventListener("click", () => {
      applyPreset(button.dataset.preset);
    });
  });

  const exportDialog = document.querySelector("#export-preview-dialog");
  document.querySelector("[data-export-preview-close]").addEventListener(
    "click", () => exportDialog.close(),
  );
  exportDialog.addEventListener("close", () => {
    stopAnimationPreview();
    lastTickSeconds = 0;
    invalidate();
  });
  document.querySelector("[data-animation-preview-toggle]").addEventListener("click", () => {
    animationPreviewLoop?.toggle();
  });

  const shortcutDialog = document.querySelector("#shortcuts-dialog");
  const toggleShortcuts = () => {
    if (shortcutDialog.open) shortcutDialog.close();
    else shortcutDialog.showModal();
  };
  document.querySelector("[data-shortcuts-open]").addEventListener("click", toggleShortcuts);
  document.querySelector("[data-shortcuts-close]").addEventListener("click", () => shortcutDialog.close());

  registerEditorHotkeys({
    runAction: (action) => actions[action]?.(),
    choosePreset: applyPreset,
    toggleHelp: toggleShortcuts,
    isHelpOpen: () => shortcutDialog.open,
    isModalOpen: () => exportDialog.open || shortcutDialog.open,
  });

  document.querySelector("[data-light-edit]").addEventListener("change", (event) => {
    canvas.dataset.lightEditing = String(event.target.checked);
  });

  let draggingLight = false;
  canvas.addEventListener("pointerdown", (event) => {
    if (!document.querySelector("[data-light-edit]").checked) return;
    draggingLight = true;
    canvas.setPointerCapture(event.pointerId);
    setLightFromPointer(event);
  });
  canvas.addEventListener("pointermove", (event) => {
    if (draggingLight) setLightFromPointer(event);
  });
  for (const eventName of ["pointerup", "pointercancel", "lostpointercapture"]) {
    canvas.addEventListener(eventName, () => {
      if (draggingLight) recordEdit();
      draggingLight = false;
    });
  }
}

function navigateEditorLink(event) {
  const destination = document.querySelector(event.currentTarget.getAttribute("href"));
  if (!destination) return;
  // The URL fragment belongs to the shared planet, not editor navigation.
  event.preventDefault();
  if (destination.tagName === "DETAILS") destination.open = true;
  destination.querySelector("summary, h1")?.focus({ preventScroll: true });
  destination.scrollIntoView({ block: "start" });
}

function readInput(input) {
  if (input.type === "checkbox") return input.checked;
  if (input.dataset.format === "percent") return Math.round(Number(input.value)) / 100;
  if (input.type === "number" && input.dataset.precision !== undefined) {
    const step = Number(input.step);
    return Number((Math.round(Number(input.value) / step) * step).toFixed(6));
  }
  if (input.type === "number" || input.type === "range") return Number(input.value);
  return input.value;
}

function setLightFromPointer(event) {
  const rect = canvas.getBoundingClientRect();
  state.lightX = clamp(((event.clientX - rect.left) / rect.width) * 2 - 1, -1, 1);
  state.lightY = clamp(((event.clientY - rect.top) / rect.height) * 2 - 1, -1, 1);
  syncUi(state);
  invalidate();
}

function persistCurrentPlanet() {
  session.savePlanetCode(encodePlanetCode(state));
}

function recordEdit() {
  if (editHistory?.commit(state)) {
    batchController?.abort();
    persistCurrentPlanet();
    syncEditorUi(editorPrefs, editHistory);
  }
}

function restoreHistory(direction) {
  const next = editHistory?.[direction]();
  if (!next) return;
  batchController?.abort();
  Object.assign(state, next);
  lastTickSeconds = 0;
  normalizeState();
  syncUi(state);
  syncEditorUi(editorPrefs, editHistory);
  persistCurrentPlanet();
  invalidate();
  setStatus(direction === "undo" ? "Undid change" : "Redid change");
}

function seekSimulation(seconds) {
  const next = Math.max(0, seconds);
  rotationPhase += (next - simulationSeconds) * spinSpeed();
  simulationSeconds = next;
  state.animate = false;
  lastTickSeconds = 0;
  syncUi(state);
  syncTimelineUi(simulationSeconds, false);
  invalidate();
  recordEdit();
}

const actions = {
  undo() { restoreHistory("undo"); },
  redo() { restoreHistory("redo"); },
  stepBack() { seekSimulation(simulationSeconds - 1 / editorPrefs.previewFps); },
  stepForward() { seekSimulation(simulationSeconds + 1 / editorPrefs.previewFps); },
  rerollSeed() {
    state.seed = Math.floor(Math.random() * 999999) + 1;
    syncUi(state);
    invalidate();
    recordEdit();
    setStatus(`New seed ${state.seed} (all other settings kept)`);
  },
  toggleAnimation() {
    state.animate = !state.animate;
    lastTickSeconds = 0;
    syncUi(state);
    invalidate();
    recordEdit();
    setStatus(state.animate ? "Animation resumed" : "Animation paused");
  },
  resetWorld() {
    Object.assign(state, resetPlanet(state));
    syncUi(state);
    invalidate();
    recordEdit();
    setStatus("Restored this planet type’s preset · seed kept · Undo to restore your edits");
  },
  randomize() {
    randomize();
  },
  mutate() {
    mutate();
  },
  async previewExport() {
    stopAnimationPreview();
    const request = previewRequest;
    const snapshot = captureExport();
    let renderer;
    try {
      renderer = await snapshot.createFrameRenderer();
      if (request !== previewRequest) return;
      const frame = renderer.render(snapshot.simulationSeconds, snapshot.rotationPhase, snapshot.exportOptions);
      const preview = document.querySelector("#export-preview-canvas");
      preview.width = preview.height = snapshot.state.size;
      const ctx = preview.getContext("2d");
      if (!ctx) throw new Error("Preview canvas unavailable");
      ctx.clearRect(0, 0, preview.width, preview.height);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(exportCanvas(frame, snapshot.state.size), 0, 0);
      document.querySelector("#export-preview-title").textContent = "PNG preview";
      document.querySelector("[data-preview-description]").textContent =
        `${snapshot.state.size} × ${snapshot.state.size} px · ${snapshot.exportOptions.transparent ? "Transparent" : "Full background"}`;
      document.querySelector("[data-export-preview-playback]").hidden = true;
      document.querySelector("#export-preview-dialog").showModal();
    } catch (error) {
      if (request === previewRequest)
        setStatus(`Export preview failed: ${error?.message || "unknown error"}`);
    } finally {
      renderer?.dispose();
      invalidate();
    }
  },
  async previewAnimation() {
    if (!animationSummary(animationSettings).valid) {
      setStatus("Reduce length or FPS to 120 frames or fewer");
      return;
    }
    stopAnimationPreview();
    const request = previewRequest;
    const snapshot = captureExport();
    let renderer;
    try {
      const { startAnimationPreview } = await import("./animation-preview.js");
      if (request !== previewRequest) return;
      renderer = await snapshot.createFrameRenderer();
      if (request !== previewRequest) return;
      const plan = createFramePlan({
        ...snapshot.animationSettings,
        baseTime: snapshot.simulationSeconds,
        baseTurn: snapshot.rotationPhase,
        spinSpeed: snapshot.spinSpeed(),
      });
      const dialog = document.querySelector("#export-preview-dialog");
      document.querySelector("#export-preview-title").textContent = "Animation preview";
      document.querySelector("[data-preview-description]").textContent =
        `${snapshot.state.size} × ${snapshot.state.size} px · ${plan.frames} frames · ${plan.fps} FPS`;
      const previewCanvas = document.querySelector("#export-preview-canvas");
      previewCanvas.width = previewCanvas.height = snapshot.state.size;
      const playback = document.querySelector("[data-export-preview-playback]");
      playback.hidden = false;
      dialog.showModal();
      animationPreviewLoop = startAnimationPreview({
        renderer, plan, options: snapshot.exportOptions,
        canvas: document.querySelector("#export-preview-canvas"),
        label: document.querySelector("[data-preview-frame]"),
        repeat: snapshot.animationSettings.repeat,
        onPlaybackChange: (playing) => {
          document.querySelector("[data-animation-preview-toggle]").textContent = playing ? "Pause" : "Play";
        },
      });
      renderer = null; // preview loop owns the framebuffer lifecycle
    } catch (error) {
      if (request === previewRequest) {
        document.querySelector("#export-preview-dialog").close();
        setStatus(`Animation preview failed: ${error?.message || "unknown error"}`);
      }
    } finally {
      renderer?.dispose();
      invalidate();
    }
  },
  async exportPng() {
    const snapshot = captureExport();
    let renderer;
    try {
      renderer = await snapshot.createFrameRenderer();
      const frame = renderer.render(snapshot.simulationSeconds, snapshot.rotationPhase, snapshot.exportOptions);
      const suffix = snapshot.exportOptions.transparent ? "-transparent" : "";
      await downloadCanvas(exportCanvas(frame, snapshot.state.size), `planet-${snapshot.state.seed}${suffix}.png`);
      setStatus(`Exported ${snapshot.exportOptions.transparent ? "transparent" : "opaque"} PNG ${snapshot.state.size}×${snapshot.state.size}`);
    } catch (error) {
      setStatus(`PNG export failed: ${error?.message || "unknown error"}`);
    } finally {
      renderer?.dispose();
      invalidate();
    }
  },
  exportSheet() {
    runExtra("exportSheet");
  },
  exportVideo() {
    runExtra("exportVideo");
  },
  exportApng() { runExtra("exportApng"); },
  exportGif() { runExtra("exportGif"); },
  cancelAnimatedExport() {
    if (activeExportController) {
      activeExportController.abort();
      setStatus("Export cancelled");
    }
  },
  copyCode() {
    copyText(serializeState(), "Copied planet code");
  },
  shareLink() {
    const url = new URL(window.location.href);
    url.hash = `planet=${encodePlanetCode(state, { urlSafe: true })}`;
    copyText(url.toString(), "Copied shareable planet link");
  },
  loadCode() {
    const input = prompt("Paste planet code or share link");
    if (!input) return;

    try {
      let code = input.trim();
      if (/^https?:\/\//i.test(code)) {
        code = new URLSearchParams(new URL(code).hash.slice(1)).get("planet");
      }
      applyPlanetCode(code);
      setStatus("Loaded planet code");
    } catch {
      setStatus("Could not load planet code");
    }
  },
  batch() {
    runExtra("generateBatch");
  },
};

function applyPlanetCode(code) {
  Object.assign(state, decodePlanetCode(code));
  lastTickSeconds = 0;
  normalizeState();
  syncUi(state);
  invalidate();
  recordEdit();
}

function loadPlanetFromUrl() {
  const code = new URLSearchParams(window.location.hash.slice(1)).get("planet");
  if (!code) return;
  try {
    applyPlanetCode(code);
    setStatus("Loaded shared planet");
  } catch {
    setStatus("Invalid planet link");
  }
}

function applyPreset(name) {
  const preset = presets[name];
  if (!preset) return;
  const seed = Math.floor(Math.random() * 999999) + 1;
  Object.assign(state, nextPresetState(state, defaultPlanetState, preset, seed));
  normalizeState();
  syncUi(state);
  invalidate();
  recordEdit();
  setStatus(`${name} preset`);
}

function randomize() {
  const seed = Math.floor(Math.random() * 999999) + 1;
  Object.assign(state, generatePlanet(state, { ...editorPrefs, seed }));
  syncUi(state);
  invalidate();
  recordEdit();
  setStatus(`New world · seed ${state.seed}`);
}

function mutate() {
  const seed = Math.floor(Math.random() * 999999) + 1;
  Object.assign(state, generatePlanet(state, { seed, similar: true }));
  syncUi(state);
  invalidate();
  recordEdit();
  setStatus(`Related world · seed ${state.seed}`);
}

// Optional tools form a separate chunk and are fetched only on first use.
async function runExtra(action) {
  if (recordingVideo || activeExportController || !gl) return;
  const isVideo = action === "exportVideo";
  const isAnimated = action === "exportApng" || action === "exportGif";
  const isBatch = action === "generateBatch";
  if (isAnimated && !animationSummary(animationSettings).valid) {
    setStatus("Reduce length or FPS to 120 frames or fewer");
    return;
  }
  if (isVideo) recordingVideo = true;
  if (isBatch) batchController?.abort();
  const controller = new AbortController();
  if (isBatch) batchController = controller;
  if (!isBatch) {
    activeExportController = controller;
    setExportBusy(true);
    setStatus(isVideo ? "Preparing video export…" : isAnimated ? "Preparing animation export…" : "Preparing spritesheet export…");
  }

  const snapshot = captureExport();
  const generationPreferences = { ...editorPrefs };
  try {
    const extra = await import("./extra-actions.js");
    if (controller?.signal.aborted) return;
    await extra[action]({
      ...snapshot,
      // Batch generation deliberately edits the live state temporarily; exports
      // use the world captured before their first lazy import or yielded frame.
      ...(isBatch ? { state, draw } : {}),
      palettes, canvas, batchStrip, downloadCanvas, downloadBlob,
      basePlanet: snapshot.state, editorPrefs: generationPreferences,
      syncUi, normalizeState, resizeCanvas, invalidate, recordEdit,
      setStatus, clampInt, sleep,
      signal: controller?.signal,
      yieldControl: () => new Promise((resolve) => setTimeout(resolve, 0)),
    });
  } catch (error) {
    const label = isBatch ? "Variations" : action === "exportSheet" ? "Sheet export" :
      isAnimated ? "Animation export" : "Video export";
    if (!controller?.signal.aborted) setStatus(`${label} failed: ${error?.message || "unknown error"}`);
  } finally {
    if (isVideo) {
      recordingVideo = false;
      lastTickSeconds = 0;
    }
    if (isBatch && batchController === controller) batchController = null;
    if (!isBatch && activeExportController === controller) {
      activeExportController = null;
      setExportBusy(false);
    }
    invalidate();
  }
}

function setExportBusy(busy) {
  document.querySelectorAll("[data-export-start]").forEach((button) => { button.disabled = busy; });
  document.querySelector('[data-action="cancelAnimatedExport"]').hidden = !busy;
  syncAnimationUi(animationSettings, { busy });
}

function isPreviewOpen() {
  return document.querySelector("#export-preview-dialog").open;
}

function stopAnimationPreview() {
  previewRequest += 1;
  animationPreviewLoop?.stop();
  animationPreviewLoop = null;
}

function captureExport() {
  const planet = { ...state };
  const drawSnapshot = (time, turn, target) => draw(time, turn, target, planet);
  return {
    state: planet,
    simulationSeconds,
    rotationPhase,
    spinSpeed: () => spinSpeed(planet),
    draw: drawSnapshot,
    exportOptions: { ...exportOptions },
    animationSettings: { ...animationSettings },
    createFrameRenderer: async () => {
      const { createExportRenderer } = await import("./export-renderer.js");
      return createExportRenderer(gl, drawSnapshot, renderSize(planet));
    },
  };
}

function normalizeState() {
  Object.assign(state, normalizePlanetState(state));
}

function renderSize(planet = state) {
  return clampInt(planet.pixelSize, 32, 512);
}

function spinSpeed(planet = state) {
  return 0.18 + Number(planet.spin) * 1.35;
}

function exportCanvas(source = canvas, outputSize = state.size) {
  const size = clampInt(outputSize, 64, 512);
  if (source.width === size && source.height === size) return source;
  const output = document.createElement("canvas");
  output.width = size;
  output.height = size;
  const ctx = output.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(source, 0, 0, size, size);
  return output;
}

function hexPalette(colors) {
  return new Float32Array(colors.flatMap((hex) => {
    const n = Number.parseInt(hex.slice(1), 16);
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
  }));
}

function serializeState() {
  return encodePlanetCode(state);
}

async function copyText(value, successMessage) {
  try {
    if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
    await navigator.clipboard.writeText(value);
    setStatus(successMessage);
  } catch {
    prompt("Copy to clipboard", value);
    setStatus("Clipboard unavailable; copy from the dialog");
  }
}

function downloadCanvas(sourceCanvas, filename, { signal } = {}) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new Error("Export cancelled"));
      return;
    }
    sourceCanvas.toBlob((blob) => {
      if (signal?.aborted) {
        reject(new Error("Export cancelled"));
        return;
      }
      if (!blob) {
        reject(new Error("Could not encode PNG"));
        return;
      }
      try {
        downloadBlob(blob, filename);
        resolve();
      } catch (error) {
        reject(error);
      }
    }, "image/png");
  });
}

function downloadBlob(blob, filename) {
  const link = document.createElement("a");
  const objectUrl = URL.createObjectURL(blob);
  link.href = objectUrl;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  // Revoking immediately can cancel downloads in some browsers.
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 30_000);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function updateFps(time) {
  fpsFrames += 1;
  if (!fpsTime) fpsTime = time;
  if (time - fpsTime >= 500) {
    const fps = Math.round((fpsFrames * 1000) / (time - fpsTime));
    fpsEl.textContent = `${fps} / ${editorPrefs.previewFps} fps`;
    fpsFrames = 0;
    fpsTime = time;
  }
}

function setStatus(message) {
  statusEl.textContent = message;
  if (/export|encoding|recording/i.test(message)) {
    document.querySelector("[data-export-feedback]").textContent = message;
  }
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, Number(value)));
}

function clampInt(value, min, max) {
  return Math.round(clamp(value, min, max));
}

