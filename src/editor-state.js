// Pure editor helpers. UI preferences are intentionally separate from
// planet configuration codes, so sharing a planet never changes the viewer's FPS.
export const editorDefaults = Object.freeze({
  previewFps: 30,
  lockType: false,
  lockPalette: false,
});

export const sessionKey = "pixel-planet-lab.session.v1";
export const preferencesKey = "pixel-planet-lab.editor.v1";

export function normalizePreferences(input = {}) {
  const obj = input && typeof input === "object" && !Array.isArray(input) ? input : {};
  const fps = Number(obj.previewFps);
  return {
    previewFps: Number.isFinite(fps) && fps >= 5 && fps <= 60
      ? Math.round(fps / 5) * 5 : editorDefaults.previewFps,
    lockType: obj.lockType === true,
    lockPalette: obj.lockPalette === true,
  };
}

// Storage can be unavailable in private modes and embedded browsers.
export function createSessionStore(getStorage) {
  const get = (key) => {
    try { return getStorage()?.getItem(key) ?? null; } catch { return null; }
  };
  const set = (key, value) => {
    try { getStorage()?.setItem(key, value); return true; } catch { return false; }
  };
  return {
    loadPlanetCode() { return get(sessionKey); },
    savePlanetCode(code) { return set(sessionKey, code); },
    loadPreferences() {
      try { return normalizePreferences(JSON.parse(get(preferencesKey) || "{}")); }
      catch { return { ...editorDefaults }; }
    },
    savePreferences(value) { return set(preferencesKey, JSON.stringify(normalizePreferences(value))); },
  };
}

const clone = (value) => ({ ...value });
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

export function createHistory(initial, limit = 50) {
  let current = clone(initial);
  const past = [];
  const future = [];
  return {
    commit(next) {
      if (same(current, next)) return false;
      past.push(current);
      if (past.length > limit) past.shift();
      current = clone(next);
      future.length = 0;
      return true;
    },
    undo() {
      if (!past.length) return null;
      future.push(current);
      current = past.pop();
      return clone(current);
    },
    redo() {
      if (!future.length) return null;
      past.push(current);
      current = future.pop();
      return clone(current);
    },
    get canUndo() { return past.length > 0; },
    get canRedo() { return future.length > 0; },
  };
}

// Export and playback preferences survive preset changes, but world properties
// always reset to defaults before the chosen preset is applied.
const retainedKeys = ["size", "pixelSize", "animate", "frames", "columns",
  "videoSeconds", "videoFps", "sheetSeconds", "batch"];
export function nextPresetState(current, defaults, preset, seed) {
  const retained = Object.fromEntries(retainedKeys.map((key) => [key, current[key]]));
  return { ...defaults, ...preset, ...retained, seed };
}

export function pixelScaleInfo(renderSize, outputSize) {
  const factor = outputSize / renderSize;
  if (factor < 1) return { tone: "warning", text: `${factor.toFixed(2)}× downscale · some details are lost` };
  if (!Number.isInteger(factor))
    return { tone: "warning", text: `${factor.toFixed(2)}× scaling · pixels may look uneven` };
  return { tone: "good", text: `${factor}× integer scaling · sharp pixels` };
}

export function validateSheetLayout(size, frames, columns, maxSide = 8192, maxPixels = 32_000_000) {
  if (!Number.isInteger(size) || !Number.isInteger(frames) || !Number.isInteger(columns) ||
      size <= 0 || frames <= 0 || columns <= 0)
    throw new Error("Invalid spritesheet dimensions");
  const width = size * columns;
  const height = size * Math.ceil(frames / columns);
  if (width > maxSide || height > maxSide || width * height > maxPixels) {
    throw new Error(`Spritesheet ${width}×${height} is too large. Lower output size, frames, or change columns.`);
  }
  return { width, height, rows: Math.ceil(frames / columns) };
}
