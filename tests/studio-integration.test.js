import test from "node:test";
import assert from "node:assert/strict";
import { createStudio, deferred, settle } from "./helpers/studio-harness.js";

function editLivePlanet(studio) {
  Object.assign(studio.context.state, { seed: 999, pixelSize: 512, size: 512, spin: 0.9, body: 3 });
  studio.context.exportOptions.transparent = false;
  studio.context.animationSettings.seconds = 9;
  studio.context.simulationSeconds = 20;
  studio.context.rotationPhase = 2;
}

test("draw collects the seamless uniform and resets it for the live preview", () => {
  const studio = createStudio();
  studio.api.draw(1, 2, { size: 64, framebuffer: {}, options: {}, seamless: true });
  assert.equal(studio.values.get("uExportLoop"), 1);
  studio.api.draw();
  assert.equal(studio.values.get("uExportLoop"), 0);
});

test("export capture keeps renderer, shader inputs, clocks and settings independent of live edits", async () => {
  const studio = createStudio();
  const pending = deferred();
  studio.modules["./export-renderer.js"] = pending.promise;
  const snapshot = studio.api.captureExport();
  const creating = snapshot.createFrameRenderer();
  editLivePlanet(studio);
  pending.resolve(studio.rendererModule);
  const renderer = await creating;
  assert.equal(renderer.size, 64);
  assert.equal(snapshot.state.seed, 123);
  assert.equal(snapshot.state.size, 256);
  assert.equal(snapshot.simulationSeconds, 7);
  assert.equal(snapshot.rotationPhase, 0.75);
  assert.equal(snapshot.spinSpeed(), 0.18 + 0.4 * 1.35);
  assert.equal(snapshot.exportOptions.transparent, true);
  assert.equal(snapshot.animationSettings.seconds, 4);
  renderer.render(7, 0.75, snapshot.exportOptions, true);
  assert.equal(studio.values.get("uSeed"), 123);
  assert.equal(studio.values.get("uBody"), snapshot.state.body);
  assert.equal(studio.values.get("uExportTransparent"), 1);
  studio.api.draw();
  assert.equal(studio.values.get("uSeed"), 999);
  assert.equal(studio.context.canvas.width, 512);
  snapshot.draw(7, 0.75);
  assert.equal(studio.values.get("uSeed"), 123);
  assert.equal(studio.context.canvas.width, 64);
  renderer.dispose();
});

test("PNG export preserves the clicked planet, dimensions and filename across lazy loading", async () => {
  const studio = createStudio();
  const pending = deferred();
  studio.modules["./export-renderer.js"] = pending.promise;
  const exporting = studio.api.actions.exportPng();
  editLivePlanet(studio);
  pending.resolve(studio.rendererModule);
  await exporting;
  assert.equal(studio.downloads.length, 1);
  assert.equal(studio.downloads[0].filename, "planet-123-transparent.png");
  assert.equal(studio.downloads[0].canvas.width, 256);
  assert.equal(studio.renderers[0].size, 64);
  assert.equal(studio.renderers[0].frames[0].time, 7);
  assert.equal(studio.renderers[0].frames[0].turn, 0.75);
  assert.equal(studio.values.get("uSeed"), 123);
  assert.equal(studio.renderers[0].disposed, 1);
});

for (const action of ["exportSheet", "exportGif", "exportApng", "exportVideo"]) {
  test(`${action} receives a snapshot captured before its lazy import`, async () => {
    const studio = createStudio();
    const pending = deferred();
    const module = studio.modules["./extra-actions.js"];
    studio.modules["./extra-actions.js"] = pending.promise;
    const exporting = studio.api.runExtra(action);
    editLivePlanet(studio);
    pending.resolve(module);
    await exporting;
    const { options } = studio.extraCalls[0];
    assert.equal(options.state.seed, 123);
    assert.equal(options.state.size, 256);
    assert.equal(options.simulationSeconds, 7);
    assert.equal(options.rotationPhase, 0.75);
    assert.equal(options.exportOptions.transparent, true);
    assert.equal(options.animationSettings.seconds, 4);
    assert.equal(options.spinSpeed(), 0.18 + 0.4 * 1.35);
    const renderer = await options.createFrameRenderer();
    renderer.render(7, 0.75, options.exportOptions);
    assert.equal(renderer.size, 64);
    assert.equal(studio.values.get("uSeed"), 123);
    options.draw(7, 0.75);
    assert.equal(studio.values.get("uSeed"), 123);
    renderer.dispose();
  });
}

for (const [first, latest] of [
  ["previewAnimation", "previewAnimation"],
  ["previewExport", "previewAnimation"],
  ["previewAnimation", "previewExport"],
]) {
  test(`overlapping ${first}/${latest} requests dispose the stale renderer`, async () => {
    const studio = createStudio();
    const pending = deferred();
    studio.modules["./export-renderer.js"] = pending.promise;
    const oldPreview = studio.api.actions[first]();
    await settle();
    const newPreview = studio.api.actions[latest]();
    await settle();
    pending.resolve(studio.rendererModule);
    await Promise.all([oldPreview, newPreview]);
    assert.equal(studio.renderers.length, 2);
    assert.equal(studio.renderers[0].disposed, 1);
    assert.equal(studio.renderers[0].frames.length, 0);
    assert.equal(studio.node("#export-preview-dialog").shows, 1);
    assert.equal(studio.loops.length, latest === "previewAnimation" ? 1 : 0);
    studio.api.stopAnimationPreview();
    assert.equal(studio.renderers[1].disposed, 1);
  });
}

