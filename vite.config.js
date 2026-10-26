export default {
  base: "./",
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
