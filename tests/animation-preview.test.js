import test from "node:test";
import assert from "node:assert/strict";
import { startAnimationPreview } from "../src/animation-preview.js";
import { createFramePlan } from "../src/animation-frames.js";

test("loop preview renders deterministic samples and disposes on stop", () => {
  let next = 0;
  const callbacks = new Map(), frames = [], labels = [], events = [];
  const raf = (f) => { callbacks.set(++next, f); return next; };
  const cancel = (n) => callbacks.delete(n);
  const canvas = {
    width: 128, height: 128,
    getContext() {
      return { clearRect() {}, drawImage(img) { frames.push(img); }, set imageSmoothingEnabled(value) {} };
    },
  };
  const plan = createFramePlan({
    seconds: 1, frames: 4, fps: 4, seamless: true,
    baseTime: 2, baseTurn: 1,
  });
  let disposed = 0;
  const renderer = {
    render(time, turn, opts, seamless) { return { time, turn, opts, seamless }; },
    dispose() { disposed++; },
  };
  const label = { set textContent(v) { labels.push(v); } };
  const control = startAnimationPreview({
    renderer, plan, canvas, label, options: { transparent: true },
    raf, cancel, onPlaybackChange: (playing) => events.push(playing),
  });
  assert.equal(frames.length, 1);
  callbacks.get(1)(0);
  callbacks.get(2)(255);
  assert.equal(frames.length, 2);
  assert.equal(frames[1].time, 2);
  assert.equal(frames[1].seamless, true);
  assert.equal(labels.at(-1), "Frame 2 / 4");
  control.pause();
  assert.equal(control.paused, true);
  control.resume();
  assert.equal(control.paused, false);
  control.stop();
  control.stop();
  assert.equal(disposed, 1);
  assert.deepEqual(events.slice(0, 2), [true, false]);
});
