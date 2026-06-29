// =============================================================================
// demo/journey_to_inf.frag — camera zooms to infinity
// -----------------------------------------------------------------------------
// A guided tour through all five zones. The camera rides outward from 1.0,
// through the precision desert, past the last finite float, into +Inf, and the
// frame blows out to warm white. Then it loops. The HUD at the bottom names the
// current zone and shows the magnitude in scientific notation (as a bar).
// =============================================================================
#include "../common.glsl"
#include "../core/precision_sim.glsl"
#include "../core/quantization.glsl"
#include "../core/corruption.glsl"

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = centeredUV(fragCoord, iResolution.xy);

    // A 40-second journey: 0 -> past infinity, then repeat.
    float journey = mod(iTime, 40.0) / 40.0;
    if (iMouse.z > 0.0) journey = iMouse.x / iResolution.x;

    // exponent ramps 0 -> 40. Past ~38 we exceed FP32_MAX => treat as Inf.
    float e = journey * 42.0;
    float magnitude = (e > 38.5) ? (1.0 / iZero) : pow(10.0, e); // 1/0 = +Inf

    // Starfield scene, sampled at the current magnitude.
    vec2 p = uv * 2.0 + magnitude;
    float bits = precisionBitsAt(max(magnitude, 1.0));
    float gridStep = max(ulp(max(magnitude, 1.0)), 1e-20); // `step` is a builtin
    vec2 pq = floor(p / gridStep + 0.5) * gridStep;

    float stars = pow(hash21(floor(pq * 80.0)), 32.0) * 3.0;
    vec3 color = vec3(0.02, 0.03, 0.06) + stars * vec3(0.8, 0.9, 1.0);
    color += vec3(0.1, 0.15, 0.3) * fbm(pq * 0.5);
    // a stable nebula glow (uses screen uv, not the precision-dead coord) so the
    // frame always reads as "space" even when the desert has eaten the detail.
    color += vec3(0.14, 0.10, 0.24) * smoothstep(1.5, 0.0, length(uv)) * 0.55;

    // Zone handling, in order of escalation.
    if (bits < 6.0 && magnitude < FP32_MAX) {
        // precision desert: dissolve to quantized grit. Clamp the mix factor
        // (bits goes very negative far out, which would extrapolate past 1.0),
        // and seed the grit from a stable coord so it never collapses to black.
        float t = clamp(1.0 - bits / 6.0, 0.0, 1.0);
        float blocks = mix(360.0, 6.0, t);
        vec3 grit = hash23(floor(uv * blocks) + floor(log2(magnitude)));
        color = mix(quantizeByBits(color, max(bits, 1.0)), grit, t);
    }
    color = applyCorruption(color, magnitude, 0.0, iTime); // handles Inf/denormal

    // The infinity blowout, with a warm bloom rising as we approach it.
    float approach = smoothstep(36.0, 38.5, e);
    color = mix(color, infColor(), approach);

    // --- HUD ---------------------------------------------------------------
    // bottom strip (y in [-1,1], so it sits just above y = -1): a colour that
    // names the current zone + a bar that fills as we ride toward infinity.
    float strip = step(uv.y, -0.90) * step(-0.96, uv.y);
    vec3 zoneCol =
        e < 7.0   ? vec3(0.2, 0.8, 0.3) :   // healthy: green
        e < 30.0  ? vec3(0.9, 0.8, 0.2) :   // desert: yellow
        e < 38.5  ? vec3(0.9, 0.4, 0.1) :   // near limit: orange
                    infColor();             // infinity: white
    float aspect = iResolution.x / iResolution.y;
    float barEnd = mix(-aspect, aspect, clamp(e / 42.0, 0.0, 1.0));
    color = mix(color, zoneCol, strip * step(uv.x, barEnd) * 0.85);

    fragColor = vec4(color, 1.0);
}
