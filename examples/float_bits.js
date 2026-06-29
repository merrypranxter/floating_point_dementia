#!/usr/bin/env node
// =============================================================================
// float_bits.js — dissect float64 (and float32) in the browser/Node
// -----------------------------------------------------------------------------
// JavaScript numbers are IEEE-754 binary64. This is the same anatomy as
// float_anatomy.py, but for the format your web code actually runs on, plus a
// float32 view (Math.fround) so you can see what a GPU `highp float` would store.
//
//   node examples/float_bits.js 0.1 1e16 9007199254740993 Infinity NaN
//   node examples/float_bits.js            # the guided tour
//
// In a browser, paste this file (minus the CLI bit at the bottom) and call
// anatomy64(0.1).
// =============================================================================
"use strict";

// ---- float64 anatomy --------------------------------------------------------
function anatomy64(x) {
  const buf = new ArrayBuffer(8);
  new Float64Array(buf)[0] = x;
  const hi = new Uint32Array(buf)[1]; // sign + exp + top mantissa (little-endian)
  const lo = new Uint32Array(buf)[0];

  const sign = (hi >>> 31) & 0x1;
  const expf = (hi >>> 20) & 0x7ff;
  const mantHi = hi & 0xfffff;

  const bits =
    sign.toString(2) + " " +
    expf.toString(2).padStart(11, "0") + " " +
    mantHi.toString(2).padStart(20, "0") +
    lo.toString(2).padStart(32, "0");

  let kind = "normal";
  if (expf === 0) kind = (mantHi === 0 && lo === 0) ? "zero" : "denormal";
  else if (expf === 0x7ff) kind = (mantHi === 0 && lo === 0) ? "infinity" : "NaN";

  const unbiased = expf === 0 || expf === 0x7ff ? "—" : expf - 1023;
  return { x, kind, sign, expRaw: expf, unbiased, bits };
}

// ---- float32 view (what Math.fround / a GPU would keep) ---------------------
function anatomy32(x) {
  const f = Math.fround(x);
  const buf = new ArrayBuffer(4);
  new Float32Array(buf)[0] = f;
  const b = new Uint32Array(buf)[0];
  const sign = (b >>> 31) & 1;
  const expf = (b >>> 23) & 0xff;
  const mant = b & 0x7fffff;
  const bits =
    sign.toString(2) + " " +
    expf.toString(2).padStart(8, "0") + " " +
    mant.toString(2).padStart(23, "0");
  return { stored: f, lostPrecision: f !== x, bits };
}

function report(x) {
  const a = anatomy64(x);
  const b = anatomy32(x);
  console.log(`value     : ${x}`);
  console.log(`kind      : ${a.kind}   sign=${a.sign}  exp(unbiased)=${a.unbiased}`);
  console.log(`float64   : ${a.bits}`);
  console.log(`float32   : ${b.bits}   -> stores ${b.stored}` +
              (b.lostPrecision ? "  (!! changed by float32)" : ""));
  console.log("");
}

// ---- CLI --------------------------------------------------------------------
if (require.main === module) {
  let args = process.argv.slice(2);
  if (args.length === 0) {
    args = ["0.1", "0.2", "1", "16777217", "9007199254740993",
            "1e16", "5e-324", "Infinity", "NaN"];
    console.log("0.1 + 0.2 =", 0.1 + 0.2, "  <- the famous one\n");
  }
  for (const s of args) report(Number(s));
  console.log("9007199254740993 = 2^53 + 1 is the float64 'x+1==x' threshold,");
  console.log("the float64 analogue of 16777217 for float32. The desert is fractal.");
}

module.exports = { anatomy64, anatomy32 };
