// Browser-native, dependency-free GIF89a encoder.
// GIF supports at most 256 indexed colors and binary transparency; APNG should
// be preferred when precise color and soft alpha are important.
const MAX_SIDE = 512;
const ascii = (s) => Uint8Array.from(s, (c) => c.charCodeAt(0));
const u16 = (n) => Uint8Array.of(n & 255, n >>> 8 & 255);

function palette() {
  const colors = new Uint8Array(256 * 3);
  // Reserve index 0 for transparency and index 1 for black. The remaining
  // entries use a fixed 3:3:2 RGB palette that includes clean white.
  for (let i = 1; i < 256; i++) {
    const code = i === 1 ? 0 : i;
    colors[i * 3] = Math.round(((code >>> 5) & 7) * 255 / 7);
    colors[i * 3 + 1] = Math.round(((code >>> 2) & 7) * 255 / 7);
    colors[i * 3 + 2] = (code & 3) * 85;
  }
  return colors;
}

function indexRgba(rgba, width, height) {
  if (rgba.length !== width * height * 4)
    throw new Error("GIF frame size mismatch");
  const indexed = new Uint8Array(width * height);
  for (let n = 0; n < indexed.length; n++) {
    const k = n * 4;
    // GIF can only represent fully transparent or fully opaque pixels.
    if (rgba[k + 3] < 128) {
      indexed[n] = 0;
      continue;
    }
    const r = Math.min(7, Math.round(rgba[k] * 7 / 255));
    const g = Math.min(7, Math.round(rgba[k + 1] * 7 / 255));
    const b = Math.min(3, Math.round(rgba[k + 2] * 3 / 255));
    const code = r << 5 | g << 2 | b;
    indexed[n] = code < 2 ? 1 : code;
  }
  return indexed;
}

// GIF-flavored LZW: 9-12 bit codes packed least-significant-bit first.
// The width grows after the next dictionary entry exceeds its bit capacity.
function lzw(pixels) {
  const clear = 256, end = 257;
  let width = 9, next = 258;
  let buffer = 0, bits = 0;
  const output = [];
  const table = new Map();

  function emit(code) {
    buffer |= code << bits;
    bits += width;
    while (bits >= 8) {
      output.push(buffer & 255);
      buffer >>>= 8;
      bits -= 8;
    }
  }
  emit(clear);
  let prefix = pixels[0];
  for (let i = 1; i < pixels.length; i++) {
    const symbol = pixels[i];
    const key = prefix * 256 + symbol;
    if (table.has(key)) {
      prefix = table.get(key);
    } else {
      emit(prefix);
      if (next < 4096) {
        table.set(key, next++);
        if (next > 1 << width && width < 12) width++;
      } else {
        emit(clear);
        table.clear();
        next = 258;
        width = 9;
      }
      prefix = symbol;
    }
  }
  emit(prefix);
  emit(end);
  if (bits) output.push(buffer & 255);

  const blocks = [];
  for (let i = 0; i < output.length; i += 255) {
    const slice = output.slice(i, i + 255);
    blocks.push(Uint8Array.of(slice.length), Uint8Array.from(slice));
  }
  blocks.push(Uint8Array.of(0));
  return blocks;
}

export function createGifEncoder({ width, height, fps = 12, repeat = true }) {
  if (!Number.isInteger(width) || !Number.isInteger(height) ||
      width < 1 || height < 1 || width > MAX_SIDE || height > MAX_SIDE)
    throw new Error("Invalid GIF dimensions");
  if (!Number.isInteger(fps) || fps < 1 || fps > 50)
    throw new Error("Invalid GIF frame rate");

  const output = [ascii("GIF89a"), u16(width), u16(height),
    Uint8Array.of(0xf7, 0, 0), palette()];
  if (repeat) output.push(Uint8Array.of(0x21, 0xff, 0x0b),
    ascii("NETSCAPE2.0"), Uint8Array.of(3, 1, 0, 0, 0));
  let frames = 0;

  return {
    addFrame(rgba) {
      const indices = indexRgba(rgba, width, height);
      // GIF stores centiseconds. Round cumulative boundaries so fractional
      // delays alternate without shortening the animation at rates like 30 FPS.
      const delay = Math.round((frames + 1) * 100 / fps) -
        Math.round(frames * 100 / fps);
      // Disposal 2 resets the transparent background between full frames.
      output.push(Uint8Array.of(0x21, 0xf9, 4, 0x09),
        u16(delay), Uint8Array.of(0, 0));
      output.push(Uint8Array.of(0x2c), u16(0), u16(0),
        u16(width), u16(height), Uint8Array.of(0));
      output.push(Uint8Array.of(8), ...lzw(indices));
      frames++;
    },
    finish() {
      if (!frames) throw new Error("GIF requires at least one frame");
      return new Blob([...output, Uint8Array.of(0x3b)], { type: "image/gif" });
    },
  };
}
