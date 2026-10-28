import { readFileSync } from "node:fs";
import vm from "node:vm";
import { defaultPlanetState, palettes, presets } from "../../src/config.js";
import { createFramePlan } from "../../src/animation-frames.js";
import { generatePlanet, resetPlanet } from "../../src/planet-generator.js";
import { moonOrbitVectors } from "../../src/moon-orbits.js";
import { normalizePlanetState, decodePlanetCode } from "../../src/planet-state.js";
import { nextPresetState } from "../../src/editor-state.js";
import { animationSummary } from "../../src/animation-settings.js";

// Execute the production functions/actions with browser services injected. The
// startup and shader compilation are excluded; draw() still writes real inputs
// to the GL stub, so these tests exercise integration rather than source text.
const source = readFileSync(new URL("../../src/main.js", import.meta.url), "utf8");
const functions = source.slice(source.indexOf("function collectUniforms("))
  .replace(/\bimport\(/g, "loadModule(");

export function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

export const settle = () => new Promise((resolve) => setImmediate(resolve));

export function createStudio() {
  const nodes = new Map(), values = new Map();
  const renderers = [], loops = [], downloads = [], extraCalls = [];
  function node(selector) {
    if (!nodes.has(selector)) nodes.set(selector, {
      width: 256, height: 256, open: false, shows: 0, textContent: "",
      showModal() { this.open = true; this.shows++; },
      close() { this.open = false; },
      getContext() { return { clearRect() {}, drawImage() {} }; },
    });
    return nodes.get(selector);
  }
  const gl = {
    FRAMEBUFFER: 1, TRIANGLES: 2,
    getUniformLocation(program, name) { return name; },
    bindFramebuffer() {}, viewport() {}, useProgram() {}, drawArrays() {},
  };
  for (const method of ["uniform1f", "uniform1i", "uniform2f", "uniform3fv", "uniform4fv"]) {
    gl[method] = (location, ...value) => {
      if (location === undefined) throw new Error("Uniform location was not collected");
      values.set(location, value.length === 1 ? value[0] : value);
    };
  }
  const rendererModule = {
    createExportRenderer(context, draw, size) {
      const renderer = {
        size, disposed: 0, frames: [],
        render(time, turn, options, seamless) {
          this.frames.push({ time, turn, options, seamless });
          draw(time, turn, { framebuffer: {}, size, options, seamless });
          return { width: size, height: size };
        },
        dispose() { this.disposed++; },
      };
      renderers.push(renderer);
      return renderer;
    },
  };
  const modules = {
    "./export-renderer.js": rendererModule,
    "./animation-frames.js": { createFramePlan },
    "./animation-preview.js": {
      startAnimationPreview(options) {
        const loop = { options, stopped: false,
          stop() {
            if (this.stopped) return;
            this.stopped = true;
            options.renderer.dispose();
          },
        };
        loops.push(loop);
        return loop;
      },
    },
    "./extra-actions.js": Object.fromEntries(
      ["exportSheet", "exportGif", "exportApng", "exportVideo", "generateBatch"]
        .map((action) => [action, async (options) => extraCalls.push({ action, options })]),
    ),
  };
  const context = vm.createContext({
    state: { ...defaultPlanetState, seed: 123, pixelSize: 64, size: 256, spin: 0.4, moons: 2 },
    simulationSeconds: 7, rotationPhase: 0.75,
    exportOptions: { transparent: true, moons: false, rings: false },
    animationSettings: { seconds: 4, fps: 12, seamless: true, repeat: true },
    previewRequest: 0, animationPreviewLoop: null, editHistory: null,
    recordingVideo: false, activeExportController: null, batchController: null,
    framePending: false, previewVisible: true, dirty: false,
    program: {}, gl, paletteVectors: palettes, palettes,
    canvas: node("#planetCanvas"), statusEl: node("#status"), batchStrip: {},
    document: { hidden: true, querySelector: node, querySelectorAll: () => [], createElement: () => node(Symbol()) },
    loadModule: (name) => typeof modules[name] === "function" ? modules[name]() : modules[name],
    animationSummary, createFramePlan, generatePlanet, resetPlanet, moonOrbitVectors, normalizePlanetState, decodePlanetCode, nextPresetState, defaultPlanetState, presets, AbortController, setTimeout,
    editorPrefs: { previewFps: 5, lockType: false, lockPalette: false },
    lastTickSeconds: 0, lastRenderedMs: -Infinity, fpsFrames: 0, fpsTime: 0,
    fpsEl: node("#fps"), requestAnimationFrame() {},
    syncAnimationUi() {}, syncTimelineUi() {}, syncEditorUi() {},
    session: { savePlanetCode() {} }, encodePlanetCode() { return "saved"; },
    syncUi() {}, recordEdit() {},
  });
  const api = vm.runInContext(functions +
    "\n;({ actions, captureExport, collectUniforms, draw, stopAnimationPreview, runExtra, tick, seekSimulation, restoreHistory, applyPlanetCode, navigateEditorLink, downloadCanvas });", context);
  context.uniforms = api.collectUniforms(context.program);
  context.downloadCanvas = async (canvas, filename) => downloads.push({ canvas, filename });
  return { api, context, modules, rendererModule, renderers, loops, downloads, extraCalls, values, node };
}
