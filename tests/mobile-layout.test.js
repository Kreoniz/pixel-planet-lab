import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");

test("phone toolbar uses a four-column grid with non-clipping action buttons", () => {
  assert.match(css, /@media \(max-width: 540px\)[\s\S]*?\.toolbar \{\s*display: grid;\s*grid-template-columns: repeat\(4, minmax\(0, 1fr\)\)/);
  assert.match(css, /\.toolbar > button,[\s\S]*?\.toolbar > \.shortcuts-trigger \{[\s\S]*?min-width: 0;[\s\S]*?min-height: 46px/);
});

test("phone preview metadata has its own timeline row", () => {
  assert.match(css, /\.preview-meta \{\s*display: grid;\s*grid-template-columns: minmax\(0, 1fr\) auto/);
  assert.match(css, /\.timeline \{\s*grid-column: 1 \/ -1;\s*grid-row: 2/);
});

test("phone planet type and palette controls span both columns", () => {
  assert.match(css, /\.control-grid > \[data-control="body"\],[\s\S]*?\.control-grid > \[data-control="palette"\] \{\s*grid-column: 1 \/ -1/);
  assert.match(css, /padding-bottom: calc\(24px \+ env\(safe-area-inset-bottom, 0px\)\)/);
});
