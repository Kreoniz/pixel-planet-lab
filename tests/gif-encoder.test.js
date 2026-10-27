import test from "node:test";
import assert from "node:assert/strict";
import { createGifEncoder } from "../src/gif-encoder.js";

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
