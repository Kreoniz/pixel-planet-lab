// APNG writer. Each frame is losslessly PNG-encoded by the browser; the
// encoder wraps its IDAT streams in animated PNG chunks without recompression.
const SIGNATURE = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]);
const ascii = (s) => Uint8Array.from(s, (c) => c.charCodeAt(0));
const be32 = (n) => Uint8Array.of(n >>> 24 & 255, n >>> 16 & 255, n >>> 8 & 255, n & 255);
const be16 = (n) => Uint8Array.of(n >>> 8 & 255, n & 255);
const read32 = (p, i) => (p[i] * 0x1000000 +
  ((p[i + 1] << 16) | (p[i + 2] << 8) | p[i + 3])) >>> 0;
const equalBytes = (a, b) => a.length === b.length &&
  a.every((v, i) => v === b[i]);

const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++)
    c = c & 1 ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  crcTable[n] = c >>> 0;
}
function crc32(...segments) {
  let crc = 0xffffffff;
  for (const segment of segments)
    for (const b of segment)
      crc = crcTable[(crc ^ b) & 255] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, parts) {
  const name = ascii(type);
  const size = parts.reduce((sum, p) => sum + p.length, 0);
  const header = new Uint8Array(8);
  header.set(be32(size));
  header.set(name, 4);
  return [header, ...parts, be32(crc32(name, ...parts))];
}

// Exported for structural validation and helpful format errors.
export function inspectPng(png) {
  if (!(png instanceof Uint8Array) || png.length < 48 ||
      !equalBytes(png.subarray(0, 8), SIGNATURE))
    throw new Error("Expected a PNG encoded frame");
  const chunks = [];
  let offset = 8;
  while (offset + 12 <= png.length) {
    const size = read32(png, offset);
    if (size > png.length - offset - 12)
      throw new Error("Truncated PNG frame");
    const type = String.fromCharCode(...png.subarray(offset + 4, offset + 8));
    const data = png.subarray(offset + 8, offset + 8 + size);
    chunks.push({ type, data });
    offset += size + 12;
    if (type === "IEND") break;
  }
  if (chunks[0]?.type !== "IHDR" ||
      !chunks.some((x) => x.type === "IDAT") ||
      chunks.at(-1)?.type !== "IEND")
    throw new Error("Invalid PNG structure");
  return {
    width: read32(chunks[0].data, 0),
    height: read32(chunks[0].data, 4),
    profile: chunks[0].data.subarray(8),
    chunks,
  };
}

export function encodeApng(pngFrames, { fps = 12, repeat = true } = {}) {
  if (!Array.isArray(pngFrames) || pngFrames.length < 1 ||
      pngFrames.length > 150)
    throw new Error("Invalid APNG frame count");
  if (!Number.isInteger(fps) || fps < 1 || fps > 60)
    throw new Error("Invalid APNG frame rate");

  const first = inspectPng(pngFrames[0]);
  const { width, height, profile } = first;
  if (width < 1 || height < 1 || width > 2048 || height > 2048)
    throw new Error("Invalid APNG dimensions");
  const pieces = [SIGNATURE];
  const write = (type, ...parts) => pieces.push(...chunk(type, parts));
  let sequence = 0;
  write("IHDR", first.chunks[0].data);
  write("acTL", be32(pngFrames.length), be32(repeat ? 0 : 1));

  // Preserve the color profile and any ancillary chunks before IDAT.
  for (const { type, data } of first.chunks.slice(1)) {
    if (type === "IDAT") break;
    if (!["acTL", "fcTL", "fdAT", "IHDR", "IEND"].includes(type))
      write(type, data);
  }

  for (let i = 0; i < pngFrames.length; i++) {
    const frame = i ? inspectPng(pngFrames[i]) : first;
    if (frame.width !== width || frame.height !== height ||
        !equalBytes(frame.profile, profile))
      throw new Error("APNG frames must share dimensions and color format");
    // PNG frame timings are rational fractions; 1/fps is exact.
    write("fcTL", be32(sequence++), be32(width), be32(height),
      be32(0), be32(0), be16(1), be16(fps), Uint8Array.of(0, 0));
    for (const { type, data } of frame.chunks) {
      if (type !== "IDAT") continue;
      if (i === 0) write("IDAT", data);
      else write("fdAT", be32(sequence++), data);
    }
  }

  write("IEND");
  return new Blob(pieces, { type: "image/png" });
}
