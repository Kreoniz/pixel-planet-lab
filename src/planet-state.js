import { controlSections, state } from "./config.js";

// Keep a stable fallback for missing settings in codes created by older versions.
const defaults = { ...state };
const controls = new Map(
  controlSections.flatMap((section) => section.controls)
    .filter((control) => control.key)
    .map((control) => [control.key, control]),
);

export function normalizePlanetState(input) {
  const source = input && typeof input === "object" && !Array.isArray(input) ? input : {};
  const normalized = {};

  for (const [key, fallback] of Object.entries(defaults)) {
    const control = controls.get(key);
    const value = Object.hasOwn(source, key) ? source[key] : fallback;

    if (control?.type === "checkbox") {
      normalized[key] = typeof value === "boolean" ? value : fallback;
    } else if (control?.type === "select") {
      const choice = control.options.find(([option]) => String(option) === String(value));
      normalized[key] = choice ? choice[0] : fallback;
    } else if (control?.type === "range" || control?.type === "number" || control?.type === "percent") {
      const safe = typeof value === "number" && Number.isFinite(value) ? value : fallback;
      const clamped = Math.min(control.max ?? 1, Math.max(control.min ?? 0, safe));
      normalized[key] = control.type === "number" || control.step === 1
        ? Math.round(clamped)
        : clamped;
    } else {
      normalized[key] = fallback;
    }
  }

  return normalized;
}

export function encodePlanetCode(input, { urlSafe = false } = {}) {
  const code = btoa(JSON.stringify(normalizePlanetState(input)));
  return urlSafe ? code.replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "") : code;
}

export function decodePlanetCode(code) {
  if (typeof code !== "string" || !code.trim() || code.length > 8192) {
    throw new Error("Invalid planet code");
  }

  let parsed;
  try {
    // Accept both existing standard base64 codes and URL-safe permalinks.
    parsed = JSON.parse(atob(code.trim().replaceAll("-", "+").replaceAll("_", "/")));
  } catch {
    throw new Error("Invalid planet code");
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Invalid planet code");
  }

  for (const [key, fallback] of Object.entries(defaults)) {
    if (!Object.hasOwn(parsed, key)) continue;
    const value = parsed[key];
    if (typeof value !== typeof fallback || (typeof value === "number" && !Number.isFinite(value))) {
      throw new Error(`Invalid planet setting: ${key}`);
    }
  }

  // Never spread untrusted JSON into the application state: discard unknown keys.
  return normalizePlanetState(parsed);
}
