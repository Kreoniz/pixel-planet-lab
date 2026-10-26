import "./styles.css";
import { palettes, presets, state } from "./config.js";
import { decodePlanetCode, encodePlanetCode, normalizePlanetState } from "./planet-state.js";
import { renderApp, syncUi } from "./ui.js";

renderApp(document.querySelector("#app"));

const canvas = document.querySelector("#planetCanvas");
const gl = canvas.getContext("webgl2", {
  antialias: false,
  alpha: false,
  depth: false,
  preserveDrawingBuffer: true,
});

const statusEl = document.querySelector("#status");
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

float surfaceHeight(vec3 p) {
  float broad = fbm(p * (2.2 + uTerrain * 6.5) + vec3(uSeed, 0.0, 0.0));
  float fine = fbm(p * (12.0 + uRoughness * 42.0) + vec3(0.0, uSeed, 0.0));
  float ridges = abs(fbm(p * 9.0 + vec3(uSeed * 0.7)) - 0.5) * 2.0;
  float h = mix(broad, fine, 0.18 + uRoughness * 0.35);
  h = mix(h, max(h, ridges), uTerrain * 0.25);
  return clamp(pow(h, mix(1.65, 0.68, uTerrain)), 0.0, 1.0);
}

Surface rockySurface(vec3 p) {
  Surface s;
  float h = surfaceHeight(p);
  float waterLine = clamp(uWater, 0.03, 0.95);
  float shore = smoothstep(waterLine - 0.04, waterLine + 0.035, h);
  float coast = smoothstep(waterLine - 0.025, waterLine + 0.02, h) * (1.0 - smoothstep(waterLine + 0.025, waterLine + 0.09, h));
  float high = smoothstep(min(waterLine + 0.08, 0.99), 1.0, h);
  float mountain = smoothstep(0.62, 0.98, h);
  float moisture = fbm(p * 5.2 + vec3(uSeed * 0.31, 4.0, 0.0));
  float iceCap = clamp(smoothstep(0.48, 0.94, abs(p.y) + uIce * 0.46) + smoothstep(0.8, 1.0, h) * uIce * 0.45, 0.0, 1.0);

  vec3 sea = mix(uPalette[0] * 0.85, uPalette[1], smoothstep(waterLine - 0.26, waterLine + 0.02, h));
  sea = mix(sea, uPalette[5], coast * 0.14);
  vec3 plains = mix(uPalette[2] * 0.9, uPalette[3], moisture * 0.28 + high * 0.24);
  vec3 land = mix(plains, mix(uPalette[3], uPalette[4] * 0.82, mountain), mountain);
  land = mix(land, uPalette[3] * 1.1, coast * 0.5);
  land = mix(land, uPalette[4], iceCap * uIce);
  s.color = mix(sea, land, shore);
  s.color += (h - 0.5) * 0.08 * shore;
  s.height = h;
  s.land = shore;
  s.glow = 0.0;

  if (uBody == 2) {
    s.color = mix(s.color, uPalette[4], 0.45 + iceCap * 0.45);
    s.land = max(s.land, 0.55);
  }

  if (uBody == 3) {
    float crack = smoothstep(0.52, 0.84, fbm(p * (18.0 + uRoughness * 34.0) + vec3(uSeed * 2.0, uTime * 0.08, 0.0)));
    float trench = smoothstep(0.42, 0.74, abs(fbm(p * 8.0 + vec3(0.0, uSeed, 0.0)) - 0.5) * 2.0);
    float lava = max(1.0 - shore, crack * trench) * uLava;
    s.color = mix(s.color * 0.45, vec3(1.0, 0.2, 0.04), lava);
    s.glow = lava;
  }

  if (uBody == 4) {
    s.color = mix(sea, land, shore * 0.45);
    s.land *= 0.42;
  }

  if (uBody == 5) {
    s.color = mix(uPalette[1], uPalette[3], h);
    s.color = mix(s.color, uPalette[4], smoothstep(0.72, 0.98, h) * 0.22);
    s.land = 1.0;
  }

  if (uBody == 6) {
    float acid = smoothstep(0.25, 0.78, fbm(p * 6.0 + vec3(0.0, uSeed * 0.4, uTime * 0.05)));
    s.color = mix(uPalette[1], uPalette[3], acid);
    s.color = mix(s.color, uPalette[5], smoothstep(0.68, 0.95, acid) * 0.35);
    s.land = shore;
  }

  return s;
}

