// Export to an offscreen RGBA WebGL2 framebuffer. The on-screen WebGL
// context can remain alpha:false: this attachment still retains real alpha.
export function flipRgbaRows(source, width, height, target = new Uint8ClampedArray(source.length)) {
  if (source.length !== width * height * 4 || target.length !== source.length)
    throw new Error("Invalid RGBA dimensions");
  const stride = width * 4;
  for (let row = 0; row < height; row++) {
    const start = (height - row - 1) * stride;
    target.set(source.subarray(start, start + stride), row * stride);
  }
  return target;
}

export function createExportRenderer(gl, draw, size) {
  if (!Number.isInteger(size) || size < 1 || size > 2048)
    throw new Error("Invalid export render size");

  const output = document.createElement("canvas");
  output.width = output.height = size;
  const ctx = output.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas 2D context unavailable");
  const framebuffer = gl.createFramebuffer();
  const texture = gl.createTexture();
  if (!framebuffer || !texture) {
    if (framebuffer) gl.deleteFramebuffer(framebuffer);
    if (texture) gl.deleteTexture(texture);
    throw new Error("Could not allocate RGBA export resources");
  }

  try {
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, size, size, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE)
      throw new Error("RGBA export framebuffer is unsupported");
  } catch (error) {
    gl.deleteTexture(texture);
    gl.deleteFramebuffer(framebuffer);
    throw error;
  } finally {
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.bindTexture(gl.TEXTURE_2D, null);
  }

  const raw = new Uint8Array(size * size * 4);
  const imageData = ctx.createImageData(size, size);
  let disposed = false;

  return {
    render(time, turn, options, seamless = false) {
      if (disposed) throw new Error("Export renderer was disposed");
      try {
        draw(time, turn, { framebuffer, size, options, seamless });
        gl.readPixels(0, 0, size, size, gl.RGBA, gl.UNSIGNED_BYTE, raw);
        flipRgbaRows(raw, size, size, imageData.data);
        ctx.putImageData(imageData, 0, 0);
        return output;
      } finally {
        // Restore the preview target without changing preview dimensions or
        // the user's planet settings, even if a frame read fails.
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      }
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.deleteTexture(texture);
      gl.deleteFramebuffer(framebuffer);
    },
  };
}
