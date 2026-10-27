import test from "node:test";
import assert from "node:assert/strict";
import { MAX_MOONS, GOLDEN_ANGLE, moonOrbitVectors } from "../src/moon-orbits.js";

const earth = {
  body: 0, seed: 4242, rings: false, zoom: 0.94,
  moons: 1, moonSpread: 0.42, moonTilt: 0.38,
  moonSpeed: 0.35, moonSize: 0.45,
};

test("packed moon data is deterministic and preserves source state", () => {
  const original = { ...earth };
  const first = moonOrbitVectors(earth, 4);
  assert.equal(first.length, MAX_MOONS * 4);
  assert.deepEqual(first, moonOrbitVectors(earth, 4));
  assert.deepEqual(earth, original);
  assert.ok(first[2] > 0);
  assert.ok(Number.isFinite(first[3]) && first[3] !== 0);
  assert.ok(first.subarray(4).every((v) => v === 0));
  assert.notDeepEqual(first, moonOrbitVectors({ ...earth, seed: 1 }, 4));
});

test("moons zero avoids any rendering work, maximum is eight", () => {
  assert.ok(moonOrbitVectors({ ...earth, moons: 0 }, 0).every((v) => v === 0));
  assert.equal(moonOrbitVectors({ ...earth, moons: 12 }, 0).filter((_, i) => i % 4 === 2 && _ > 0).length, 8);
  assert.equal(GOLDEN_ANGLE, 2.3999632);
});

test("satellites have distinct sizes, positions and stable orbit phases", () => {
  const state = { ...earth, body: 1, moons: 4, moonSpread: 0.68, moonTilt: 0.44, moonSize: 0.42 };
  const initial = moonOrbitVectors(state, 0);
  const next = moonOrbitVectors(state, 1);
  const centers = [];
  const sizes = [];
  for(let i = 0; i < state.moons; i++) {
    const j = i * 4;
    centers.push([initial[j], initial[j+1]]);
    sizes.push(initial[j+2]);
    assert.ok(Number.isFinite(initial[j+3]));
    assert.ok(initial[j+2] > 0.03 && initial[j+2] < 0.3);
    assert.ok(Math.abs(initial[j]) < 1.6);
    assert.ok(Math.abs(initial[j+1]) < 1.6);
  }
  assert.equal(new Set(centers.map(x => x.join(","))).size, state.moons);
  assert.equal(new Set(sizes).size, state.moons);
  assert.notDeepEqual(initial, next);
});

test("planet radius, orbit controls and zoom affect placements correctly", () => {
  const closer = moonOrbitVectors(earth, 0);
  const zoomed = moonOrbitVectors({ ...earth, zoom: 1.08 }, 0);
  assert.ok(zoomed[2] > closer[2]);
  const spread = moonOrbitVectors({ ...earth, moonSpread: 1 }, 0);
  assert.notDeepEqual(spread, closer);
  const tilt = moonOrbitVectors({ ...earth, moonTilt: 1 }, 0);
  assert.notDeepEqual(tilt, closer);
  assert.deepEqual(moonOrbitVectors({ ...earth, moons: 0 }, 12), new Float32Array(32));
});
