// =============================================================================
// common.glsl — shared prelude for floating_point_dementia
// -----------------------------------------------------------------------------
// Hashes, value noise, fbm, and constants used across every shader.
// No mainImage here — this is a library. Pull it in with:
//     #include "../common.glsl"
// The viewer's preprocessor has include guards, so including it twice is safe.
// =============================================================================
#ifndef FPD_COMMON_GLSL
#define FPD_COMMON_GLSL

// --- Constants ---------------------------------------------------------------
// IEEE-754 binary32 landmarks. We treat these as the edges of sanity.
const float FP32_MANTISSA_BITS = 23.0;          // explicit mantissa bits
const float FP32_MAX           = 3.4028234e38;  // largest finite float
const float FP32_MIN_NORMAL    = 1.1754944e-38; // smallest normal float
const float FP32_MIN_DENORMAL  = 1.4012985e-45; // smallest positive denormal
const float FP32_EPSILON       = 1.1920929e-7;  // 2^-23, gap above 1.0
const float TAU                = 6.28318530718;
const float PI                 = 3.14159265359;

// --- Hashes ------------------------------------------------------------------
// Cheap, stable integer-ish hashes. Good enough for "the bits became visible".
float hash11(float p) {
    p = fract(p * 0.1031);
    p *= p + 33.33;
    p *= p + p;
    return fract(p);
}

float hash21(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}

vec2 hash22(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.xx + p3.yz) * p3.zy);
}

vec3 hash23(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
    p3 += dot(p3, p3.yxz + 33.33);
    return fract((p3.xxy + p3.yzz) * p3.zyx);
}

// --- Value noise + fbm -------------------------------------------------------
float vnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    float a = hash21(i + vec2(0.0, 0.0));
    float b = hash21(i + vec2(1.0, 0.0));
    float c = hash21(i + vec2(0.0, 1.0));
    float d = hash21(i + vec2(1.0, 1.0));
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 p) {
    float sum = 0.0;
    float amp = 0.5;
    for (int i = 0; i < 5; i++) {
        sum += amp * vnoise(p);
        p = p * 2.0 + 17.0;
        amp *= 0.5;
    }
    return sum;
}

// --- Small helpers -----------------------------------------------------------
// Aspect-correct, origin-centered coordinates in [-1,1]-ish range.
vec2 centeredUV(vec2 fragCoord, vec2 resolution) {
    return (2.0 * fragCoord - resolution) / resolution.y;
}

// log base 10, because floating-point lives in decades.
float log10(float x) {
    return log(x) / 2.302585092994046;
}

#endif // FPD_COMMON_GLSL
