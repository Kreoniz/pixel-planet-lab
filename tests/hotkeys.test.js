import test from "node:test";
import assert from "node:assert/strict";
import { shortcuts, actionShortcuts, presetShortcuts, registerEditorHotkeys } from "../src/hotkeys.js";
import { presetButtons } from "../src/config.js";

function keyboard(apple = false) {
  const target = new EventTarget();
  const invoked = [];
  let modal = false, help = false;
  const unregister = registerEditorHotkeys({
    target, apple,
    runAction: (action) => invoked.push(action),
    choosePreset: (preset) => invoked.push(preset),
    toggleHelp() { help = !help; invoked.push("help"); },
    isHelpOpen: () => help,
    isModalOpen: () => modal || help,
  });
  return {
    invoked, unregister,
    setModal(value) { modal = value; },
    press(key, options = {}) {
      const event = new Event("keydown", { cancelable: true });
      Object.assign(event, { key, ...options });
      target.dispatchEvent(event);
      return event.defaultPrevented;
    },
  };
}

test("one table defines shortcut chords and all presets", () => {
  assert.equal(new Set(shortcuts.map(({ hotkey }) => hotkey)).size, shortcuts.length);
  assert.deepEqual(presetButtons.map(([preset]) => presetShortcuts[preset]),
    ["1", "2", "3", "4", "5", "6", "7", "8", "9"]);
  assert.equal(actionShortcuts.exportPng, "Mod+S");
  assert.equal(actionShortcuts.toggleAnimation, "A");
});

test("native keyboard actions distinguish modifiers, presets, help and cleanup", () => {
  const k = keyboard();
  assert.equal(k.press("r"), true);
  k.press("R", { shiftKey: true });
  k.press("s", { ctrlKey: true });
  k.press("9");
  assert.deepEqual(k.invoked, ["randomize", "rerollSeed", "exportPng", "blackhole"]);
  k.press("?", { shiftKey: true });
  assert.equal(k.press("m"), false);
  k.press("?", { shiftKey: true });
  k.press("a");
  assert.deepEqual(k.invoked.slice(-3), ["help", "help", "toggleAnimation"]);
  k.unregister();
  assert.equal(k.press("r"), false);
});

for (const apple of [false, true]) {
  test(`history uses the platform modifier (Apple: ${apple})`, () => {
    const k = keyboard(apple);
    const mod = apple ? { metaKey: true } : { ctrlKey: true };
    k.press("z", mod);
    k.press("Z", { ...mod, shiftKey: true });
    assert.deepEqual(k.invoked, ["undo", "redo"]);
    assert.equal(k.press("z", apple ? { ctrlKey: true } : { metaKey: true }), false);
    k.unregister();
  });
}

test("typing, composition, repeats and unrelated modifiers are left alone", () => {
  const k = keyboard();
  for (const options of [
    { repeat: true }, { isComposing: true }, { keyCode: 229 },
    { altKey: true }, { ctrlKey: true }, { ctrlKey: true, shiftKey: true },
    { composedPath: () => [{ closest: () => ({}) }] },
    { composedPath: () => [{ isContentEditable: true }] },
  ]) assert.equal(k.press("r", options), false);
  assert.deepEqual(k.invoked, []);
  k.unregister();
});

test("export modals block editor shortcuts and opening help", () => {
  const k = keyboard();
  k.setModal(true);
  for (const key of ["r", "1", "?", "a"]) assert.equal(k.press(key), false);
  assert.deepEqual(k.invoked, []);
  k.setModal(false);
  k.press("r");
  assert.deepEqual(k.invoked, ["randomize"]);
  k.unregister();
});
