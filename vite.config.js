export default {
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
