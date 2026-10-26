// Build-only whitespace compaction for the two inline WebGL shaders.
// Shader statements remain intact; the #version directive must stay on its own line.
export function minifyGLSL(source) {
  const withoutComments = source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/[^\n]*/g, "");
  const version = withoutComments.match(/^\s*(#version[^\n]*)\n/);

  if (!version) throw new Error("Expected a GLSL #version directive");
  const body = withoutComments.slice(version[0].length);
  // A later preprocessor directive requires a separate newline.
  if (/^\s*#/m.test(body)) throw new Error("Unexpected GLSL preprocessor directive");

  return version[1].trim() + "\n" + body
    .replace(/\s+/g, " ")
    .replace(/\s*([{}()[\];,+*\/=<>!?:-])\s*/g, "$1")
    .trim();
}
