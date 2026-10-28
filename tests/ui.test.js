import test from "node:test";
import assert from "node:assert/strict";
import { controlSections, presetButtons, presets, state } from "../src/config.js";
import { renderApp, syncUi, syncTimelineUi } from "../src/ui.js";

test("retains the original two-column studio without introducing navigation", () => {
  const root = { innerHTML: "" };
  renderApp(root);
  const html = root.innerHTML;

  assert.match(html, /class="app-shell"/);
  assert.match(html, /class="topbar"/);
  assert.match(html, /id="planetCanvas"/);
  assert.match(html, /role="status" aria-live="polite"/);
  assert.doesNotMatch(html, /<nav\b|class="site-header"/);
  assert.equal((html.match(/class="control-section"/g) || []).length, controlSections.length);
  assert.equal((html.match(/<details class="control-section"/g) || []).length, controlSections.length);

  for (const [name] of presetButtons) {
    assert.ok(html.includes(`data-preset="${name}"`), `missing ${name}`);
  }
  for (const section of controlSections) {
    for (const control of section.controls) {
      const marker = control.key ? `data-key="${control.key}"` : `data-action="${control.action}"`;
      assert.ok(html.includes(marker), `missing ${marker}`);
    }
  }
  for (const action of ["randomize", "mutate", "shareLink", "batch"]) {
    assert.equal(html.split(`data-action="${action}"`).length - 1, 1, `action ${action} must appear once`);
  }
});

test("syncs percentages, labels, and disabled controls without mutating settings", () => {
  function makeField(help = "") {
    const classes = new Set();
    return {
      dataset: { help },
      classes,
      classList: { toggle(name, enabled) { enabled ? classes.add(name) : classes.delete(name); } },
      title: "",
    };
  }
  function makeInput(key, type = "number", format = undefined) {
    const field = makeField("Initial help");
    return {
      dataset: { key, ...(format ? { format } : {}) },
      field, type, value: "", checked: false, disabled: false,
      attributes: {},
      closest() { return field; },
      setAttribute(name, value) { this.attributes[name] = value; },
      removeAttribute(name) { delete this.attributes[name]; },
    };
  }

  const cloudInput = makeInput("clouds", "number", "percent");
  const ringInput = makeInput("ringRadius", "range");
  const seedInput = makeInput("seed", "number");
  const output = { dataset: { value: "zoom" }, textContent: "" };
  const preset = {
    dataset: { preset: "gas" }, attributes: {},
    setAttribute(name, value) { this.attributes[name] = value; },
  };

  const originalDocument = globalThis.document;
  globalThis.document = {
    querySelectorAll(selector) {
      return ({
        "[data-key]": [cloudInput, ringInput, seedInput],
        "[data-value]": [output],
        "[data-preset]": [preset],
      })[selector] || [];
    },
  };

  try {
    const world = { ...state, body: presets.gas.body, seed: 4567, clouds: 0.37, rings: false, zoom: 0.94 };
    syncUi(world);
    assert.equal(cloudInput.value, "37");
    assert.equal(cloudInput.disabled, true);
    assert.match(cloudInput.attributes["aria-description"], /rocky worlds/);
    assert.equal(ringInput.disabled, true);
    assert.equal(seedInput.value, "4567");
    assert.equal(seedInput.disabled, false);
    assert.equal(output.textContent, "0.94");
    assert.equal(preset.attributes["aria-pressed"], undefined, "presets apply settings, rather than falsely claiming selection after edits");

    world.body = 0;
    world.rings = true;
    syncUi(world);
    assert.equal(cloudInput.disabled, false);
    assert.equal(cloudInput.field.classes.has("is-disabled"), false);
    assert.equal(cloudInput.attributes["aria-description"], undefined);
    assert.equal(ringInput.disabled, false);
    assert.equal(world.clouds, 0.37, "switching body never destroys settings");
  } finally {
    globalThis.document = originalDocument;
  }
});