Surface gasSurface(vec3 p) {
  Surface s;
  float lat = p.y;
  float warp = fbm(p * 4.0 + vec3(uSeed, uTime * 0.05, 0.0));
  float bands = sin((lat * (18.0 + uTerrain * 24.0) + warp * 3.1 + uSeed) * 3.14159);
  float stripe = smoothstep(0.16, 0.86, bands * 0.5 + 0.5);
  float soft = fbm(vec3(lat * 10.0, p.x * 2.0 + uTime * 0.12, uSeed));
  float eddy = fbm(p * 15.0 + vec3(uSeed * 0.2, uTime * 0.18, 3.0));
  s.color = mix(uPalette[1] * 0.86, uPalette[3], stripe);
  s.color = mix(s.color, uPalette[4], soft * 0.2 + eddy * uStorm * 0.16);

  vec2 spot = vec2(p.x + 0.36 + sin(uSeed) * 0.1, p.y - 0.08);
  float storm = exp(-dot(spot / vec2(0.34, 0.15), spot / vec2(0.34, 0.15)) * 4.0);
  s.color = mix(s.color, uPalette[5], storm * uStorm);
  s.height = soft;
  s.land = 1.0;
  s.glow = 0.0;
  return s;
}

Surface starSurface(vec3 p) {
  Surface s;
  float plasma = fbm(p * (8.0 + uRoughness * 18.0) + vec3(uSeed, uTime * 0.32, 0.0));
  float flare = smoothstep(0.54, 0.98, fbm(p * 22.0 + vec3(0.0, uSeed, uTime * 0.8)));
  s.color = mix(uPalette[2], uPalette[4], plasma);
  s.color += uPalette[5] * flare * (0.35 + uStorm);
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
  vec3 color = vec3(0.025, 0.024, 0.026);
  float grid = hash12(floor(gl_FragCoord.xy) + uSeed);
  float star = step(1.0 - uStars * 0.028, grid);
  float bright = step(1.0 - uStars * 0.004, hash12(floor(gl_FragCoord.xy / 2.0) + uSeed * 7.0));
  color += star * vec3(0.75, 0.79, 0.88);
  color += bright * uPalette[5] * 0.65;

  if (uBody == 8) {
    Ring disk = getRing(uv, 0.46);
    color = mix(color, uPalette[3] * 1.25 + uPalette[5] * 0.45, disk.mask * 0.9);
  }

  return color;
}

vec3 drawMoons(vec3 color, vec2 uv, float radius, vec3 light, float frontPass) {
  if (uMoons <= 0) return color;
  for (int i = 0; i < 8; i++) {
    if (i >= uMoons) break;
    float fi = float(i);
    float speed = mix(0.08, 0.62, uMoonSpeed) * (1.0 + fi * 0.08);
    float a = uSeed * 0.0007 + fi * 1.74 + uTime * speed;
    float orbit = radius * (1.12 + uMoonSpread * 0.58 + fi * mix(0.07, 0.2, uMoonSpread));
    float tilt = mix(0.16, 0.72, uMoonTilt);
    vec2 ellipse = vec2(cos(a) * orbit, sin(a) * radius * (tilt + fi * 0.015));
    vec2 pos = rotate2((uMoonTilt - 0.5) * 0.45 + sin(uSeed + fi) * 0.12) * ellipse;
    float front = step(0.0, sin(a));
    if (abs(front - frontPass) > 0.5) continue;

    float r = radius * mix(0.035, 0.12, uMoonSize) * (1.0 + fi * 0.07);
    float d = length(uv - pos);
    if (d < r) {
      vec2 mxy = (uv - pos) / r;
      float z = sqrt(max(0.0, 1.0 - dot(mxy, mxy)));
      vec3 n = normalize(vec3(mxy, z));
      float lit = clamp(dot(n, light), 0.0, 1.0);
      float pits = fbm(vec3(mxy * 6.0, uSeed + fi));
      vec3 moon = mix(vec3(0.25), vec3(0.74), pits) * (0.25 + lit * 0.9) * mix(0.74, 1.0, front);
      color = moon;
    }
  }
  return color;
}