test("closing a pending animation preview prevents playback and disposes late resources", async () => {
  const studio = createStudio();
  const pending = deferred();
  studio.modules["./export-renderer.js"] = pending.promise;
  const preview = studio.api.actions.previewAnimation();
  await settle();
  studio.api.stopAnimationPreview();
  pending.resolve(studio.rendererModule);
  await preview;
  assert.equal(studio.renderers.length, 1);
  assert.equal(studio.renderers[0].disposed, 1);
  assert.equal(studio.loops.length, 0);
  assert.equal(studio.node("#export-preview-dialog").open, false);
});

test("replacing active playback disposes its renderer before showing a still preview", async () => {
  const studio = createStudio();
  await studio.api.actions.previewAnimation();
  assert.equal(studio.renderers[0].disposed, 0);
  const preview = studio.api.actions.previewExport();
  assert.equal(studio.renderers[0].disposed, 1);
  await preview;
  assert.equal(studio.loops[0].stopped, true);
  assert.equal(studio.renderers[1].disposed, 1);
  assert.equal(studio.node("#export-preview-title").textContent, "PNG preview");
});


test("random worlds keep moons off", () => {
  const studio = createStudio();
  studio.api.actions.randomize();
  assert.equal(studio.context.state.moons, 0);
});

test("a 5 FPS preview advances simulation at real-time speed", () => {
  const studio = createStudio();
  studio.context.document.hidden = false;
  studio.context.state.animate = true;
  studio.api.tick(1000);
  studio.api.tick(1200);
  studio.api.tick(1400);
  assert.ok(Math.abs(studio.context.simulationSeconds - 7.4) < 0.000001);
});

test("frame stepping after 60 seconds preserves the absolute clock", () => {
  const studio = createStudio();
  studio.context.simulationSeconds = 75;
  studio.api.actions.stepBack();
  assert.equal(studio.context.simulationSeconds, 74.8);
  assert.equal(studio.context.state.animate, false);
});

test("live rendering pauses while export preview owns the screen", () => {
  const studio = createStudio();
  studio.context.document.hidden = false;
  studio.context.state.animate = true;
  studio.node("#export-preview-dialog").open = true;
  studio.api.tick(1000);
  assert.equal(studio.values.size, 0);
});

test("time spent paused does not enter the next animated frame", () => {
  const studio = createStudio();
  studio.context.document.hidden = false;
  studio.context.state.animate = true;
  studio.api.tick(1000);
  studio.context.state.animate = false;
  studio.api.tick(1200);
  studio.context.state.animate = true;
  studio.api.tick(11200);
  assert.equal(studio.context.simulationSeconds, 7);
});

test("loading and undoing playback state reset the animation clock", () => {
  const studio = createStudio();
  studio.context.lastTickSeconds = 1;
  studio.api.applyPlanetCode(btoa(JSON.stringify({ seed: 222, animate: true })));
  assert.equal(studio.context.lastTickSeconds, 0);
  studio.context.lastTickSeconds = 2;
  studio.context.editHistory = { undo: () => ({ ...studio.context.state, animate: false }) };
  studio.api.restoreHistory("undo");
  assert.equal(studio.context.lastTickSeconds, 0);
});

test("recording completion resets the frozen live preview clock", async () => {
  const studio = createStudio();
  studio.context.lastTickSeconds = 1;
  await studio.api.runExtra("exportVideo");
  assert.equal(studio.context.lastTickSeconds, 0);
  assert.equal(studio.context.recordingVideo, false);
});

test("editor navigation opens and focuses sections without consuming the share fragment", () => {
  const studio = createStudio();
  let prevented = false, focused = false, scrolled = false;
  const destination = studio.node("#section-moons");
  destination.tagName = "DETAILS";
  destination.querySelector = () => ({ focus() { focused = true; } });
  destination.scrollIntoView = () => { scrolled = true; };
  studio.context.window = { location: { hash: "#planet=shared-code" } };
  studio.api.navigateEditorLink({
    currentTarget: { getAttribute: () => "#section-moons" },
    preventDefault() { prevented = true; },
  });
  assert.equal(prevented, true);
  assert.equal(destination.open, true);
  assert.equal(focused && scrolled, true);
  assert.equal(studio.context.window.location.hash, "#planet=shared-code");
});

test("cancellation while PNG encoding is pending prevents the final download", async () => {
  const studio = createStudio();
  const controller = new AbortController();
  const downloads = [];
  studio.context.downloadBlob = (...args) => downloads.push(args);
  let finish;
  const encoding = studio.api.downloadCanvas({ toBlob(callback) { finish = callback; } },
    "cancelled.png", { signal: controller.signal });
  controller.abort();
  finish(new Blob(["encoded PNG"]));
  await assert.rejects(encoding, /Export cancelled/);
  assert.equal(downloads.length, 0);
});
