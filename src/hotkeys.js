import { HotkeyManager, formatForDisplay } from "@tanstack/hotkeys";
import { presetButtons } from "./config.js";

// One definition powers registration, button hints, and the help dialog.
export const shortcuts = [
  { id: "randomize", hotkey: "R", label: "Random planet", group: "Actions", action: "randomize" },
  { id: "mutate", hotkey: "M", label: "Mutate planet", group: "Actions", action: "mutate" },
  { id: "animate", hotkey: "A", label: "Toggle animation", group: "Actions", action: "toggleAnimation" },
  { id: "export", hotkey: "Mod+S", label: "Download PNG", group: "Actions", action: "exportPng" },
  { id: "share", hotkey: "Mod+Shift+L", label: "Copy share link", group: "Actions", action: "shareLink" },
  { id: "batch", hotkey: "B", label: "Generate variations", group: "Actions", action: "batch" },
  { id: "help", hotkey: "?", label: "Keyboard shortcuts", group: "Actions" },
  ...presetButtons.map(([preset, label], index) => ({
    id: `preset-${preset}`,
    hotkey: String(index + 1),
    label: `${label} preset`,
    group: "Presets",
    preset,
  })),
];

export const actionShortcuts = Object.fromEntries(
  shortcuts.filter(({ action }) => action).map(({ action, hotkey }) => [action, hotkey]),
);
export const presetShortcuts = Object.fromEntries(
  shortcuts.filter(({ preset }) => preset).map(({ preset, hotkey }) => [preset, hotkey]),
);

export function displayShortcut(hotkey) {
  return formatForDisplay(hotkey);
}

export function registerEditorHotkeys({
  runAction,
  choosePreset,
  toggleHelp,
  isHelpOpen = () => false,
  manager = HotkeyManager.getInstance(),
}) {
  const handles = shortcuts.map(({ hotkey, action, preset, id }) =>
    manager.register(
      hotkey,
      () => {
        if (isHelpOpen() && id !== "help") return;
        if (id === "help") toggleHelp();
        else if (preset) choosePreset(preset);
        else if (action) runAction(action);
      },
      {
        // Never hijack typing, numeric inputs, selects, or editable fields.
        ignoreInputs: true,
        // Avoid repeated randomization/exports when a key is held.
        requireReset: true,
        preventDefault: true,
        stopPropagation: false,
      },
    ),
  );

  return () => handles.forEach((handle) => handle.unregister());
}
