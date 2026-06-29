// =============================================================================
// core/corruption.glsl — NaN / Inf / denormal spread
// -----------------------------------------------------------------------------
// What color is "math gave up"? This file defines the palette of failure and
// the spreading-infection field that lets a single NaN eat the frame.
//
//   NaN      -> purple, pulsing (it's alive, and it's hungry)
//   +/-Inf   -> warm white blowout
//   denormal -> gray fog of uncertainty
//
//     #include "../common.glsl"
//     #include "core/corruption.glsl"
// =============================================================================
#ifndef FPD_CORRUPTION_GLSL
#define FPD_CORRUPTION_GLSL

#include "../common.glsl"   // FP32_* constants, fbm

// Robust predicates. GLSL's isnan/isinf are unreliable on some drivers (and
// optimizers love to assume they never happen), so we test by hand too.
bool isNaNc(float x)  { return !(x == x); }
bool isInfc(float x)  { return abs(x) > FP32_MAX; }
bool isDeadc(float x) { return isNaNc(x) || isInfc(x); }

// The corruption palette ------------------------------------------------------
vec3 nanColor(float t) {
    // purple, breathing. The sine keeps it from looking like a static error.
    return vec3(0.8, 0.0, 1.0) * (0.55 + 0.45 * sin(t * 3.0));
}

vec3 infColor() {
    return vec3(1.0, 0.92, 0.82); // warm white, overexposed
}

vec3 denormalColor() {
    return vec3(0.5); // the gray of "could be anything"
}

// A spreading infection mask in [0,1]. Seeds a corruption at `source` and lets
// it crawl outward over time with a noisy, dendritic boundary. Use it to blend
// nanColor over a clean render.
//   uv      : pixel coordinate (any space)
//   source  : where the NaN was born
//   time    : grows the radius
//   rate    : spread speed
float corruptionField(vec2 uv, vec2 source, float time, float rate) {
    float d = length(uv - source);
    float radius = time * rate;
    // dendritic edge: perturb the boundary with fbm so it looks like rot/frost
    float edge = fbm(uv * 6.0 + time * 0.3) * 0.35;
    float front = radius - d + edge;
    return smoothstep(0.0, 0.15, front);
}

// The master compositor from the README, made reusable. Takes a clean color and
// a probe `value`; if the value has gone bad, paint the matching failure mode.
// `infection` (0..1) lets a caller bias toward full corruption (e.g. driven by
// corruptionField). Returns the possibly-corrupted color.
vec3 applyCorruption(vec3 color, float value, float infection, float time) {
    if (isNaNc(value) || isNaNc(color.r) || infection > 0.999) {
        return mix(color, nanColor(time), max(infection, 0.85));
    }
    if (isInfc(value)) {
        return mix(color, infColor(), 0.85);
    }
    // denormal smear: below the smallest normal, fade toward gray uncertainty
    if (value != 0.0 && abs(value) < FP32_MIN_NORMAL) {
        float t = clamp(1.0 - abs(value) / FP32_MIN_NORMAL, 0.0, 1.0);
        color = mix(color, denormalColor(), 0.5 * t);
    }
    // partial infection creeping in from a corruptionField
    if (infection > 0.0) {
        color = mix(color, nanColor(time), infection);
    }
    return color;
}

#endif // FPD_CORRUPTION_GLSL