test("shows shortcuts without changing the original dark editor structure", () => {
  const root = { innerHTML: "" };
  renderApp(root);
  const html = root.innerHTML;

  assert.match(html, /data-shortcuts-open/);
  assert.match(html, /data-shortcuts-close/);
  assert.match(html, /<dialog[^>]*id="shortcuts-dialog"/);
  assert.match(html, /aria-keyshortcuts="R"/);
  assert.match(html, /aria-keyshortcuts="Control\+S Meta\+S"/);
  assert.match(html, /aria-keyshortcuts="9"/);
  assert.match(html, /Shortcuts are disabled while editing an input or select/);
  assert.doesNotMatch(html, /<nav\b/);
});

test("adds compact FPS, resolution, history, and timeline controls", () => {
  const root = { innerHTML: "" };
  renderApp(root);
  const html = root.innerHTML;
  for (const target of [
    'data-preference="previewFps"', 'data-grid-preset="64"',
    'data-grid-preset="128"', 'data-grid-preset="256"',
    'data-pixel-scale', 'data-lock-preference="lockType"',
    'data-lock-preference="lockPalette"', 'data-action="undo"',
    'data-action="redo"', 'data-action="rerollSeed"', 'data-timeline',
    'data-playhead',
  ]) assert.ok(html.includes(target), `Missing ${target}`);
  assert.doesNotMatch(html, /<nav\\b|class="site-header"/);
});

test("toolbar help remains next to seed actions and undo/redo stay adjacent", () => {
  const root = { innerHTML: "" };
  renderApp(root);
  const actions = [...root.innerHTML.matchAll(/data-action="([^"]+)"/g)].map((x) => x[1]);
  const helper = root.innerHTML.indexOf("data-shortcuts-open");
  const seed = root.innerHTML.indexOf('data-action="rerollSeed"');
  const undo = root.innerHTML.indexOf('data-action="undo"');
  const redo = root.innerHTML.indexOf('data-action="redo"');
  assert.ok(seed < helper && helper < undo && undo < redo);
  assert.ok(actions.indexOf("redo") - actions.indexOf("undo") === 1);
});


test("timeline range expands before setting an absolute playhead and never shrinks on seek", () => {
  let maximum = 60, value = 0;
  const scrub = {
    get max() { return String(maximum); },
    set max(next) { maximum = Number(next); },
    get value() { return String(value); },
    set value(next) { value = Math.min(maximum, Number(next)); },
    setAttribute() {},
  };
  const playback = { setAttribute() {} };
  const old = globalThis.document;
  globalThis.document = { querySelector: (q) => ({
    "[data-timeline]": scrub, "[data-playback-toggle]": playback,
  })[q] || null };
  try {
    syncTimelineUi(75, true);
    assert.equal(scrub.value, "75");
    assert.equal(scrub.max, "120");
    assert.equal(playback.textContent, "Pause");
    syncTimelineUi(10, false);
    assert.equal(scrub.max, "120");
    assert.equal(scrub.value, "10");
    assert.equal(playback.textContent, "Play");
  } finally { globalThis.document = old; }
});

test("moon and ring settings reveal only after their layers are enabled", () => {
  const moon = { dataset: { dependentControls: "Moons" } };
  const ring = { dataset: { dependentControls: "Rings" } };
  const old = globalThis.document;
  globalThis.document = {
    querySelectorAll: (q) => q === "[data-dependent-controls]" ? [moon, ring] : [],
    querySelector: () => null,
  };
  try {
    syncUi({ ...state, moons: 0, rings: false });
    assert.equal(moon.hidden, true);
    assert.equal(ring.hidden, true);
    syncUi({ ...state, moons: 3, rings: true });
    assert.equal(moon.hidden, false);
    assert.equal(ring.hidden, false);
    syncUi({ ...state, body: 8, rings: false });
    assert.equal(ring.hidden, false, "the accretion disk remains adjustable");
  } finally { globalThis.document = old; }
});
