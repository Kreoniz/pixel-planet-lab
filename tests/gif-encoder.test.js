import test from "node:test";
import assert from "node:assert/strict";
import { createGifEncoder } from "../src/gif-encoder.js";

function frameDelays(bytes) {
  const delays = [];
  let offset = 13;
  if (bytes[10] & 0x80) offset += 3 * (1 << ((bytes[10] & 7) + 1));
  const skipBlocks = () => {
    while (bytes[offset]) offset += 1 + bytes[offset];
    offset++;
  };
  while (bytes[offset] !== 0x3b) {
    const marker = bytes[offset++];
    if (marker === 0x21) {
      const label = bytes[offset++];
      if (label === 0xf9) delays.push(bytes.readUInt16LE(offset + 2));
      skipBlocks();
    } else {
      assert.equal(marker, 0x2c, "Expected GIF image descriptor");
      const packed = bytes[offset + 8];
      offset += 9;
      if (packed & 0x80) offset += 3 * (1 << ((packed & 7) + 1));
      offset++; // LZW minimum code size
      skipBlocks();
    }
  }
  return delays;
}

test("GIF89a contains animated frames, looping and transparent index", async () => {
  const gif = createGifEncoder({width:64,height:64,fps:12,repeat:true});
  for(let f=0;f<6;f++){
    const rgba = new Uint8Array(64*64*4);
    for(let y=0;y<64;y++) for(let x=0;x<64;x++){
      const k=(y*64+x)*4;
      rgba[k]=Math.min(255,x*4);
      rgba[k+1]=Math.min(255,y*4);
      rgba[k+2]=f*35;
      rgba[k+3]=Math.hypot(x-32,y-32)<24?255:0;
    }
    gif.addFrame(rgba);
  }
  const bytes=Buffer.from(await gif.finish().arrayBuffer());
  assert.equal(bytes.subarray(0,6).toString("ascii"),"GIF89a");
  assert.equal(bytes.readUInt16LE(6),64);
  assert.equal(bytes.readUInt16LE(8),64);
  assert.ok(bytes.includes(Buffer.from("NETSCAPE2.0")));
  assert.equal(bytes[bytes.length-1],0x3b);
  let count=0;
  for(let i=0;i<bytes.length-3;i++){
    if(bytes[i]===0x21&&bytes[i+1]===0xf9&&bytes[i+2]===4)count++;
  }
  assert.equal(count,6);
});

test("GIF validates dimensions, alpha and empty frames", async () => {
  assert.throws(() => createGifEncoder({width:0,height:2}), /Invalid GIF dimensions/);
  assert.throws(() => createGifEncoder({width:513,height:2}), /Invalid GIF dimensions/);
  assert.throws(() => createGifEncoder({width:2,height:2,fps:0}), /Invalid GIF frame rate/);
  const gif = createGifEncoder({width:2,height:2,repeat:false});
  assert.throws(() => gif.addFrame(new Uint8Array(3)), /GIF frame size mismatch/);
  await assert.rejects(async() => gif.finish(), /requires at least one frame/);
  gif.addFrame(new Uint8Array(16));
  const bytes=Buffer.from(await gif.finish().arrayBuffer());
  assert.equal(bytes.includes(Buffer.from("NETSCAPE2.0")),false);
});

for (const fps of [1, 4, 12, 24, 30, 50]) {
  test(`GIF timing preserves four seconds at ${fps} FPS`, async () => {
    const gif = createGifEncoder({ width: 1, height: 1, fps });
    const rgba = Uint8Array.of(255, 255, 255, 255);
    const frames = fps * 4;
    for (let i = 0; i < frames; i++) gif.addFrame(rgba);
    const bytes = Buffer.from(await gif.finish().arrayBuffer());
    const delays = frameDelays(bytes);
    assert.equal(delays.length, frames);
    let elapsed = 0;
    delays.forEach((delay, i) => {
      assert.ok(delay >= 2, "Frame delay must remain browser-safe");
      elapsed += delay;
      assert.ok(Math.abs(elapsed - (i + 1) * 100 / fps) <= 0.500001,
        "Frame boundaries must stay within half a centisecond of requested timing");
    });
    assert.equal(elapsed, 400);
  });
}
