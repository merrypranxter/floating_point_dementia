// =============================================================================
// core/quantization.glsl — bit-level quantization + IEEE-754 bit reveal
// -----------------------------------------------------------------------------
// Two jobs:
//   1. Banding: collapse continuous values/colors to a coarse grid (the visible
//      "steps" you get when precision runs out).
//   2. Bit reveal: pull the actual sign/exponent/mantissa bits out of a float
//      and lay them out for visualization. Requires WebGL2 / GLSL ES 3.00 for
//      floatBitsToUint — the viewer compiles at #version 300 es.
//
//     #include "../common.glsl"
//     #include "core/quantization.glsl"
// =============================================================================
#ifndef FPD_QUANTIZATION_GLSL
#define FPD_QUANTIZATION_GLSL

#include "../common.glsl"   // (shared constants; kept for self-sufficiency)

// Snap a scalar in [0,1] to `levels` discrete steps. levels=2 -> harsh banding.
float quantize(float x, float levels) {
    levels = max(levels, 1.0);
    return floor(x * levels + 0.5) / levels;
}

// Per-channel color banding. Lowering `levels` is precision death for color.
vec3 quantizeColor(vec3 c, float levels) {
    return vec3(quantize(c.r, levels), quantize(c.g, levels), quantize(c.b, levels));
}

// Map a "surviving mantissa bits" count to a number of representable levels.
// 23 bits -> millions of levels (smooth); 1 bit -> 2 levels (brutal bands).
float levelsFromBits(float bits) {
    return exp2(max(bits, 0.0));
}

// Convenience: band a color by how many bits of precision are left.
vec3 quantizeByBits(vec3 c, float bits) {
    return quantizeColor(c, levelsFromBits(bits));
}

// --- Raw IEEE-754 bit access (needs GLSL ES 3.00) ----------------------------

// Extract bit `b` (0 = LSB, 31 = sign) of x's binary32 representation as 0.0/1.0.
float floatBit(float x, int b) {
    uint bits = floatBitsToUint(x);
    return float((bits >> uint(b)) & 1u);
}

// Decompose into the three fields. .x = sign (0/1),
// .y = raw exponent (0..255, biased), .z = mantissa (0..8388607).
vec3 floatFields(float x) {
    uint bits = floatBitsToUint(x);
    float s = float((bits >> 31) & 1u);
    float e = float((bits >> 23) & 0xFFu);
    float m = float(bits & 0x7FFFFFu);
    return vec3(s, e, m);
}

// Unbiased exponent (the true power-of-two), or -127 for zero/denormals.
float floatExponent(float x) {
    return floatFields(x).y - 127.0;
}

// Render the 32 bits of x as a horizontal strip across u in [0,1].
// Sign bit tinted red, exponent green, mantissa blue — the classic layout.
// `lit` is how "on" a 1-bit glows; 0-bits stay dim.
vec3 bitStrip(float x, float u, float lit) {
    int idx = int(floor(clamp(u, 0.0, 0.99999) * 32.0)); // 0..31 left->right
    int bitNo = 31 - idx;                                 // MSB on the left
    float on = floatBit(x, bitNo);

    vec3 field;
    if (bitNo == 31)      field = vec3(1.0, 0.25, 0.35); // sign
    else if (bitNo >= 23) field = vec3(0.35, 1.0, 0.45); // exponent
    else                  field = vec3(0.40, 0.55, 1.0); // mantissa

    float glow = mix(0.12, lit, on);
    return field * glow;
}

#endif // FPD_QUANTIZATION_GLSL
