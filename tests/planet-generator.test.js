import test from "node:test";
import assert from "node:assert/strict";
import { generatePlanet, resetPlanet } from "../src/planet-generator.js";
import { defaultPlanetState, presets } from "../src/config.js";
import { normalizePlanetState } from "../src/planet-state.js";

for (const [name, preset] of Object.entries(presets)) {
  test(`${name} generation is seeded, coherent, moon-free and preserves locks/output`, () => {
    const current = { ...defaultPlanetState, ...preset, size: 512, pixelSize: 256, palette: "mono" };
    const first = generatePlanet(current, { seed: 4242, lockType: true, lockPalette: true });
    assert.deepEqual(first, generatePlanet(current, { seed: 4242, lockType: true, lockPalette: true }));
    assert.notDeepEqual(first, generatePlanet(current, { seed: 123, lockType: true, lockPalette: true }));
    assert.equal(first.body, preset.body);
    assert.equal(first.palette, "mono");
    assert.equal(first.moons, 0);
    assert.equal(first.size, 512);
    assert.equal(first.pixelSize, 256);
    assert.deepEqual(first, normalizePlanetState(first));
    assert.ok(Math.abs(first.water - preset.water) <= 0.121);
    assert.ok(Math.abs(first.clouds - preset.clouds) <= 0.161);
    assert.equal(first.rings, preset.rings);
  });
}

test("similar worlds keep custom composition, palette and inactive effects", () => {
  const current = { ...defaultPlanetState, ...presets.gas, palette: "sulfur", zoom: 0.72, moons: 3, lightX: 0.5, water: 0.77 };
  const next = generatePlanet(current, { seed: 300, similar: true });
  for (const key of ["body", "palette", "zoom", "moons", "lightX", "water", "rings"])
    assert.equal(next[key], current[key], key);
  assert.notEqual(next.seed, current.seed);
  assert.ok(Math.abs(next.storm - current.storm) <= 0.091);
});

test("reset returns to the current family but keeps seed and export/playback settings", () => {
  const current = { ...defaultPlanetState, ...presets.lava, seed: 1234, terrain: 0.02, moons: 6, size: 512, animate: false };
  const reset = resetPlanet(current);
  assert.equal(reset.body, presets.lava.body);
  assert.equal(reset.terrain, presets.lava.terrain);
  assert.equal(reset.seed, 1234);
  assert.equal(reset.size, 512);
  assert.equal(reset.animate, false);
  assert.equal(reset.moons, 0);
  assert.equal(current.moons, 6);
});
