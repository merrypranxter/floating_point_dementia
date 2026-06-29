#!/usr/bin/env node
// =============================================================================
// tools/bundle.js — flatten a .frag and its #includes into one file
// -----------------------------------------------------------------------------
// The viewer resolves #include in the browser, but Shadertoy (and other single-
// file targets) can't. This inlines every include — once, with guards honored —
// so you get one paste-ready shader.
//
//   node tools/bundle.js shaders/demo/bit_reveal.frag           # -> stdout
//   node tools/bundle.js shaders/demo/bit_reveal.frag out.glsl  # -> file
//
// Note: the output still uses iZero (a 0.0 uniform) for NaN/Inf. On Shadertoy,
// add near the top of the Image tab:
//     float iZero = min(iResolution.z, 0.0);   // 0.0, but un-foldable
// =============================================================================
"use strict";
const fs = require("fs");
const path = require("path");

function resolveIncludes(file, included) {
  const abs = path.normalize(file);
  if (included.has(abs)) return "";        // include guard
  included.add(abs);
  let src;
  try {
    src = fs.readFileSync(abs, "utf8");
  } catch (e) {
    throw new Error(`cannot read include: ${abs}`);
  }
  const dir = path.dirname(abs);
  return src.split("\n").map(line => {
    const m = line.match(/^[ \t]*#include\s+"([^"]+)"/);
    if (m) return resolveIncludes(path.join(dir, m[1]), included);
    return line;
  }).join("\n");
}

function main() {
  const entry = process.argv[2];
  const outFile = process.argv[3];
  if (!entry) {
    console.error("usage: node tools/bundle.js <entry.frag> [out.glsl]");
    process.exit(1);
  }
  const banner =
    `// ===== bundled from ${entry} by tools/bundle.js =====\n` +
    `// On Shadertoy, add:  float iZero = min(iResolution.z, 0.0);\n\n`;
  const bundled = banner + resolveIncludes(entry, new Set());
  if (outFile) {
    fs.writeFileSync(outFile, bundled);
    console.error(`wrote ${outFile} (${bundled.length} bytes)`);
  } else {
    process.stdout.write(bundled);
  }
}

main();
