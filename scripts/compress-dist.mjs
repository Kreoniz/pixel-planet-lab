import { brotliCompress, gzip } from "node:zlib";
import { promisify } from "node:util";
import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";

const brotli = promisify(brotliCompress);
const gzipAsync = promisify(gzip);
const dist = new URL("../dist/", import.meta.url);
const extensions = new Set([".html", ".js", ".css", ".json", ".svg", ".txt", ".wasm"]);

let files = 0;

for (const file of await walk(dist.pathname)) {
  if (!extensions.has(file.slice(file.lastIndexOf("."))) || file.endsWith(".gz") || file.endsWith(".br")) continue;
  const input = await readFile(file);
  if (input.length < 1024) continue;
  const [gz, br] = await Promise.all([
    gzipAsync(input, { level: 9 }),
    brotli(input, { params: { 1: 11 } }),
  ]);
  await Promise.all([writeFile(`${file}.gz`, gz), writeFile(`${file}.br`, br)]);
  files += 1;
}

console.log(`compressed ${files} dist asset${files === 1 ? "" : "s"} with gzip and brotli`);

async function walk(dir) {
  const entries = await readdir(dir);
  const files = [];
  for (const entry of entries) {
    const path = join(dir, entry);
    const info = await stat(path);
    if (info.isDirectory()) files.push(...await walk(path));
    else files.push(path);
  }
  return files;
}
