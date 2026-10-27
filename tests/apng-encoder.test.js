import test from "node:test";
import assert from "node:assert/strict";
import { deflateSync } from "node:zlib";
import { inspectPng, encodeApng } from "../src/apng-encoder.js";

const sig = Uint8Array.of(137,80,78,71,13,10,26,10);
const be32 = (n) => Uint8Array.of(n >>> 24 & 255, n >>> 16 & 255, n >>> 8 & 255, n & 255);
const table = Uint32Array.from({ length: 256 }, (_, v) => {
  for (let i = 0; i < 8; i++) v = v & 1 ? 0xedb88320 ^ v >>> 1 : v >>> 1;
  return v >>> 0;
});
function chunk(name, data) {
  const title = Buffer.from(name, "ascii");
  let crc = 0xffffffff;
  for (const n of [title, data])
    for (const b of n) crc = table[(crc ^ b) & 255] ^ crc >>> 8;
  return Buffer.concat([be32(data.length), title, data, be32((crc ^ 0xffffffff) >>> 0)]);
}
function makePng(color) {
  const head = Buffer.alloc(13);
  head.writeUInt32BE(2, 0);
  head.writeUInt32BE(2, 4);
  head[8] = 8; head[9] = 6;
  const rows = Buffer.alloc(2 * (1 + 2 * 4));
  for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++)
    rows.set(color, y * 9 + 1 + x * 4);
  return Buffer.concat([sig, chunk("IHDR", head),
    chunk("IDAT", deflateSync(rows)), chunk("IEND", Buffer.alloc(0))]);
}
function names(png) {
  const found = [];
  for (let i = 8; i < png.length;) {
    const length = png.readUInt32BE(i);
    const title = png.subarray(i + 4, i + 8).toString("ascii");
    found.push(title);
    i += length + 12;
    if (title === "IEND") break;
  }
  return found;
}
test("APNG wraps PNG IDAT chunks with sequential animated chunks", async () => {
  const first = makePng([0, 180, 80, 255]);
  const second = makePng([80, 90, 180, 0]);
  assert.equal(inspectPng(first).width, 2);
  const apng = Buffer.from(await encodeApng([first, second], {fps:12, repeat:true}).arrayBuffer());
  assert.equal(apng.subarray(0, 8).compare(Buffer.from(sig)), 0);
  assert.deepEqual(names(apng), ["IHDR", "acTL", "fcTL", "IDAT", "fcTL", "fdAT", "IEND"]);
  const a = apng.indexOf(Buffer.from("acTL"));
  assert.equal(apng.readUInt32BE(a + 4), 2);
  assert.equal(apng.readUInt32BE(a + 8), 0);
  const f = apng.indexOf(Buffer.from("fcTL"));
  assert.equal(apng.readUInt32BE(f + 4), 0);
  assert.equal(apng.readUInt16BE(f + 24), 1);
  assert.equal(apng.readUInt16BE(f + 26), 12);
});
test("APNG disallows incompatible PNG frames and invalid durations", () => {
  const png = makePng([255, 255, 255, 255]);
  assert.throws(() => inspectPng(new Uint8Array(10)), /Expected a PNG/);
  assert.throws(() => encodeApng([], {fps:12}), /Invalid APNG frame/);
  assert.throws(() => encodeApng([png], {fps:0}), /Invalid APNG frame rate/);
  const bad = Buffer.from(png);
  bad.writeUInt32BE(3, 16);
  assert.throws(() => encodeApng([png, bad], {fps:12}), /share dimensions/);
});
