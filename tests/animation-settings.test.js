import test from "node:test";
import assert from "node:assert/strict";
import {
  animationDefaults, normalizeAnimationSettings,
  animationSummary, createAnimationStore,
} from "../src/animation-settings.js";

test("default animation is a four-second seamless loop", () => {
  assert.deepEqual(normalizeAnimationSettings(), animationDefaults);
  assert.deepEqual(animationSummary(animationDefaults), {
    frames: 48, valid: true,
    text: "48 frames · 4s at 12 FPS · seamless rotation",
  });
});

test("frame limits are clear and invalid input recovers defaults", () => {
  assert.match(animationSummary({ seconds: 10, fps: 30 }).text, /120-frame limit/);
  assert.equal(animationSummary({ seconds: 10, fps: 30 }).valid, false);
  assert.equal(normalizeAnimationSettings({ fps: "broken", seconds: 100 }).fps, 12);
  assert.equal(normalizeAnimationSettings({ fps: 24, seconds: 5, repeat: false }).repeat, false);
});

test("local animation settings persist apart from planet share codes", () => {
  const items = new Map();
  const store = createAnimationStore(() => ({
    getItem(key) { return items.get(key); },
    setItem(key, value) { items.set(key, value); },
  }));
  assert.deepEqual(store.load(), animationDefaults);
  assert.equal(store.save({ seconds: 7, fps: 16, seamless: false, repeat: false }), true);
  assert.deepEqual(store.load(), { seconds: 7, fps: 16, seamless: false, repeat: false });
  const unavailable = createAnimationStore(() => { throw Error("Storage unavailable"); });
  assert.equal(unavailable.save(animationDefaults), false);
  assert.deepEqual(unavailable.load(), animationDefaults);
});
