import test from "node:test";
import assert from "node:assert/strict";
import { exportSheet, exportVideo } from "../src/extra-actions.js";
import { createStudio, settle } from "./helpers/studio-harness.js";

const clampInt = (value, min, max) => Math.round(Math.max(min, Math.min(max, value)));
const context2d = { drawImage() {} };

test("spritesheet cancellation during final PNG encoding prevents download and reports progress", async () => {
  const oldDocument = globalThis.document;
  const studio = createStudio();
  let finish, disposed = 0;
  const messages = [], downloads = [];
  studio.context.downloadBlob = (...args) => downloads.push(args);
  const canvas = {
    getContext: () => context2d,
    toBlob(callback) { finish = callback; },
  };
  globalThis.document = { createElement: () => canvas };
  const controller = new AbortController();
  try {
    const exporting = exportSheet({
      state: { seed: 123, size: 64, frames: 2, columns: 2, sheetSeconds: 1 },
      simulationSeconds: 0, rotationPhase: 0, spinSpeed: () => 1,
      downloadCanvas: studio.api.downloadCanvas, setStatus: (message) => messages.push(message),
      invalidate() {}, clampInt, exportOptions: {}, animationSettings: { seamless: true },
      createFrameRenderer: async () => ({ render: () => ({}), dispose() { disposed++; } }),
      yieldControl: () => Promise.resolve(), signal: controller.signal,
    });
    await settle();
    assert.equal(typeof finish, "function");
    controller.abort();
    finish(new Blob(["PNG"]));
    await exporting;
    assert.equal(downloads.length, 0);
    assert.equal(disposed, 1);
    assert.ok(messages.includes("Exporting spritesheet 1/2"));
    assert.equal(messages.at(-1), "Sheet export cancelled");
  } finally { globalThis.document = oldDocument; }
});

test("video cancellation while waiting for recorder completion never downloads", async () => {
  const saved = Object.fromEntries(["window", "HTMLCanvasElement", "MediaRecorder", "document"]
    .map((key) => [key, globalThis[key]]));
  let finish, stopped = 0;
  const downloads = [], messages = [];
  class Recorder {
    static isTypeSupported() { return true; }
    start() { this.state = "recording"; }
    stop() {
      this.state = "inactive";
      finish = () => {
        this.ondataavailable({ data: new Blob(["video"]) });
        this.onstop();
      };
    }
  }
  const track = { requestFrame() {}, stop() { stopped++; } };
  const canvas = {
    getContext: () => context2d,
    captureStream: () => ({ getVideoTracks: () => [track], getTracks: () => [track] }),
  };
  globalThis.window = { MediaRecorder: Recorder };
  globalThis.MediaRecorder = Recorder;
  globalThis.HTMLCanvasElement = { prototype: { captureStream() {} } };
  globalThis.document = { createElement: () => canvas };
  const controller = new AbortController();
  try {
    const exporting = exportVideo({
      state: { seed: 123, size: 64, videoSeconds: 1, videoFps: 8 },
      canvas: {}, draw() {}, simulationSeconds: 0, rotationPhase: 0, spinSpeed: () => 1,
      downloadBlob: (...args) => downloads.push(args), setStatus: (message) => messages.push(message),
      sleep: () => Promise.resolve(), clampInt, signal: controller.signal,
    });
    await settle();
    assert.equal(typeof finish, "function");
    controller.abort();
    finish();
    await exporting;
    assert.equal(downloads.length, 0);
    assert.equal(stopped, 1);
    assert.equal(messages.at(-1), "Video export cancelled");
  } finally { Object.assign(globalThis, saved); }
});
