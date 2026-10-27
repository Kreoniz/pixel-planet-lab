import test from "node:test";
import assert from "node:assert/strict";
import { renderApp, syncExportUi } from "../src/ui.js";
import { chooseExportPreset } from "../src/export-options.js";
import { readFileSync } from "node:fs";

test("the export section exposes three presets and separate optional layers", () => {
  const root = { innerHTML: "" };
  renderApp(root);
  const html = root.innerHTML;
  assert.match(html, /data-export-preset/);
  for (const name of ["full-scene", "planet-only", "planet-rings"]) {
    assert.ok(html.includes('value="' + name + '"'));
  }
  for (const key of ["transparent", "rings", "moons", "glow", "stars"]) {
    assert.ok(html.includes('data-export-option="' + key + '"'));
  }
  assert.match(html, /PNG \/ spritesheet content/);
  assert.match(html, /data-action="previewExport"/);
  assert.match(html, /id="export-preview-dialog"/);
});

test("export settings sync separately and star toggle disables on transparency", () => {
  const inputs = Object.fromEntries(["transparent", "rings", "moons", "glow", "stars"]
    .map(key => [key, { dataset: { exportOption: key }, checked: false, disabled: false }]));
  const preset = { value: "" };
  const summary = { textContent: "" };
  const oldDocument = globalThis.document;
  globalThis.document = {
    querySelector(selector) {
      if (selector === "[data-export-preset]") return preset;
      if (selector === "[data-export-summary]") return summary;
      return null;
    },
    querySelectorAll(selector) {
      return selector === "[data-export-option]" ? Object.values(inputs) : [];
    },
  };
  try {
    syncExportUi(chooseExportPreset("planet-only"));
    assert.equal(preset.value, "planet-only");
    assert.equal(inputs.moons.checked, false);
    assert.equal(inputs.stars.disabled, true);
    assert.match(summary.textContent, /Transparent/);
    syncExportUi(chooseExportPreset("full-scene"));
    assert.equal(inputs.stars.checked, true);
    assert.equal(inputs.stars.disabled, false);
    assert.match(summary.textContent, /Opaque/);
  } finally {
    globalThis.document = oldDocument;
  }
});

test("fragment shader composes true scene alpha and preserves opaque preview defaults", () => {
  const code = readFileSync(new URL("../src/main.js", import.meta.url), "utf8");
  for (const key of [
    "uExportTransparent", "uExportMoons", "uExportRings",
    "uExportGlow", "uExportStars",
  ]) assert.match(code, new RegExp("uniform float " + key + ";"));
  assert.match(code, /vec4 overLayer\(vec4 dst, vec3 rgb, float coverage\)/);
  assert.match(code, /scene = vec4\(color, 1\.0\)/);
  assert.match(code, /outColor = vec4\(clamp\(color, 0\.0, 1\.0\), scene\.a\)/);
  assert.match(code, /scene\.a > 0\.0001 \? scene\.rgb \/ scene\.a/);
  assert.match(code, /gl\.bindFramebuffer\(gl\.FRAMEBUFFER, target\?\.framebuffer \?\? null\)/);
  assert.match(code, /layers\?\.transparent \? 1 : 0/);
  assert.match(code, /layers\?\.moons === false \? 0 : 1/);
});


test("animated export controls live within existing Export section", () => {
  const root={innerHTML:""};
  renderApp(root);
  const html=root.innerHTML;
  for(const needle of [
    'data-animation-setting="seconds"',
    'data-animation-setting="fps"',
    'data-animation-setting="seamless"',
    'data-animation-setting="repeat"',
    'data-action="exportApng"',
    'data-action="exportGif"',
    'data-action="previewAnimation"',
    'data-action="cancelAnimatedExport"',
    'data-animation-preview-toggle',
    'data-preview-frame',
  ]) assert.ok(html.includes(needle), "Missing "+needle);
});

test("animation inputs sync and block oversized exports", async () => {
  const { syncAnimationUi }=await import("../src/ui.js");
  const inputs = Object.fromEntries(["seconds","fps","seamless","repeat"]
    .map(key=>[key,{dataset:{animationSetting:key},type:["seconds","fps"].includes(key)?"number":"checkbox"}]));
  const summary={textContent:"",dataset:{}};
  const buttons=Object.fromEntries(["previewAnimation","exportApng","exportGif"].map(k=>[k,{disabled:false}]));
  const old=globalThis.document;
  globalThis.document={
    querySelectorAll(q){return q==="[data-animation-setting]"?Object.values(inputs):[];},
    querySelector(q){
      if(q==="[data-animation-summary]")return summary;
      const match=q.match(/data-action="([^"]+)"/);
      return match?buttons[match[1]]:null;
    },
  };
  try {
    syncAnimationUi({seconds:4,fps:12,seamless:true,repeat:true});
    assert.equal(inputs.seconds.value,"4");
    assert.equal(inputs.seamless.checked,true);
    assert.equal(buttons.exportApng.disabled,false);
    syncAnimationUi({seconds:12,fps:30,seamless:false,repeat:false});
    assert.equal(summary.dataset.invalid,"true");
    assert.ok(summary.textContent.includes("120-frame limit"));
    assert.equal(buttons.exportGif.disabled,true);
  }finally {globalThis.document=old;}
});

test("seamless export shader uses a periodic cloud rotation path", () => {
  const source = readFileSync(new URL("../src/main.js",import.meta.url),"utf8");
  assert.match(source,/uniform float uExportLoop/);
  assert.match(source,/float cloudsTurn = uExportLoop > 0\.5 \? turn/);
  assert.match(source,/gl\.uniform1f\(uniforms\.uExportLoop, target\?\.seamless \? 1 : 0\)/);
});
