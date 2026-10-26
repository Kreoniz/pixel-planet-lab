// Loaded only after the user asks for a batch, spritesheet, or video.
// The interactive planet preview never needs to download this module.
import { validateSheetLayout } from "./editor-state.js";
export async function exportSheet({ state, canvas, draw, simulationSeconds, rotationPhase, spinSpeed, downloadCanvas, setStatus, invalidate, clampInt }) {
  const size = clampInt(state.size, 64, 512);
  const frames = clampInt(state.frames, 1, 96);
  const columns = clampInt(state.columns, 1, 16);
  const { width, height } = validateSheetLayout(size, frames, columns);
  const sheet = document.createElement("canvas");
  sheet.width = width;
  sheet.height = height;
  const ctx = sheet.getContext("2d");
  const baseTime = simulationSeconds;
  const baseTurn = rotationPhase;
  const speed = spinSpeed();

  try {
    if (!ctx) throw new Error("Canvas 2D context unavailable");
    ctx.imageSmoothingEnabled = false;
    for (let i = 0; i < frames; i++) {
      // Frame samples cover the requested span; arbitrary shader dynamics
      // are not guaranteed to form a mathematically seamless loop.
      const offset = (i / frames) * Number(state.sheetSeconds);
      draw(baseTime + offset, baseTurn + offset * speed);
      ctx.drawImage(canvas, (i % columns) * size, Math.floor(i / columns) * size, size, size);
    }

    await downloadCanvas(sheet, `planet-${state.seed}-sheet.png`);
    setStatus(`Exported ${frames} frame sheet`);
  } catch (error) {
    setStatus(`Sheet export failed: ${error?.message || "unknown error"}`);
  } finally {
    invalidate();
  }
}

export async function exportVideo({ state, canvas, draw, simulationSeconds, rotationPhase, spinSpeed, downloadBlob, setStatus, sleep, clampInt }) {
  if (!window.MediaRecorder || !HTMLCanvasElement.prototype.captureStream) {
    setStatus("Video export is not supported in this browser");
    return;
  }

  let stream;
  let recorder;
  try {
    const size = clampInt(state.size, 64, 512);
    const seconds = clampInt(state.videoSeconds, 1, 20);
    const fps = clampInt(state.videoFps, 8, 60);
    const totalFrames = seconds * fps;
    const output = document.createElement("canvas");
    output.width = size;
    output.height = size;
    const ctx = output.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context unavailable");
    ctx.imageSmoothingEnabled = false;

    // Configure dimensions before creating the stream, so the exported
    // video does not inherit the canvas's default 300x150 resolution.
    stream = output.captureStream(fps);
    const track = stream.getVideoTracks()[0];
    if (!track) throw new Error("Could not create video track");
    const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
      ? "video/webm;codecs=vp9"
      : MediaRecorder.isTypeSupported("video/webm")
        ? "video/webm"
        : "";
    const chunks = [];
    recorder = new MediaRecorder(stream, {
      ...(mimeType ? { mimeType } : {}),
      videoBitsPerSecond: 5_000_000,
    });
    const baseTime = simulationSeconds;
    const baseTurn = rotationPhase;
    const speed = spinSpeed();

    recorder.ondataavailable = (event) => {
      if (event.data.size) chunks.push(event.data);
    };

    const done = new Promise((resolve, reject) => {
      recorder.onstop = resolve;
      recorder.onerror = () => reject(recorder.error || new Error("Recorder error"));
    });

    recorder.start();
    for (let i = 0; i < totalFrames; i++) {
      const offset = i / fps;
      draw(baseTime + offset, baseTurn + offset * speed);
      ctx.drawImage(canvas, 0, 0, size, size);
      if (track.requestFrame) track.requestFrame();
      if (i % Math.max(1, Math.floor(fps / 2)) === 0) {
        setStatus(`Recording video ${i + 1}/${totalFrames}`);
      }
      await sleep(1000 / fps);
    }

    recorder.stop();
    await done;
    if (!chunks.length) throw new Error("Recorder produced no video");
    downloadBlob(new Blob(chunks, { type: mimeType || "video/webm" }), `planet-${state.seed}.webm`);
    setStatus(`Exported ${seconds}s WebM at ${fps} fps`);
  } catch (error) {
    setStatus(`Video export failed: ${error?.message || "unknown error"}`);
  } finally {
    if (recorder?.state === "recording") recorder.stop();
    stream?.getTracks().forEach((track) => track.stop());
  }
}

export async function generateBatch({
  state, palettes, canvas, draw, batchStrip, syncUi, normalizeState, resizeCanvas,
  invalidate, recordEdit, setStatus, clampInt, round, simulationSeconds,
  signal, yieldControl = () => Promise.resolve(),
}) {
  const count = clampInt(state.batch, 4, 24);
  const thumbSize = 96;
  batchStrip.replaceChildren();

  for (let i = 0; i < count; i++) {
    if (signal?.aborted) return;
    const seed = Math.floor(Math.random() * 999999) + 1;
    const batchState = {
      seed,
      size: thumbSize,
      pixelSize: thumbSize,
      body: i % 9,
      palette: Object.keys(palettes)[i % Object.keys(palettes).length],
      rings: i % 3 === 0 || i % 9 === 1 || i % 9 === 8,
      ringRadius: round(0.04 + (i % 5) * 0.08),
      ringTilt: round(0.25 + (i % 6) * 0.1),
      ringAngle: round((i * 0.13) % 1),
      ringWidth: round(0.28 + (i % 4) * 0.15),
      ringOpacity: 0.72,
      ringGaps: round(0.2 + (i % 5) * 0.16),
      ringDetail: round(0.35 + (i % 4) * 0.18),
      moons: i % 9,
      moonSpread: round(0.25 + (i % 5) * 0.15),
      moonTilt: round(0.18 + (i % 6) * 0.12),
      moonSpeed: round(0.2 + (i % 5) * 0.14),
      moonSize: round(0.24 + (i % 4) * 0.14),
    };

    // Restore the shared preview before yielding control. UI edits made while
    // generating variations are never overwritten by stale batch state.
    const before = { ...state };
    const item = document.createElement("button");
    item.type = "button";
    item.className = "batch-item";
    const thumb = document.createElement("canvas");
    thumb.width = thumbSize;
    thumb.height = thumbSize;
    const ctx = thumb.getContext("2d");
    if (!ctx) throw new Error("Could not render variation thumbnail");
    ctx.imageSmoothingEnabled = false;
    try {
      Object.assign(state, batchState);
      draw(simulationSeconds + i * 0.1);
      ctx.drawImage(canvas, 0, 0);
    } finally {
      Object.assign(state, before);
      resizeCanvas();
      draw(simulationSeconds);
    }

    const label = document.createElement("span");
    label.textContent = String(seed);
    item.append(thumb, label);
    item.addEventListener("click", () => {
      const retained = {
        size: state.size, pixelSize: state.pixelSize, animate: state.animate,
        frames: state.frames, columns: state.columns, videoSeconds: state.videoSeconds,
        videoFps: state.videoFps, sheetSeconds: state.sheetSeconds, batch: state.batch,
      };
      Object.assign(state, batchState, retained);
      normalizeState();
      syncUi(state);
      invalidate();
      recordEdit();
      setStatus(`Loaded variation seed ${seed}`);
    });
    batchStrip.append(item);
    setStatus(`Generating variations ${i + 1}/${count}`);
    if (i % 2 === 1) await yieldControl();
  }

  if (!signal?.aborted) setStatus(`Generated ${count} planet variations`);
}
