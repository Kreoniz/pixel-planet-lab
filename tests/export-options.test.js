import test from "node:test";
import assert from "node:assert/strict";
import {
  exportPresets, exportOptionKeys, chooseExportPreset,
  normalizeExportOptions, updateExportOption, createExportOptionStore,
} from "../src/export-options.js";

test("full scene remains default to preserve existing PNG behavior", () => {
  assert.deepEqual(normalizeExportOptions(null), {
    preset: "full-scene", transparent: false, moons: true, rings: true,
    glow: true, stars: true,
  });
  assert.deepEqual(chooseExportPreset("full-scene"), normalizeExportOptions(null));
});

test("planet-only exports exclude the background, moons, and ring details", () => {
  const planet = chooseExportPreset("planet-only");
  assert.deepEqual(planet, {
    preset: "planet-only", transparent: true, moons: false, rings: false,
    glow: false, stars: false,
  });
  assert.equal(chooseExportPreset("invalid"), null);
  assert.equal(exportOptionKeys.length, 5);
  assert.equal(chooseExportPreset("planet-rings").rings, true);
  assert.equal(chooseExportPreset("planet-rings").moons, false);
});

test("independent toggles infer presets or custom choices without mutating input", () => {
  const initial = chooseExportPreset("full-scene");
  const changed = updateExportOption(initial, "transparent", true);
  assert.equal(changed.preset, "custom");
  assert.equal(changed.transparent, true);
  assert.equal(changed.stars, false);
  assert.equal(initial.transparent, false);

  const planet = chooseExportPreset("planet-only");
  const withRings = updateExportOption(planet, "rings", true);
  assert.equal(withRings.preset, "custom");
  assert.deepEqual(exportPresets["planet-only"].moons, false);
  const withGlow = updateExportOption(withRings, "glow", true);
  assert.equal(withGlow.preset, "planet-rings");
  assert.deepEqual(updateExportOption(withGlow, "unknown", true), withGlow);
});

test("export option storage is isolated and safe when unavailable", () => {
  const items = new Map();
  const store = createExportOptionStore(() => ({
    setItem(k, v) { items.set(k, v); },
    getItem(k) { return items.get(k); },
  }));
  assert.equal(store.load().preset, "full-scene");
  assert.equal(store.save(chooseExportPreset("planet-only")), true);
  assert.equal(store.load().preset, "planet-only");
  assert.equal(createExportOptionStore(() => { throw Error("denied"); }).save({}), false);
  assert.equal(createExportOptionStore(() => { throw Error("denied"); }).load().preset, "full-scene");
});
