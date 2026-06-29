// =============================================================================
// demo/bit_reveal.frag — raw IEEE-754 visualization
// -----------------------------------------------------------------------------
// The veil comes off. Pick a number (sweeping by time, or mouse.x), and watch
// its 32 bits laid bare: 1 sign bit (red), 8 exponent bits (green), 23 mantissa
// bits (blue). The number climbs through magnitudes so you can watch the
// exponent field count up and the mantissa churn.
//
// Requires WebGL2 / GLSL ES 3.00 for floatBitsToUint — the viewer provides it.
// =============================================================================
#include "../common.glsl"
#include "../core/quantization.glsl"
#include "../core/precision_sim.glsl"
#include "../core/corruption.glsl"   // isInfc / isNaNc for the special-value banners

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;

    // The number under the microscope.
    float drive = iMouse.z > 0.0 ? (iMouse.x / iResolution.x)
                                 : fract(iTime * 0.05);
    float value = pow(2.0, mix(-40.0, 40.0, drive)) * (0.6 + 0.4 * sin(iTime));

    vec3 color = vec3(0.02, 0.025, 0.035);

    // --- the bit strip (a wide band across the middle) ---
    if (uv.y > 0.42 && uv.y < 0.58) {
        float lit = 0.95;
        color = bitStrip(value, uv.x, lit);
        // separators between sign|exponent|mantissa fields
        float sep = smoothstep(0.004, 0.0, abs(uv.x - 1.0 / 32.0))
                  + smoothstep(0.004, 0.0, abs(uv.x - 9.0 / 32.0));
        color = mix(color, vec3(1.0), sep * 0.7);
        // per-bit cell ticks
        float ticks = smoothstep(0.003, 0.0, abs(fract(uv.x * 32.0) - 0.0));
        color = mix(color, vec3(0.0), ticks * 0.4);
    }

    // --- field legend bars above the strip ---
    if (uv.y >= 0.58 && uv.y < 0.62) {
        if (uv.x < 1.0 / 32.0)        color = vec3(1.0, 0.25, 0.35); // sign
        else if (uv.x < 9.0 / 32.0)   color = vec3(0.35, 1.0, 0.45); // exponent
        else                          color = vec3(0.40, 0.55, 1.0); // mantissa
        color *= 0.6;
    }

    // --- decoded readout below: sign / unbiased exponent / mantissa fraction ---
    vec3 fields = floatFields(value);          // sign, biasedExp, mantissa
    float unbiased = fields.y - 127.0;
    if (uv.y > 0.30 && uv.y < 0.40) {
        // three meters: sign(±), exponent (mapped -127..128), mantissa (0..1)
        float seg = floor(uv.x * 3.0);
        float fx  = fract(uv.x * 3.0);
        float meter =
            seg < 1.0 ? fields.x :                                  // sign 0/1
            seg < 2.0 ? clamp((unbiased + 127.0) / 255.0, 0.0, 1.0) // exponent
                      : fields.z / 8388607.0;                       // mantissa frac
        vec3 mc = seg < 1.0 ? vec3(1.0, 0.3, 0.4)
                : seg < 2.0 ? vec3(0.4, 1.0, 0.5)
                            : vec3(0.45, 0.6, 1.0);
        color = mix(vec3(0.06), mc, step(fx, meter));
        color = mix(color, vec3(0.0), step(0.985, fract(uv.x * 3.0)));
    }

    // special-value banners
    if (isInfc(value) && uv.y > 0.7) color = vec3(1.0, 0.92, 0.82);
    if (isNaNc(value) && uv.y > 0.7) color = vec3(0.8, 0.0, 1.0);

    fragColor = vec4(color, 1.0);
}
