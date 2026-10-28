import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../src/main.js", import.meta.url), "utf8");
const q = String.fromCharCode(96);
const fragment = source.split("const fragmentSource = " + q)[1]?.split(q + ";")[0];
const moons = fragment?.slice(fragment.indexOf("vec3 moonRock("), fragment.indexOf("// A fixed 4x4 Bayer"));

test("each moon has a distinct authored rock material and crisp sphere lighting", () => {
  assert.ok(moons, "moon GLSL is present");
  assert.match(moons, /vec3 moonRock\(vec3 surface, vec3 normal, vec3 light, vec3 geologyLight, float fi\)/);
  assert.match(moons, /float kind = mod\(floor\(uSeed \* 0\.017\) \+ fi, 4\.0\)/);
  assert.match(moons, /Ice moon: pale blue/);
  assert.match(moons, /Iron-rich moon: oxidized ochre/);
  assert.match(moons, /Dark basaltic moon/);
  assert.match(moons, /float ndl = dot\(normal, light\)/);
  assert.match(moons, /float day = smoothstep\(-0\.15, 0\.18, ndl\)/);
  assert.match(moons, /floor\(shaded \* 22\.0 \+ 0\.5\) \/ 22\.0/);
});

test("craters form seeded, spherical impact basins with directional rims", () => {
  assert.match(moons, /for \(int crater = 0; crater < 4; crater\+\+\)/);
  assert.match(moons, /float chord = length\(surface - center\)/);
  assert.match(moons, /float basin = 1\.0 - smoothstep/);
  assert.match(moons, /float rim = smoothstep/);
  assert.match(moons, /float rimLight = clamp\(dot/);
  assert.match(moons, /geologyLight/);
  assert.doesNotMatch(moons, /float pits = fbm/);
});

test("moon orbits use golden-angle spacing, depth ordering, and distinct sizes", () => {
  assert.match(moons, /fi \* 2\.3999632 \+ uTime \* orbitSpeed/);
  assert.match(moons, /float orbitSpeed = mix\(0\.08, 0\.62, uMoonSpeed\) \/ sqrt\(1\.0 \+ fi \* 0\.24\)/);
  assert.match(moons, /float depth = orbit\.w/);
  assert.match(moons, /float bestDepth = -1e6/);
  assert.match(moons, /distanceSquared >= 1\.0 \|\| depth <= bestDepth/);
  assert.match(moons, /vec4 orbit = uMoonData\[i\]/);
  assert.match(moons, /vec2 mxy = \(uv - orbit\.xy\) \/ r/);
  assert.match(moons, /if \(foundMoon\) return vec4\(nearestMoon, 1\.0\)/);
});

test("moon rendering obeys transparent export layer toggles and both planet passes", () => {
  assert.match(moons, /if \(uMoons <= 0 \|\| uExportMoons < 0\.5\) return color/);
  assert.match(fragment, /scene = drawMoons\(scene, uv, radius, light, 0\.0\)/);
  assert.match(fragment, /scene = drawMoons\(scene, uv, radius, light, 1\.0\)/);
  assert.match(moons, /if \(abs\(front - frontPass\) > 0\.5\) continue/);
  assert.match(moons, /vec2 mxy = \(uv - orbit\.xy\) \/ r/);
  assert.match(moons, /float moonSpin = phase \* 0\.10 \+ fi \* 1\.47/);
});


test("nearest moons match parent body geology while outer moons retain variety", () => {
  assert.match(moons, /if \(uBody == 0 \|\| uBody == 4\) kind = 0\.0/);
  assert.match(moons, /else if \(uBody == 2\) kind = 1\.0/);
  assert.match(moons, /else if \(uBody == 6\) kind = 2\.0/);
  assert.match(moons, /else if \(uBody == 3\) kind = 3\.0/);
  assert.match(fragment, /uniform vec4 uMoonData\[8\]/);
});


test("orbital uniforms are packed once per draw rather than per fragment", () => {
  assert.match(source, /import \{ moonOrbitVectors \} from "\.\/moon-orbits\.js"/);
  assert.match(source, /"uMoonData\[0\]"/);
  assert.match(source, /gl\.uniform4fv\(uniforms\["uMoonData\[0\]"\], moonOrbitVectors\(planet, timeSeconds\)\)/);
  assert.match(moons, /vec4 orbit = uMoonData\[i\]/);
  assert.doesNotMatch(moons, /vec2 ellipse = vec2\(cos\(a\)/);
});
