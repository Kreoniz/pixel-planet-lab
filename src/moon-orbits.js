// Eight moon orbit positions are computed once per frame, not once per
// fragment. Packing (x, y, moonRadius, depth) into vec4 uniforms keeps
// procedural crater shading on the GPU while eliminating repeated trigonometry
// across tens of thousands of empty background pixels.
export const MAX_MOONS = 8;
export const GOLDEN_ANGLE = 2.3999632;

const clamp01 = (value) => Math.max(0, Math.min(1, Number(value) || 0));
const fract = (value) => value - Math.floor(value);

function hash2(x, y) {
  return fract(Math.sin(x * 127.1 + y * 311.7) * 43758.5453);
}

export function moonOrbitVectors(state, timeSeconds) {
  const packed = new Float32Array(MAX_MOONS * 4);
  const count = Math.min(MAX_MOONS, Math.max(0, Math.floor(Number(state.moons) || 0)));
  if (!count) return packed;

  const seed = Number(state.seed) || 1;
  const time = Number.isFinite(timeSeconds) ? timeSeconds : 0;
  const zoom = clamp01(Number(state.zoom) / 1.18) * 1.18;
  const body = Number(state.body);
  const size = clamp01(state.moonSize);
  const spread = clamp01(state.moonSpread);
  const inclination = clamp01(state.moonTilt);
  const speed = 0.08 + 0.54 * clamp01(state.moonSpeed);
  const radius = ((body === 0 || body === 4) && !state.rings ? 0.84 : 0.68) * zoom;
  const tilt = 0.23 + 0.57 * inclination;

  for (let i = 0; i < count; i++) {
    const angle = seed * 0.0007 + i * GOLDEN_ANGLE +
      time * speed / Math.sqrt(1 + i * 0.24);
    const orbit = radius * (1.10 + spread * 0.22 +
      i * (0.047 + (0.105 - 0.047) * spread));
    const angleOffset = (inclination - 0.5) * 0.76 +
      (hash2(i * 13.1, seed * 0.001) - 0.5) * 0.14;

    const x = Math.cos(angle) * orbit;
    const y = Math.sin(angle) * orbit * tilt;
    const cos = Math.cos(angleOffset), sin = Math.sin(angleOffset);
    const visualSize = 0.83 + hash2(i * 21.7 + 5, seed * 0.008) * 0.35;
    const moonRadius = radius * (0.065 + 0.130 * size) *
      visualSize * (1 - i * 0.044);

    const offset = i * 4;
    packed[offset] = x * cos - y * sin;
    packed[offset + 1] = x * sin + y * cos;
    packed[offset + 2] = moonRadius;
    packed[offset + 3] = Math.sin(angle) * orbit * Math.sqrt(1 - tilt * tilt);
  }
  return packed;
}
