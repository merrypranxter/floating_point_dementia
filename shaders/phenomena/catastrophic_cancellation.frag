// =============================================================================
// phenomena/catastrophic_cancellation.frag — subtractive annihilation
// -----------------------------------------------------------------------------
// (EXTRA) The quietest catastrophe. Take two large numbers that are *almost*
// equal and subtract them. Their leading bits agree and cancel, and what's left
// is built entirely from the noisy bits at the bottom — bits that were rounding
// error to begin with. The "answer" is mostly garbage.
//
// We visualize the function f(x) = (1 - cos(x)) / x^2, whose true value is ~0.5
// near x=0 but which, evaluated naively, dies from cancellation as x shrinks.
// The screen left->right is increasing magnitude offset; the band shows how much
// of the result is real vs noise (cancellationError).
// =============================================================================
#include "../common.glsl"
#include "../core/precision_sim.glsl"
#include "../core/corruption.glsl"

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;          // [0,1]
    vec2 c  = centeredUV(fragCoord, iResolution.xy);

    // The magnitude of the operands we'll subtract: huge on the right.
    float drive = iMouse.z > 0.0 ? (iMouse.x / iResolution.x) : uv.x;
    float scale = exp2(mix(0.0, 26.0, drive));     // 1 .. 6.7e7

    // Build two nearly-equal large numbers: a, and b = a + tiny.
    float tiny = 1.0 + 0.5 * sin(uv.y * TAU + iTime); // the "real" answer ~O(1)
    float a = scale;
    float b = scale + tiny;

    // Surviving precision at this magnitude.
    float bits = precisionBitsAt(scale);

    // Exact vs lossy difference.
    float exact  = b - a;                          // == tiny (in our heads)
    float approx = simSub(b, a, bits);             // what the FPU actually gets
    float err    = cancellationError(b, a, bits);  // 0..1, how dead it is

    // Plot both: exact (cyan) and approx (orange), as height curves.
    float yExact  = 0.5 + 0.25 * (exact  / 2.0);
    float yApprox = 0.5 + 0.25 * (approx / 2.0);
    float lineE = smoothstep(0.012, 0.0, abs(uv.y - yExact));
    float lineA = smoothstep(0.012, 0.0, abs(uv.y - yApprox));

    // Background tinted by the error: green = trustworthy, red = annihilated.
    vec3 bg = mix(vec3(0.04, 0.10, 0.06), vec3(0.18, 0.03, 0.05), err);
    // banding in the background mirrors the surviving bits
    bg = floor(bg * (1.0 + bits * 0.5) + 0.5) / (1.0 + bits * 0.5);

    vec3 color = bg;
    color = mix(color, vec3(0.2, 0.9, 1.0), lineE);
    color = mix(color, vec3(1.0, 0.55, 0.15), lineA);

    // When err saturates, the result is pure noise — show it as noise.
    if (err > 0.95) {
        color = mix(color, hash23(fragCoord + floor(iTime * 20.0)), 0.5);
    }

    fragColor = vec4(color, 1.0);
}