void main() {
  vec2 uv = gl_FragCoord.xy / uResolution * 2.0 - 1.0;
  uv.x *= uResolution.x / uResolution.y;

  float radius = 0.68 * uZoom;
  vec3 light = normalize(vec3(uLightX, -uLightY, 0.9));
  vec3 color = background(uv);

  float rings = max(uRings, step(7.5, float(uBody)));
  Ring ring = Ring(0.0, 0.0, vec3(0.0));
  // Ring noise is expensive; do not sample it on ringless worlds.
  if (rings > 0.5) ring = getRing(uv, radius);
  float backRing = ring.mask * rings * (1.0 - ring.front);
  color = mix(color, ring.color * 0.72, backRing);
  color = drawMoons(color, uv, radius, light, 0.0);

  float d = length(uv);
  if (d <= radius) {
    vec2 xy = uv / radius;
    float z = sqrt(max(0.0, 1.0 - dot(xy, xy)));
    vec3 normal = normalize(vec3(xy, z));
    float turn = uTurn + uSeed * 0.00628318;
    vec3 p = rotateY(normal, turn);
    p = rotateX(p, sin(uSeed) * 0.22);

    Surface surf = getSurface(p);
    float lit = clamp(dot(normal, light), 0.0, 1.0);
    float night = 1.0 - smoothstep(-0.16, 0.34, lit);
    float rim = pow(1.0 - normal.z, 2.2);

    if (uBody != 7) {
      float ambient = mix(0.78, 0.18, uShade);
      color = surf.color * (ambient + lit * (1.04 + uShade * 0.4));
      float waterSpec = pow(max(dot(reflect(-light, normal), vec3(0.0, 0.0, 1.0)), 0.0), 18.0);
      color += uPalette[5] * waterSpec * (1.0 - surf.land) * (0.16 + uWater * 0.18);
      color *= 0.94 + surf.height * 0.12;
    } else {
      color = surf.color * (1.0 + rim * 0.55);
    }

    if (uCity > 0.0 && uBody != 1 && uBody != 7 && uBody != 8) {
      float cityNet = smoothstep(0.68, 0.94, fbm(p * 28.0 + vec3(uSeed * 1.7)));
      color += vec3(1.0, 0.63, 0.25) * cityNet * surf.land * night * uCity * 1.5;
    }

    if (uClouds > 0.0 && uBody != 1 && uBody != 7 && uBody != 8) {
      vec3 cp = rotateY(normal, turn * 1.12 + uTime * uCloudSpeed * 0.25);
      float cloud = fbm(cp * (5.0 + uRoughness * 13.0) + vec3(0.0, uSeed, uTime * uCloudSpeed * 0.18));
      float mask = smoothstep(1.0 - uClouds * 0.72, 1.0, cloud);
      vec3 cloudColor = mix(vec3(0.78), uPalette[4], 0.35) * (0.42 + lit * 0.78);
      color = mix(color, cloudColor, mask * (0.25 + uClouds * 0.5));
    }

    color += uPalette[5] * rim * uAtmosphere * (0.22 + 0.35 * surf.glow);
    color += vec3(1.0, 0.22, 0.06) * surf.glow * 0.45;
  }

  float frontRing = ring.mask * rings * ring.front;
  if (frontRing > 0.0) {
    float dimBehindPlanet = mix(1.0, 0.82, smoothstep(radius * 0.2, radius, d));
    color = mix(color, ring.color * dimBehindPlanet, frontRing);
  }

  if (d > radius) {
    float halo = 1.0 - smoothstep(radius, radius * (1.28 + uAtmosphere * 0.25), d);
    float starBoost = step(6.5, float(uBody));
    color += uPalette[5] * halo * uAtmosphere * (0.16 + starBoost * 0.52);
  }

  color = drawMoons(color, uv, radius, light, 1.0);

  float grain = (hash12(gl_FragCoord.xy + uSeed) - 0.5) * uDither * 0.08;
  color += grain;
  color = clamp(color, 0.0, 1.0);
  color = pow(color, vec3(0.92));
  color = mix(color, color * color * (3.0 - 2.0 * color), 0.12);
  color = floor(color * 20.0) / 20.0;
  outColor = vec4(color, 1.0);
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
const frameIntervalMs = 1000 / 30;
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
  loadPlanetFromUrl();
  window.addEventListener("hashchange", loadPlanetFromUrl);
  syncUi(state);
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
  ];
  return Object.fromEntries(names.map((name) => [name, gl.getUniformLocation(shaderProgram, name)]));
}

