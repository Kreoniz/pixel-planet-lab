import test from "node:test";
import assert from "node:assert/strict";
import { state, presets, defaultPlanetState } from "../src/config.js";
import { createHistory, createSessionStore, normalizePreferences, nextPresetState,
  pixelScaleInfo, validateSheetLayout } from "../src/editor-state.js";

test("history groups deliberate edits, supports undo and clears redo on a new edit", () => {
  const h = createHistory({ seed: 1, zoom: 0.9 }, 2);
  assert.equal(h.commit({ seed: 1, zoom: 0.9 }), false);
  assert.equal(h.commit({ seed: 2, zoom: 0.9 }), true);
  h.commit({ seed: 3, zoom: 0.9 });
  h.commit({ seed: 4, zoom: 0.9 });
  assert.equal(h.canUndo, true);
  assert.deepEqual(h.undo(), { seed: 3, zoom: 0.9 });
  assert.deepEqual(h.undo(), { seed: 2, zoom: 0.9 });
  assert.equal(h.undo(), null);
  assert.deepEqual(h.redo(), { seed: 3, zoom: 0.9 });
  h.commit({ seed: 9, zoom: 1 });
  assert.equal(h.canRedo, false);
  assert.equal(h.redo(), null);
});

test("editor preferences do not enter planet state and survive storage failures", () => {
  const values = new Map();
  const session = createSessionStore(() => ({
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  }));
  assert.deepEqual(session.loadPreferences(), { previewFps: 30, lockType: false, lockPalette: false, variationMode: "similar" });
  assert.equal(session.savePlanetCode("planet-code"), true);
  assert.equal(session.loadPlanetCode(), "planet-code");
  assert.equal(session.savePreferences({ previewFps: 45, lockType: true, lockPalette: true }), true);
  assert.deepEqual(session.loadPreferences(), { previewFps: 45, lockType: true, lockPalette: true, variationMode: "similar" });
  assert.equal(normalizePreferences({ previewFps: 999 }).previewFps, 30);
  assert.equal(createSessionStore(() => { throw Error("blocked"); }).loadPlanetCode(), null);
  assert.equal(createSessionStore(() => { throw Error("blocked"); }).savePlanetCode("x"), false);
});

test("changing presets resets world fields but preserves output preferences", () => {
  const customized = { ...state, terrain: 0.01, clouds: 0.77, city: 0.9, size: 512, pixelSize: 96, videoFps: 48, sheetSeconds: 8 };
  const next = nextPresetState(customized, defaultPlanetState, presets.gas, 1234);
  assert.equal(next.body, 1);
  assert.equal(next.city, 0);
  assert.equal(next.clouds, presets.gas.clouds);
  assert.equal(next.terrain, presets.gas.terrain);
  assert.equal(next.size, 512);
  assert.equal(next.pixelSize, 96);
  assert.equal(next.videoFps, 48);
  assert.equal(next.sheetSeconds, 8);
  assert.equal(next.seed, 1234);
});

test("pixel scaling explains integer and uneven resampling", () => {
  assert.deepEqual(pixelScaleInfo(128, 256), { tone: "good", text: "2× integer scaling · sharp pixels" });
  assert.match(pixelScaleInfo(128, 192).text, /uneven/);
  assert.match(pixelScaleInfo(256, 128).text, /lost/);
});

test("spritesheet output is guarded before allocating the canvas", () => {
  assert.deepEqual(validateSheetLayout(512, 32, 8), { width: 4096, height: 2048, rows: 4 });
  assert.throws(() => validateSheetLayout(512, 96, 1), /too large/);
  assert.throws(() => validateSheetLayout(512, 96, 16, 8192, 1_000_000), /too large/);
  assert.throws(() => validateSheetLayout(512, 0, 1), /Invalid/);
});
