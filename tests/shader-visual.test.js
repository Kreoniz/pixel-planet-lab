import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../src/main.js", import.meta.url), "utf8");
const quote = String.fromCharCode(96);
const fragment = source.split("const fragmentSource = " + quote)[1]?.split(quote + ";")[0];

test("pixel planet shader retains every body type and the WebGL2 entrypoint", () => {
  assert.ok(fragment?.startsWith("#version 300 es"));
  for (const functionName of [
    "rockySurface", "gasSurface", "starSurface", "blackHoleSurface",
    "getRing", "drawMoons", "background",
  ]) {
    assert.match(fragment, new RegExp("\\b" + functionName + "\\("));
  }
  assert.match(fragment, /outColor\s*=\s*vec4\(clamp\(color/);
});

test("pixel-art finish uses a complete stable 4x4 Bayer threshold map", () => {
  assert.match(fragment, /float bayer4\(vec2 pixel\)/);
  assert.match(fragment, /float low = 2\.0 \* lowCell\.x \+ 3\.0 \* lowCell\.y/);
  assert.match(fragment, /float high = 2\.0 \* highCell\.x \+ 3\.0 \* highCell\.y/);
  const b2 = (x, y) => 2 * x + 3 * y - 4 * x * y;
  const matrix = Array.from({ length: 4 }, (_, y) =>
    Array.from({ length: 4 }, (_, x) =>
      4 * b2(x % 2, y % 2) + b2(Math.floor(x / 2), Math.floor(y / 2))));
  assert.deepEqual(matrix, [
    [0, 8, 2, 10], [12, 4, 14, 6],
    [3, 11, 1, 9], [15, 7, 13, 5],
  ]);
  assert.match(fragment, /bayer4\(gl_FragCoord\.xy\)/);
  assert.doesNotMatch(fragment, /float grain = \(hash12\(gl_FragCoord/);
});

test("nonillustrated worlds retain their terrain and cloud composition paths", () => {
  assert.match(fragment, /float continent = fbm\(/);
  assert.match(fragment, /float h = continent \* 0\.78/);
  assert.match(fragment, /float shore = smoothstep/);
  assert.match(fragment, /if \(uBody == 4\)[\s\S]+?sea = mix\(uPalette\[1\]/);
  assert.match(fragment, /float daylight = smoothstep/);
  assert.match(fragment, /float waterMask = 1\.0 - surf\.land/);
  assert.match(fragment, /float warp = fbm[\s\S]+?float stripe = smoothstep/);
  assert.match(fragment, /float coverage = smoothstep/);
});

test("background stars and tone quantization remain sparse and bounded", () => {
  assert.match(fragment, /float density = \(uBody == 0 \|\| uBody == 4\)/);
  assert.match(fragment, /float star = step\(1\.0 - uStars \* density \* 0\.012/);
  assert.match(fragment, /float bright = step\(1\.0 - uStars \* density \* 0\.002/);
  assert.match(fragment, /color = floor\(color \* 26\.0 \+ 0\.5 \+ offset\) \/ 26\.0/);
  assert.match(fragment, /color = clamp\(color, 0\.0, 1\.0\)/);
});

test("terrestrial and ocean worlds use separate discrete water, land, and cloud layers", () => {
  assert.match(fragment, /vec3 illustratedSurface\(vec3 p, vec3 normal, vec3 light, float turn\)/);
  assert.match(fragment, /float landMask = step\(landCutoff, height\)/);
  assert.match(fragment, /vec3 color = mix\(water, land, landMask\)/);

  assert.match(fragment, /color = mix\(color, cloudTint, cloudMask \* 0\.86\)/);
  assert.match(fragment, /if \(uBody == 0 \|\| uBody == 4\)/);
  assert.match(fragment, /if \(uBody != 0 && uBody != 4\) \{/);
});

test("illustrated clouds use limited chosen material shades", () => {
  assert.match(fragment, /vec3 cloudShadow = mix\(uPalette\[0\], vec3\(0\.65, 0\.73, 0\.76\), 0\.80\)/);
  assert.match(fragment, /vec3 cloudBright = mix\(uPalette\[4\], vec3\(0\.93, 0\.97, 0\.93\), 0\.88\)/);
});

test("illustrated surfaces use coastal shallows and highland patches", () => {
  assert.match(fragment, /float landCutoff = mix\(0\.42, 0\.60, uWater\)/);
  assert.match(fragment, /height > landCutoff - 0\.055/);

  assert.doesNotMatch(fragment, /float grain = \(hash12\(gl_FragCoord/);
});

test("illustrated clouds use spherical coordinates without a giant front mask", () => {
  assert.match(fragment, /vec3 cp = rotateY\(p, uTime \* uCloudSpeed \* 0\.045\)/);
  assert.doesNotMatch(fragment, /float flowingFront|float frontMask/);
});

test("clouds are independent weather clusters, not a continuous global sash", () => {
  assert.match(fragment, /float cloudField = large \* 0\.76 \+ small \* 0\.24/);
  assert.match(fragment, /float cutoff = mix\(0\.77, 0\.53, uClouds\)/);
  assert.match(fragment, /float cloudMask = step\(cutoff \+ jitter, cloudField\)/);
  assert.match(fragment, /float brightCore = step\(cutoff \+ 0\.085, cloudField\)/);
  assert.match(fragment, /color = mix\(color, cloudTint, cloudMask \* 0\.86\)/);
  assert.match(fragment, /vec3 cp = rotateY\(p, uTime \* uCloudSpeed \* 0\.045\)/);
  assert.doesNotMatch(fragment, /frontY|frontWidth|flowingFront|frontDistance/);
});

test("land detail uses patches rather than narrow isolated contour lines", () => {
  assert.match(fragment, /float highland = noise\(p \* \(7\.0/);
  assert.match(fragment, /if \(highland > 0\.72\)/);
  assert.doesNotMatch(fragment, /float ridge = abs\(noise\(p \* \(10\.0/);
});

test("toxic planets use multi-scale warped turbulence instead of a single blob mask", () => {
  assert.match(fragment, /Surface toxicSurface\(vec3 p\)/);
  assert.match(fragment, /if \(uBody == 6\) return toxicSurface\(p\)/);
  assert.match(fragment, /vec3 warped = p \+ vec3\(curl - 0\.5, broad - 0\.5, swirl - 0\.5\)/);
  assert.match(fragment, /float medium = fbm\(warped \* \(6\.8 \+ uTerrain \* 3\.5\)/);
  assert.match(fragment, /float small = noise\(warped \* \(15\.0 \+ uRoughness \* 11\.0\)/);
  assert.match(fragment, /float detail = noise\(warped \* 32\.0/);
  assert.match(fragment, /float streaks = sin\(warped\.y \* 26\.0/);
  assert.match(fragment, /if \(uBody == 6\) \{[\s\S]*?float haze = noise\(cp \* \(10\.5/);
  assert.doesNotMatch(fragment, /float acid = smoothstep\(0\.24, 0\.76, noise/);
});
