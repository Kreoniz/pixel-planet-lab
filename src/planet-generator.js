import { defaultPlanetState, presets } from "./config.js";
import { normalizePlanetState } from "./planet-state.js";
import { nextPresetState } from "./editor-state.js";
import { controlAvailability } from "./control-availability.js";

const families = Object.values(presets);
const suitablePalettes = [
  ["aurora", "reef"], ["dust", "ember", "glacier"], ["glacier", "reef", "mono"],
  ["ember", "dust"], ["reef", "glacier", "aurora"], ["dust", "ember"],
  ["sulfur", "reef"], ["ember", "glacier"], ["mono", "ember"],
];
const variation = {
  terrain: 0.18, water: 0.12, roughness: 0.18, clouds: 0.16,
  storm: 0.2, ice: 0.14, lava: 0.12, city: 0.12, atmosphere: 0.14,
  ringRadius: 0.06, ringTilt: 0.14, ringAngle: 0.18, ringWidth: 0.14,
  ringOpacity: 0.12, ringGaps: 0.18, ringDetail: 0.18,
};
const round = (value) => Math.round(value * 100) / 100;

export function seededRandom(seed) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function resetPlanet(current) {
  const preset = families.find(({ body }) => body === Number(current.body)) || presets.terrestrial;
  return normalizePlanetState(nextPresetState(current, defaultPlanetState, preset, current.seed));
}

// Start from an authored family, then vary its defining features together.
// Related worlds keep the current composition, type and palette.
export function generatePlanet(current, { seed = current.seed, lockType = false, lockPalette = false, similar = false } = {}) {
  const rng = seededRandom(seed);
  const family = similar || lockType
    ? families.find(({ body }) => body === Number(current.body)) || presets.terrestrial
    : families[Math.floor(rng() * families.length)];
  const planet = similar ? { ...current, seed }
    : nextPresetState(current, defaultPlanetState, family, seed);
  if (!similar) {
    const choices = suitablePalettes[family.body];
    planet.palette = lockPalette ? current.palette : choices[Math.floor(rng() * choices.length)];
    planet.moons = 0;
    planet.zoom = round(planet.rings ? 0.81 + rng() * 0.12 : 0.88 + rng() * 0.12);
    planet.spin = round(0.16 + rng() * 0.36);
    planet.lightX = round(-0.5 + (rng() - 0.5) * 0.42);
    planet.lightY = round(-0.35 + (rng() - 0.5) * 0.42);
  }
  for (const [key, amount] of Object.entries(variation)) {
    if (!controlAvailability(key, planet).enabled) continue;
    planet[key] = round(Math.max(0, Math.min(1,
      Number(planet[key]) + (rng() * 2 - 1) * amount * (similar ? 0.45 : 1))));
  }
  return normalizePlanetState(planet);
}
