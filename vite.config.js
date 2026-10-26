import { minifyGLSL } from "./scripts/minify-glsl.mjs";

const shaderLiterals = /(const (?:vertexSource|fragmentSource) = `)([\s\S]*?)(`;)/g;

function compressInlineShaders() {
  return {
    name: "minify-inline-glsl",
    apply: "build",
    enforce: "pre",
    transform(code, id) {
      if (!id.endsWith("/src/main.js")) return null;
      let count = 0;
      const output = code.replace(shaderLiterals, (_, start, shader, end) => {
        count += 1;
        return start + minifyGLSL(shader) + end;
      });
      if (count !== 2) throw new Error("Could not find both WebGL shaders");
      return { code: output, map: null };
    },
  };
}

export default {
  plugins: [compressInlineShaders()],
  // Project Pages is hosted at https://kreoniz.github.io/pixel-planet-lab/.
  base: "/pixel-planet-lab/",
  build: {
    target: "es2020",
    minify: "esbuild",
    sourcemap: false,
    assetsInlineLimit: 2048,
    rollupOptions: {
      output: {
        entryFileNames: "assets/[name]-[hash].js",
        chunkFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash][extname]",
      },
    },
  },
};
