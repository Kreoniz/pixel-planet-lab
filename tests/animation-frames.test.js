import test from "node:test";
import assert from "node:assert/strict";
import { createFramePlan, runFrameSequence, TAU, MAX_ANIMATED_FRAMES } from "../src/animation-frames.js";

test("seamless frames rotate once while locking procedural time", () => {
  const plan = createFramePlan({
    seconds: 4, fps: 12, baseTime: 9.5,
    baseTurn: 0.8, seamless: true, spinSpeed: 0.7,
  });
  assert.equal(plan.frames, 48);
  assert.deepEqual(plan.frame(0), { time: 9.5, turn: 0.8, seamless: true });
  assert.equal(plan.frame(24).time, 9.5);
  assert.ok(Math.abs(plan.frame(24).turn - 0.8 - Math.PI) < 1e-12);
  assert.ok(Math.abs(plan.frame(47).turn + TAU / 48 - 0.8 - TAU) < 1e-12);
  assert.throws(() => plan.frame(48), RangeError);
});

test("timed spritesheet samples seconds, advances moons and honors frame count", () => {
  const plan = createFramePlan({
    seconds: 6, frames: 24, baseTime: 3,
    baseTurn: 5, spinSpeed: 0.4,
  });
  assert.equal(plan.frames, 24);
  assert.deepEqual(plan.frame(0), { time: 3, turn: 5, seamless: false });
  assert.equal(plan.frame(12).time, 6);
  assert.equal(plan.frame(12).turn, 6.2);
});

test("excessive exports have an actionable limit", () => {
  assert.equal(MAX_ANIMATED_FRAMES, 120);
  assert.throws(() => createFramePlan({ seconds: 10, fps: 30 }), /Invalid animation settings/);
  assert.throws(() => createFramePlan({ seconds: -1, fps: 12 }), /Invalid/);
});

test("sequential rendering reports progress and supports cancellation", async () => {
  const plan = createFramePlan({ seconds: 1, frames: 4 });
  const rendered = [], progress = [];
  await runFrameSequence(plan, (sample) => rendered.push(sample),
    { onProgress: (n) => progress.push(n), yieldControl: async () => {} });
  assert.equal(rendered.length, 4);
  assert.deepEqual(progress, [1, 2, 3, 4]);
  const signal = { aborted: false };
  await assert.rejects(
    runFrameSequence(plan, (_, i) => { if (i === 1) signal.aborted = true; },
      { signal, yieldControl: async () => {} }),
    /cancelled/,
  );
});