function requestFrame() {
  // Don't schedule an idle frame loop when the preview is offscreen or paused.
  if (framePending || !gl || document.hidden || !previewVisible || recordingVideo) return;
  framePending = true;
  requestAnimationFrame(tick);
}

function invalidate() {
  dirty = true;
  requestFrame();
}

function tick(time) {
  framePending = false;
  if (document.hidden || !previewVisible || recordingVideo) return;

  // Avoid driving high-cost procedural shaders at 60–144 FPS.
  if (state.animate && !dirty && time - lastRenderedMs < frameIntervalMs) {
    requestFrame();
    return;
  }

  const timeSeconds = time * 0.001;
  if (!lastTickSeconds) lastTickSeconds = timeSeconds;
  if (state.animate) {
    const delta = Math.min(timeSeconds - lastTickSeconds, 0.1);
    rotationPhase += delta * spinSpeed();
  }
  lastTickSeconds = timeSeconds;

  if (state.animate || dirty) {
    draw(timeSeconds);
    dirty = false;
    lastRenderedMs = time;
    if (state.animate) updateFps(time);
    else {
      fpsFrames = 0;
      fpsTime = 0;
      fpsEl.textContent = "PAUSED";
    }
  }
  if (state.animate) requestFrame();
}

function draw(timeSeconds, turn = rotationPhase) {
  resizeCanvas();
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.useProgram(program);

  const palette = paletteVectors[state.palette] || paletteVectors.aurora;
  gl.uniform2f(uniforms.uResolution, canvas.width, canvas.height);
  gl.uniform1f(uniforms.uTime, timeSeconds);
  gl.uniform1f(uniforms.uTurn, turn);
  gl.uniform1f(uniforms.uSeed, Number(state.seed) || 1);
  gl.uniform1i(uniforms.uBody, Number(state.body));
  gl.uniform1i(uniforms.uMoons, Number(state.moons));
  gl.uniform3fv(uniforms["uPalette[0]"], palette);
  gl.uniform1f(uniforms.uZoom, Number(state.zoom));
  gl.uniform1f(uniforms.uLightX, Number(state.lightX));
  gl.uniform1f(uniforms.uLightY, Number(state.lightY));
  gl.uniform1f(uniforms.uWater, Number(state.water));
  gl.uniform1f(uniforms.uTerrain, Number(state.terrain));
  gl.uniform1f(uniforms.uRoughness, Number(state.roughness));
  gl.uniform1f(uniforms.uClouds, Number(state.clouds));
  gl.uniform1f(uniforms.uCloudSpeed, Number(state.cloudSpeed));
  gl.uniform1f(uniforms.uAtmosphere, Number(state.atmosphere));
  gl.uniform1f(uniforms.uStars, Number(state.stars));
  gl.uniform1f(uniforms.uCity, Number(state.city));
  gl.uniform1f(uniforms.uStorm, Number(state.storm));
  gl.uniform1f(uniforms.uIce, Number(state.ice));
  gl.uniform1f(uniforms.uLava, Number(state.lava));
  gl.uniform1f(uniforms.uRings, state.rings ? 1 : 0);
  gl.uniform1f(uniforms.uRingRadius, Number(state.ringRadius));
  gl.uniform1f(uniforms.uRingTilt, Number(state.ringTilt));
  gl.uniform1f(uniforms.uRingAngle, Number(state.ringAngle));
  gl.uniform1f(uniforms.uRingWidth, Number(state.ringWidth));
  gl.uniform1f(uniforms.uRingOpacity, Number(state.ringOpacity));
  gl.uniform1f(uniforms.uRingGaps, Number(state.ringGaps));
  gl.uniform1f(uniforms.uRingDetail, Number(state.ringDetail));
  gl.uniform1f(uniforms.uShade, Number(state.shade));
  gl.uniform1f(uniforms.uDither, Number(state.dither));
  gl.uniform1f(uniforms.uMoonSpread, Number(state.moonSpread));
  gl.uniform1f(uniforms.uMoonTilt, Number(state.moonTilt));
  gl.uniform1f(uniforms.uMoonSpeed, Number(state.moonSpeed));
  gl.uniform1f(uniforms.uMoonSize, Number(state.moonSize));
  gl.drawArrays(gl.TRIANGLES, 0, 3);
}

