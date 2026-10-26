import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { minifyGLSL } from "../scripts/minify-glsl.mjs";

test("compacts shader sources while keeping #version on its own line", () => {
  const source = readFileSync(new URL("../src/main.js", import.meta.url), "utf8");
  const matches = [...source.matchAll(/const (?:vertexSource|fragmentSource) = `([\s\S]*?)`;/g)];
  assert.equal(matches.length, 2);

  for (const match of matches) {
    const original = match[1];
    const compact = minifyGLSL(original);
    assert.match(compact, /^#version 300 es\nprecision highp float;/);
    assert.ok(compact.length < original.length * 0.85);
    assert.equal(compact.split("\n").length, 2);
    assert.doesNotMatch(compact, /\/\/|\/\*/);
  }
});

test("keeps identifier boundaries and rejects extra preprocessor directives", () => {
  assert.equal(
    minifyGLSL("#version 300 es\n float x = 1.0 + 2.0; // comment\n float y = x;"),
    "#version 300 es\nfloat x=1.0+2.0;float y=x;",
  );
  assert.throws(() => minifyGLSL("#version 300 es\n#define A 3\nvoid main() {}"), /directive/);
});
