import { MAX_ANIMATED_FRAMES } from "./animation-frames.js";

export const animationStorageKey = "pixel-planet-lab.animation.v1";
export const animationDefaults = Object.freeze({
  seconds: 4, fps: 12, seamless: true, repeat: true,
});

export function normalizeAnimationSettings(input) {
  const source = input && typeof input === "object" && !Array.isArray(input)
    ? input : {};
  const seconds = Number(source.seconds);
  const fps = Number(source.fps);
  return {
    seconds: Number.isInteger(seconds) && seconds >= 1 && seconds <= 12
      ? seconds : animationDefaults.seconds,
    fps: Number.isInteger(fps) && fps >= 4 && fps <= 30
      ? fps : animationDefaults.fps,
    seamless: typeof source.seamless === "boolean"
      ? source.seamless : animationDefaults.seamless,
    repeat: typeof source.repeat === "boolean"
      ? source.repeat : animationDefaults.repeat,
  };
}

export function animationSummary(settings) {
  const { seconds, fps, seamless } = normalizeAnimationSettings(settings);
  const frames = seconds * fps;
  const excess = frames > MAX_ANIMATED_FRAMES;
  return {
    frames,
    valid: !excess,
    text: excess
      ? frames + " frames exceeds the " + MAX_ANIMATED_FRAMES +
        "-frame limit. Reduce seconds or FPS."
      : frames + " frames · " + seconds + "s at " + fps + " FPS · " +
        (seamless ? "seamless rotation" : "timed effects"),
  };
}

export function createAnimationStore(getStorage) {
  return {
    load() {
      try {
        const raw = getStorage()?.getItem(animationStorageKey);
        return raw ? normalizeAnimationSettings(JSON.parse(raw))
          : { ...animationDefaults };
      } catch {
        return { ...animationDefaults };
      }
    },
    save(input) {
      try {
        getStorage()?.setItem(animationStorageKey,
          JSON.stringify(normalizeAnimationSettings(input)));
        return true;
      } catch { return false; }
    },
  };
}
