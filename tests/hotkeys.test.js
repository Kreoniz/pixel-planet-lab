import test from "node:test";
import assert from "node:assert/strict";
import {
  shortcuts,
  actionShortcuts,
  presetShortcuts,
  registerEditorHotkeys,
} from "../src/hotkeys.js";
import { presetButtons } from "../src/config.js";

test("one central table defines non-conflicting shortcut chords", () => {
  assert.equal(new Set(shortcuts.map(({ hotkey }) => hotkey)).size, shortcuts.length);
  assert.deepEqual(
    presetButtons.map(([preset]) => presetShortcuts[preset]),
    ["1", "2", "3", "4", "5", "6", "7", "8", "9"],
  );
  assert.equal(actionShortcuts.exportPng, "Mod+S");
  assert.equal(actionShortcuts.toggleAnimation, "A");
});

test("registers TanStack handlers with input-safe and non-repeating behavior", () => {
  const bindings = new Map();
  const invoked = [];
  const manager = {
    register(hotkey, callback, options) {
      assert.equal(options.ignoreInputs, true, hotkey);
      assert.equal(options.requireReset, true, hotkey);
      assert.equal(options.preventDefault, true, hotkey);
      bindings.set(hotkey, callback);
      return { unregister() { bindings.delete(hotkey); } };
    },
  };
  let helpOpen = false;
  const unregister = registerEditorHotkeys({
    manager,
    runAction(action) { invoked.push(action); },
    choosePreset(preset) { invoked.push(preset); },
    toggleHelp() { helpOpen = !helpOpen; },
    isHelpOpen() { return helpOpen; },
  });

  assert.equal(bindings.size, shortcuts.length);
  bindings.get("R")();
  bindings.get("Mod+S")();
  bindings.get("9")();
  assert.deepEqual(invoked, ["randomize", "exportPng", "blackhole"]);
  bindings.get("?")();
  assert.equal(helpOpen, true);
  bindings.get("M")(); // the open help dialog owns the keyboard
  assert.equal(invoked.length, 3);
  bindings.get("?")();
  assert.equal(helpOpen, false);
  bindings.get("A")();
  assert.equal(invoked.at(-1), "toggleAnimation");

  unregister();
  assert.equal(bindings.size, 0);
});

test("history shortcuts use platform modifier keys", () => {
  assert.equal(actionShortcuts.undo, "Mod+Z");
  assert.equal(actionShortcuts.redo, "Mod+Shift+Z");
  assert.equal(actionShortcuts.rerollSeed, "Shift+R");
});
