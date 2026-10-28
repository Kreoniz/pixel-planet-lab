import { presetButtons } from "./config.js";

// One definition powers registration, button hints, and the help dialog.
export const shortcuts = [
  { id: "randomize", hotkey: "R", label: "Random planet", group: "Actions", action: "randomize" },
  { id: "mutate", hotkey: "M", label: "Mutate planet", group: "Actions", action: "mutate" },
  { id: "rerollSeed", hotkey: "Shift+R", label: "New seed (keep settings)", group: "Actions", action: "rerollSeed" },
  { id: "undo", hotkey: "Mod+Z", label: "Undo", group: "Actions", action: "undo" },
  { id: "redo", hotkey: "Mod+Shift+Z", label: "Redo", group: "Actions", action: "redo" },
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

const isApple = () => typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);

export function displayShortcut(hotkey) {
  return hotkey.replace("Mod", isApple() ? "⌘" : "Ctrl");
}

function matches(event, hotkey, apple) {
  const keys = hotkey.split("+");
  const key = keys.at(-1);
  const mod = keys.includes("Mod");
  if (event.altKey || Boolean(event.ctrlKey) !== (mod && !apple) ||
      Boolean(event.metaKey) !== (mod && apple)) return false;
  // '?' already includes Shift on layouts that need it.
  if (key !== "?" && Boolean(event.shiftKey) !== keys.includes("Shift")) return false;
  return event.key?.toUpperCase() === key.toUpperCase();
}

export function registerEditorHotkeys({
  runAction,
  choosePreset,
  toggleHelp,
  isHelpOpen = () => false,
  isModalOpen = isHelpOpen,
  target = window,
  apple = isApple(),
}) {
  function keydown(event) {
    if (event.defaultPrevented || event.repeat || event.isComposing || event.keyCode === 229) return;
    const editing = event.composedPath?.() || [event.target];
    if (editing.some((element) => element?.isContentEditable ||
        element?.closest?.("input, textarea, select, [contenteditable]:not([contenteditable='false'])"))) return;
    const shortcut = shortcuts.find(({ hotkey }) => matches(event, hotkey, apple));
    if (!shortcut || (isModalOpen() && (shortcut.id !== "help" || !isHelpOpen()))) return;
    event.preventDefault();
    if (shortcut.id === "help") toggleHelp();
    else if (shortcut.preset) choosePreset(shortcut.preset);
    else runAction(shortcut.action);
  }
  target.addEventListener("keydown", keydown);
  return () => target.removeEventListener("keydown", keydown);
}
