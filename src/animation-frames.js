// Deterministic frame sampling shared by spritesheets, APNG, GIF and playback.
// Seamless mode rotates exactly one revolution with secondary shader clocks
// frozen; timed mode preserves the real cloud/moon/storm animations.
export const MAX_ANIMATED_FRAMES = 120;
export const TAU = Math.PI * 2;

export function createFramePlan({
  seconds, frames, baseTime = 0, baseTurn = 0,
  spinSpeed = 0.5, seamless = false, fps,
}) {
  const count = frames ?? Math.round(seconds * fps);
  if (!Number.isFinite(seconds) || seconds <= 0 ||
      !Number.isInteger(count) || count < 1 || count > MAX_ANIMATED_FRAMES ||
      !Number.isFinite(baseTime) || !Number.isFinite(baseTurn) ||
      !Number.isFinite(spinSpeed) || spinSpeed < 0)
    throw new Error("Invalid animation settings: use 1–120 frames and positive duration");
  const frameRate = fps ?? count / seconds;
  if (!Number.isFinite(frameRate) || frameRate <= 0 || (fps !== undefined && frameRate > 60))
    throw new Error("Invalid animation frame rate");

  return {
    frames: count,
    seconds,
    fps: frameRate,
    seamless: Boolean(seamless),
    frame(i) {
      if (!Number.isInteger(i) || i < 0 || i >= count)
        throw new RangeError("Frame index out of range");
      const portion = i / count;
      if (seamless) {
        return { time: baseTime, turn: baseTurn + TAU * portion, seamless: true };
      }
      const elapsed = seconds * portion;
      return {
        time: baseTime + elapsed,
        turn: baseTurn + elapsed * spinSpeed,
        seamless: false,
      };
    },
  };
}

export async function runFrameSequence(plan, onFrame, {
  onProgress = () => {},
  yieldControl = () => new Promise((resolve) => setTimeout(resolve, 0)),
  signal,
} = {}) {
  for (let i = 0; i < plan.frames; i++) {
    if (signal?.aborted) throw new Error("Animation export cancelled");
    await onFrame(plan.frame(i), i);
    onProgress(i + 1, plan.frames);
    if (i % 2 === 1) await yieldControl();
  }
  if (signal?.aborted) throw new Error("Animation export cancelled");
}
