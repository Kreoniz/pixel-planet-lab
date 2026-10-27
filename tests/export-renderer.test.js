import test from "node:test";
import assert from "node:assert/strict";
import { flipRgbaRows, createExportRenderer } from "../src/export-renderer.js";

test("RGBA row flipping preserves alpha and pixel color independently", () => {
  const bottomUp = new Uint8Array([
    100, 0, 0, 0,    200, 0, 0, 128,
    20, 30, 40, 255, 90, 80, 70, 64,
  ]);
  assert.deepEqual(Array.from(flipRgbaRows(bottomUp, 2, 2)), [
    20, 30, 40, 255, 90, 80, 70, 64,
    100, 0, 0, 0, 200, 0, 0, 128,
  ]);
  assert.throws(() => flipRgbaRows(bottomUp, 3, 3), /Invalid RGBA/);
});

test("offscreen renderer allocates RGBA8, draws without touching preview canvas and disposes", () => {
  const calls = [];
  const framebuffer = { kind: "framebuffer" };
  const texture = { kind: "texture" };
  const mockGl = {
    FRAMEBUFFER: 1, TEXTURE_2D: 2, RGBA8: 3, RGBA: 4,
    UNSIGNED_BYTE: 5, NEAREST: 6, COLOR_ATTACHMENT0: 7,
    FRAMEBUFFER_COMPLETE: 8, TEXTURE_MIN_FILTER: 9,
    TEXTURE_MAG_FILTER: 10, TEXTURE_WRAP_S: 11, TEXTURE_WRAP_T: 12,
    CLAMP_TO_EDGE: 13,
    createFramebuffer() { return framebuffer; },
    createTexture() { return texture; },
    bindFramebuffer(...args) { calls.push(["bindFramebuffer", ...args]); },
    bindTexture() {},
    texParameteri() {},
    texImage2D(...args) { calls.push(["texImage2D", args[2], args[3], args[4]]); },
    framebufferTexture2D() {},
    checkFramebufferStatus() { return this.FRAMEBUFFER_COMPLETE; },
    readPixels(_x, _y, w, h, _format, _type, pixels) {
      assert.equal(w, 2);
      assert.equal(h, 2);
      pixels.set([
        0, 0, 0, 0, 1, 2, 3, 255,
        10, 20, 30, 255, 100, 200, 50, 128,
      ]);
    },
    deleteTexture(t) { calls.push(["deleteTexture", t]); },
    deleteFramebuffer(fb) { calls.push(["deleteFramebuffer", fb]); },
  };
  const originalDocument = globalThis.document;
  const drawn = [];
  const canvas = {
    getContext() {
      return {
        createImageData(w, h) { return { data: new Uint8ClampedArray(w * h * 4) }; },
        putImageData(img) { drawn.push([...img.data]); },
      };
    },
  };
  globalThis.document = { createElement(name) { assert.equal(name, "canvas"); return canvas; } };
  try {
    const draw = (time, turn, target) => calls.push(["draw", time, turn, target]);
    const exporter = createExportRenderer(mockGl, draw, 2);
    const settings = { transparent: true, moons: false };
    assert.equal(exporter.render(4, 5, settings), canvas);
    assert.deepEqual(drawn[0].slice(0, 4), [10, 20, 30, 255]);
    assert.deepEqual(drawn[0].slice(-4), [1, 2, 3, 255]);
    assert.equal(calls.find(x => x[0] === "draw")[3].options, settings);
    assert.equal(calls.find(x => x[0] === "draw")[3].seamless, false);
    assert.equal(calls.find(x => x[0] === "draw")[3].framebuffer, framebuffer);
    exporter.render(5, 6, settings, true);
    assert.equal(calls.filter(x => x[0] === "draw").at(-1)[3].seamless, true);
    assert.ok(calls.some(x => x[0] === "texImage2D" && x[1] === mockGl.RGBA8));
    exporter.dispose();
    exporter.dispose();
    assert.equal(calls.filter(x => x[0] === "deleteFramebuffer").length, 1);
    assert.throws(() => exporter.render(4, 5, settings), /disposed/);
  } finally {
    globalThis.document = originalDocument;
  }
});
