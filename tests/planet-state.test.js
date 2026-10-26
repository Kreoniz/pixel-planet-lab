import test from "node:test";
import assert from "node:assert/strict";
import { state } from "../src/config.js";
import { decodePlanetCode, encodePlanetCode, normalizePlanetState } from "../src/planet-state.js";

test("round-trips existing codes and URL-safe share codes", () => {
  const planet = normalizePlanetState({
    ...state,
    seed: 4242,
    body: 3,
    palette: "ember",
    rings: true,
    moons: 5,
    lightX: -0.6,
  });

  assert.deepEqual(decodePlanetCode(encodePlanetCode(planet)), planet);

  const urlCode = encodePlanetCode(planet, { urlSafe: true });
  assert.match(urlCode, /^[A-Za-z0-9_-]+$/);
  assert.deepEqual(decodePlanetCode(urlCode), planet);
});

test("fills missing legacy fields without dropping existing settings", () => {
  const decoded = decodePlanetCode(btoa(JSON.stringify({ seed: 17, palette: "glacier" })));
  assert.equal(decoded.seed, 17);
  assert.equal(decoded.palette, "glacier");
  assert.equal(decoded.videoFps, state.videoFps);
  assert.equal(decoded.moonSpread, state.moonSpread);
});

test("clamps out-of-range values and chooses valid select options", () => {
  const normalized = normalizePlanetState({
    ...state,
    seed: -200,
    moons: 900,
    lightX: -8,
    spin: Number.POSITIVE_INFINITY,
    videoFps: 99,
    body: 99,
    palette: "nonexistent",
    size: 123,
  });

  assert.equal(normalized.seed, 1);
  assert.equal(normalized.moons, 8);
  assert.equal(normalized.lightX, -1);
  assert.equal(normalized.spin, state.spin);
  assert.equal(normalized.videoFps, 60);
  assert.equal(normalized.body, state.body);
  assert.equal(normalized.palette, state.palette);
  assert.equal(normalized.size, state.size);
});

test("rejects malformed and mistyped planet codes", () => {
  for (const code of ["", "not base64!", btoa("null"), btoa("[]"), btoa(JSON.stringify({ seed: "5" }))]) {
    assert.throws(() => decodePlanetCode(code), /Invalid planet/);
  }
  assert.throws(() => decodePlanetCode("x".repeat(8193)), /Invalid planet code/);
});

test("does not allow unknown keys or prototype pollution through imported JSON", () => {
  const malicious = '{"seed":91,"__proto__":{"polluted":true},"unknown":{"a":1}}';
  const decoded = decodePlanetCode(btoa(malicious));

  assert.equal(decoded.seed, 91);
  assert.equal(Object.hasOwn(decoded, "__proto__"), false);
  assert.equal(Object.hasOwn(decoded, "unknown"), false);
  assert.equal({}.polluted, undefined);
  assert.deepEqual(Object.keys(decoded).sort(), Object.keys(state).sort());
});
