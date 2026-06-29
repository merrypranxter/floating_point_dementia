// =============================================================================
// core/precision_sim.glsl — IEEE-754 behavior model
// -----------------------------------------------------------------------------
// The heart of the simulation. These functions model what happens to a number
// as it drifts away from 1.0: the gaps between representable values grow, adds
// stop adding, subtractions annihilate. We do this *deliberately* at a chosen
// precision so the breakdown is controllable and beautiful instead of merely
// dependent on whatever the GPU happens to do.
//
//     #include "../common.glsl"   <- required (constants, log10)
//     #include "core/precision_sim.glsl"
// =============================================================================
#ifndef FPD_PRECISION_SIM_GLSL
#define FPD_PRECISION_SIM_GLSL

#include "../common.glsl"   // FP32_* constants, hash11, log10

// How many mantissa bits of precision survive at a given magnitude/distance.
// At distance 1.0 you have the full 23; every doubling of magnitude costs a bit.
// Once this hits zero, x + 1.0 == x and the world stops resolving detail.
float precisionBitsAt(float distance) {
    return FP32_MANTISSA_BITS - max(0.0, log2(max(distance, 1.0)));
}

// Unit in the Last Place: the gap to the next representable float near |x|.
// This is the real ULP for binary32 when run at full precision.
float ulp(float x) {
    x = abs(x);
    if (x == 0.0) return FP32_MIN_DENORMAL;
    // Clamp the exponent at the denormal floor: below FP32_MIN_NORMAL the spacing
    // stops shrinking and stays fixed at exp2(-149) = FP32_MIN_DENORMAL. Without
    // this, exp2(e - 23) underflows to 0.0 for denormal inputs.
    float e = max(-126.0, floor(log2(x)));
    return exp2(e - FP32_MANTISSA_BITS);
}

// Quantize x as if it were stored with only `mantissaBits` of mantissa.
// This is the workhorse: snap x to the grid of representable values at its own
// magnitude. Lowering mantissaBits widens the grid — precision visibly tears.
float quantizeFloat(float x, float mantissaBits) {
    if (x == 0.0) return 0.0;
    float s = sign(x);
    x = abs(x);
    // Same denormal-floor clamp as ulp(): below FP32_MIN_NORMAL an unclamped step
    // underflows to 0.0, making x/step Infinity and the result NaN.
    float e = max(-126.0, floor(log2(x)));
    // Clamp the step's exponent into the representable single-precision range.
    // mantissaBits goes deeply negative at extreme magnitudes (precisionBitsAt),
    // so e - mantissaBits can overflow exp2 to Infinity -> x/step = 0 ->
    // 0 * Infinity = NaN. [-149, 127] caps both the under- and overflow.
    float step = exp2(clamp(e - mantissaBits, -149.0, 127.0));
    // round-to-nearest, the IEEE default rounding mode
    return s * floor(x / step + 0.5) * step;
}

// Lossy addition. Compute a+b, then snap to the precision grid of the *result's*
// magnitude. When |a| >> |b|, b falls into the gap and simply vanishes:
//     simAdd(1e7, 1.0, 23.0) == 1e7
float simAdd(float a, float b, float mantissaBits) {
    return quantizeFloat(a + b, mantissaBits);
}

// Lossy subtraction. The interesting failure is *catastrophic cancellation*:
// when a and b are large and nearly equal, the leading digits agree and cancel,
// leaving only the noisy low-order bits. We model this by quantizing the inputs
// (losing their low bits) *before* subtracting, so the difference is built from
// garbage. cancellationError() reports how bad it got, in [0,1].
float simSub(float a, float b, float mantissaBits) {
    float qa = quantizeFloat(a, mantissaBits);
    float qb = quantizeFloat(b, mantissaBits);
    return qa - qb;
}

// Relative error of a-b due to cancellation, in [0,1]. 1.0 means total wipeout
// (every significant bit of the result is noise).
float cancellationError(float a, float b, float mantissaBits) {
    float exact = a - b;
    if (exact == 0.0) return 1.0;
    float approx = simSub(a, b, mantissaBits);
    float rel = abs(approx - exact) / max(abs(exact), ulp(max(abs(a), abs(b))));
    return clamp(rel, 0.0, 1.0);
}

// Demonstrate non-associativity: (a+b)+c vs a+(b+c). Far from 1.0 these diverge.
// Returns the absolute disagreement between the two evaluation orders.
float associativityDrift(float a, float b, float c, float mantissaBits) {
    float left  = simAdd(simAdd(a, b, mantissaBits), c, mantissaBits);
    float right = simAdd(a, simAdd(b, c, mantissaBits), mantissaBits);
    return abs(left - right);
}

// The far-field function from the README, fleshed out: near the origin you get
// the fine detail (mantissa); far away, x+1==x and only quantized noise remains.
float farField(float x, float mantissaBits) {
    float coarse = quantizeFloat(x, mantissaBits);
    float fine   = fract(x);
    float t = smoothstep(1e4, 1e7, abs(x));
    return mix(fine, hash11(coarse), t);
}

// Map a value into the three "zones of madness": normal, denormal, dead.
//   0.0      = healthy, full precision
//   (0,1)    = degrading; the fraction is how much precision is gone
//   1.0      = denormal underflow or overflow — no usable precision left
float madnessLevel(float magnitude) {
    if (magnitude == 0.0) return 0.0;
    float m = abs(magnitude);
    if (m < FP32_MIN_NORMAL) {
        // denormal: precision falls off a cliff below the smallest normal
        return clamp(1.0 - log10(m / FP32_MIN_DENORMAL) /
                           log10(FP32_MIN_NORMAL / FP32_MIN_DENORMAL), 0.0, 1.0);
    }
    if (m > 1.0) {
        return clamp(log2(m) / FP32_MANTISSA_BITS, 0.0, 1.0);
    }
    return 0.0;
}

#endif // FPD_PRECISION_SIM_GLSL