function resizeCanvas() {
  const size = renderSize();
  if (canvas.width !== size || canvas.height !== size) {
    canvas.width = size;
    canvas.height = size;
  }
}

function bindUi() {
  document.querySelectorAll("[data-key]").forEach((input) => {
    // Commit discrete controls on change, so typing "256" does not turn into
    // "2" on the first keystroke. Only continuous sliders redraw on input.
    const eventType = input.type === "range" ? "input" : "change";
    input.addEventListener(eventType, () => {
      if (input.disabled) return;
      if (input.type === "number" && (input.value.trim() === "" || !Number.isFinite(Number(input.value)))) {
        syncUi(state);
        return;
      }

      state[input.dataset.key] = readInput(input);
      normalizeState();
      syncUi(state);
      invalidate();
    });
  });

  document.querySelectorAll("[data-action]").forEach((button) => {
    button.addEventListener("click", () => actions[button.dataset.action]());
  });

  document.querySelectorAll("[data-preset]").forEach((button) => {
    button.addEventListener("click", () => {
      applyPreset(button.dataset.preset);
    });
  });

  let draggingLight = false;
  canvas.addEventListener("pointerdown", (event) => {
    draggingLight = true;
    canvas.setPointerCapture(event.pointerId);
    setLightFromPointer(event);
  });
  canvas.addEventListener("pointermove", (event) => {
    if (draggingLight) setLightFromPointer(event);
  });
  for (const eventName of ["pointerup", "pointercancel", "lostpointercapture"]) {
    canvas.addEventListener(eventName, () => {
      draggingLight = false;
    });
  }
}

