import test from "node:test";
import assert from "node:assert/strict";
import { state } from "../src/config.js";
import { controlAvailability } from "../src/control-availability.js";

const check = (key, world) => controlAvailability(key, { ...state, ...world });

test("gas giants expose storms but not rocky surfaces", () => {
  for (const key of ["water", "ice", "lava", "city", "clouds", "cloudSpeed", "roughness"])
    assert.equal(check(key, { body: 1 }).enabled, false, key);
  assert.equal(check("storm", { body: 1 }).enabled, true);
  assert.equal(check("terrain", { body: 1 }).enabled, true);
});

test("rocky world rules and dependent controls", () => {
  assert.equal(check("lava", { body: 0 }).enabled, false);
  assert.equal(check("lava", { body: 3 }).enabled, true);
  assert.equal(check("storm", { body: 6 }).enabled, false);
  assert.equal(check("cloudSpeed", { body: 0, clouds: 0 }).enabled, false);
  assert.equal(check("cloudSpeed", { body: 0, clouds: 0.3 }).enabled, true);
  assert.equal(check("water", { body: 5 }).enabled, false);
  assert.equal(check("water", { body: 6 }).enabled, true);
});

test("rings and moons dynamically unlock their settings", () => {
  assert.equal(check("ringOpacity", { body: 0, rings: false }).enabled, false);
  assert.equal(check("ringOpacity", { body: 0, rings: true }).enabled, true);
  assert.equal(check("ringOpacity", { body: 8, rings: false }).enabled, true);
  assert.equal(check("rings", { body: 8 }).enabled, false);
  assert.equal(check("moonSize", { moons: 0 }).enabled, false);
  assert.equal(check("moonSize", { moons: 1 }).enabled, true);
  assert.equal(check("moons", { moons: 0 }).enabled, true);
});

test("star controls and light controls only disable when ineffective", () => {
  assert.equal(check("shade", { body: 7 }).enabled, false);
  assert.equal(check("storm", { body: 7 }).enabled, true);
  assert.equal(check("terrain", { body: 7 }).enabled, false);
  assert.equal(check("lightX", { body: 7, moons: 0 }).enabled, false);
  assert.equal(check("lightX", { body: 7, moons: 1 }).enabled, true);
});
