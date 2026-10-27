// Loop the same deterministic samples used by GIF/APNG/spritesheet export.
// This never changes the planet's state or draws into the live canvas.
export function startAnimationPreview({
  renderer, plan, options, canvas, label,
  repeat = true,
  onPlaybackChange = () => {},
  raf = requestAnimationFrame,
  cancel = cancelAnimationFrame,
}) {
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    renderer.dispose();
    throw new Error("Animation preview canvas unavailable");
  }
  ctx.imageSmoothingEnabled = false;

  const interval = 1000 / plan.fps;
  let request = null;
  let stopped = false;
  let paused = false;
  let startTime = null;
  let currentIndex = -1;

  function render(index) {
    const frame = plan.frame(index);
    const source = renderer.render(frame.time, frame.turn, options, frame.seamless);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
    if (label) label.textContent = "Frame " + (index + 1) + " / " + plan.frames;
    currentIndex = index;
  }

  function tick(now) {
    if (stopped || paused) return;
    if (startTime === null) startTime = now - Math.max(0, currentIndex) * interval;
    const index = Math.floor(Math.max(0, now - startTime) / interval);
    if (!repeat && index >= plan.frames) {
      render(plan.frames - 1);
      pause();
      return;
    }
    const next = index % plan.frames;
    if (next !== currentIndex) render(next);
    request = raf(tick);
  }

  function pause() {
    if (stopped || paused) return;
    paused = true;
    if (request !== null) cancel(request);
    onPlaybackChange(false);
  }

  function resume() {
    if (stopped || !paused) return;
    // Replaying a one-shot animation starts at frame one again.
    if (!repeat && currentIndex === plan.frames - 1) currentIndex = 0;
    paused = false;
    // Resume at the paused frame rather than jumping elapsed wall-clock time.
    startTime = null;
    if (currentIndex >= 0) render(currentIndex);
    request = raf(tick);
    onPlaybackChange(true);
  }

  // Start with a deterministic still, not an empty checkerboard.
  render(0);
  request = raf(tick);
  onPlaybackChange(true);
  return {
    get paused() { return paused; },
    pause,
    resume,
    toggle() { if (paused) resume(); else pause(); },
    stop() {
      if (stopped) return;
      stopped = true;
      if (request !== null) cancel(request);
      renderer.dispose();
      onPlaybackChange(false);
    },
  };
}
