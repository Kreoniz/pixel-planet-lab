// Export choices are editor preferences, never fields in a shareable planet code.
export const exportPresets = Object.freeze({
  "full-scene": Object.freeze({
    transparent: false, moons: true, rings: true, glow: true, stars: true,
  }),
  "planet-only": Object.freeze({
    transparent: true, moons: false, rings: false, glow: false, stars: false,
  }),
  "planet-rings": Object.freeze({
    transparent: true, moons: false, rings: true, glow: true, stars: false,
  }),
});

export const exportOptionKeys = Object.freeze([
  "transparent", "moons", "rings", "glow", "stars",
]);
export const exportStorageKey = "pixel-planet-lab.export.v1";

function matchPreset(options) {
  return Object.entries(exportPresets).find(([, preset]) =>
    exportOptionKeys.every((key) => options[key] === preset[key]))?.[0] || "custom";
}

export function chooseExportPreset(name) {
  if (!Object.hasOwn(exportPresets, name)) return null;
  return { preset: name, ...exportPresets[name] };
}

export function normalizeExportOptions(input) {
  const source = input && typeof input === "object" && !Array.isArray(input)
    ? input : {};
  const defaults = exportPresets["full-scene"];
  const options = Object.fromEntries(exportOptionKeys.map((key) =>
    [key, typeof source[key] === "boolean" ? source[key] : defaults[key]]));
  // Stars are never rendered behind a transparent exported asset.
  if (options.transparent) options.stars = false;
  return { preset: matchPreset(options), ...options };
}

export function updateExportOption(current, key, checked) {
  if (!exportOptionKeys.includes(key) || typeof checked !== "boolean")
    return normalizeExportOptions(current);
  return normalizeExportOptions({ ...current, [key]: checked });
}

export function createExportOptionStore(getStorage) {
  return {
    load() {
      try {
        const raw = getStorage()?.getItem(exportStorageKey);
        return raw ? normalizeExportOptions(JSON.parse(raw))
          : chooseExportPreset("full-scene");
      } catch {
        return chooseExportPreset("full-scene");
      }
    },
    save(options) {
      try {
        getStorage()?.setItem(exportStorageKey, JSON.stringify(normalizeExportOptions(options)));
        return true;
      } catch {
        return false;
      }
    },
  };
}