function readInput(input) {
  if (input.type === "checkbox") return input.checked;
  if (input.dataset.format === "percent") return Number(input.value) / 100;
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

const actions = {
  randomize() {
    randomize();
  },
  mutate() {
    mutate();
  },
  async exportPng() {
    try {
      draw(performance.now() * 0.001);
      await downloadCanvas(exportCanvas(), `planet-${state.seed}.png`);
      setStatus(`Exported PNG ${state.size}x${state.size} from ${renderSize()}px grid`);
    } catch (error) {
      setStatus(`PNG export failed: ${error?.message || "unknown error"}`);
    }
  },
  exportSheet() {
    runExtra("exportSheet");
  },
  exportVideo() {
    runExtra("exportVideo");
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
  normalizeState();
  syncUi(state);
  invalidate();
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
  Object.assign(state, presets[name]);
  state.seed = Math.floor(Math.random() * 999999) + 1;
  normalizeState();
  syncUi(state);
  invalidate();
  setStatus(`${name} preset`);
}

function randomize() {
  const seed = Math.floor(Math.random() * 999999) + 1;
  const rng = mulberry32(seed);
  const keys = Object.keys(presets);
  Object.assign(state, presets[keys[Math.floor(rng() * keys.length)]]);
  state.seed = seed;
  state.palette = Object.keys(palettes)[Math.floor(rng() * Object.keys(palettes).length)];
  state.zoom = round(0.82 + rng() * 0.24);
  state.spin = round(0.08 + rng() * 0.58);
  state.terrain = round(rng());
  state.water = round(rng());
  state.roughness = round(rng());
  state.clouds = round(rng() * 0.9);
  state.cloudSpeed = round(rng() * 0.75);
  state.atmosphere = round(0.2 + rng() * 0.8);
  state.rings = rng() > 0.6;
  state.ringRadius = round(0.04 + rng() * 0.42);
  state.ringTilt = round(0.15 + rng() * 0.75);
  state.ringAngle = round(rng());
  state.ringWidth = round(0.2 + rng() * 0.8);
  state.ringOpacity = round(0.42 + rng() * 0.58);
  state.ringGaps = round(rng());
  state.ringDetail = round(0.25 + rng() * 0.75);
  state.moons = Math.floor(rng() * 9);
  state.moonSpread = round(rng());
  state.moonTilt = round(rng());
  state.moonSpeed = round(0.12 + rng() * 0.78);
  state.moonSize = round(0.18 + rng() * 0.68);
  state.lightX = round(-0.85 + rng() * 1.7);
  state.lightY = round(-0.75 + rng() * 1.5);
  normalizeState();
  syncUi(state);
  invalidate();
  setStatus(`Random seed ${state.seed}`);
}

function mutate() {
  const rng = mulberry32((Number(state.seed) || 1) + 1337);
  state.seed = Math.floor(rng() * 999999) + 1;
  ["terrain", "water", "roughness", "clouds", "storm", "ice", "lava", "city", "ringRadius", "ringTilt", "ringAngle", "ringWidth", "ringOpacity", "ringGaps", "ringDetail", "moonSpread", "moonTilt", "moonSpeed", "moonSize"].forEach((key) => {
    state[key] = round(clamp(Number(state[key]) + (rng() - 0.5) * 0.26, 0, 1));
  });
  normalizeState();
  syncUi(state);
  invalidate();
  setStatus(`Mutated seed ${state.seed}`);
}

// Optional tools form a separate chunk and are fetched only on first use.
async function runExtra(action) {
  if (recordingVideo || !gl) return;
  if (action === "exportVideo") recordingVideo = true;

  try {
    const extra = await import("./extra-actions.js");
    await extra[action]({
      state, palettes, canvas, draw, batchStrip,
      rotationPhase, spinSpeed, downloadCanvas, downloadBlob,
      syncUi, normalizeState, resizeCanvas, invalidate,
      setStatus, clampInt, round, sleep,
    });
  } catch (error) {
    const label = action === "generateBatch" ? "Variations" : action === "exportSheet" ? "Sheet export" : "Video export";
    setStatus(`${label} failed: ${error?.message || "unknown error"}`);
  } finally {
    recordingVideo = false;
    invalidate();
  }
}

function normalizeState() {
  Object.assign(state, normalizePlanetState(state));
}

function renderSize() {
  return clampInt(state.pixelSize, 32, 512);
}

function spinSpeed() {
  return 0.18 + Number(state.spin) * 1.35;
}

function exportCanvas() {
  const size = clampInt(state.size, 64, 512);
  if (canvas.width === size && canvas.height === size) return canvas;
  const output = document.createElement("canvas");
  output.width = size;
  output.height = size;
  const ctx = output.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(canvas, 0, 0, size, size);
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

function downloadCanvas(sourceCanvas, filename) {
  return new Promise((resolve, reject) => {
    sourceCanvas.toBlob((blob) => {
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
    fpsEl.textContent = `${fps} fps`;
    fpsFrames = 0;
    fpsTime = time;
  }
}

function setStatus(message) {
  statusEl.textContent = message;
}

function mulberry32(seed) {
  return function rng() {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, Number(value)));
}

function clampInt(value, min, max) {
  return Math.round(clamp(value, min, max));
}

function round(value) {
  return Math.round(value * 100) / 100;
}
