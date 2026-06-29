// =============================================================================
// phenomena/denormal_fog.frag — underflow uncertainty
// -----------------------------------------------------------------------------
// A descent below FP32_MIN_NORMAL (~1.18e-38). In the denormal range, the
// exponent is pinned and only the mantissa shrinks, so relative precision
// collapses exponentially toward zero. We render that as a thickening gray fog:
// the closer to the abyss, the less the structure can be trusted.
// =============================================================================
#include "../common.glsl"
#include "../core/precision_sim.glsl"
#include "../core/corruption.glsl"

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = centeredUV(fragCoord, iResolution.xy);

    // Map screen Y to a magnitude descending from normal numbers into denormals
    // and finally to the smallest denormal (true zero is below the bottom edge).
    float drive = iMouse.z > 0.0 ? (iMouse.y / iResolution.y)
                                 : 0.5 + 0.5 * sin(iTime * 0.15);
    // top of screen = healthy ~1e-30, bottom = FP32_MIN_DENORMAL
    float logMag = mix(-30.0, -45.0, clamp(0.5 - uv.y * 0.5 + (drive - 0.5), 0.0, 1.0));
    float magnitude = pow(10.0, logMag);

    // Structure we're trying to see through the fog: soft flowing bands.
    float field = fbm(uv * 2.5 + vec2(0.0, iTime * 0.2));
    vec3 base = mix(vec3(0.05, 0.10, 0.18), vec3(0.45, 0.70, 0.95), field);

    // madnessLevel ramps 0->1 across the denormal range.
    float madness = madnessLevel(magnitude);

    // The fog: as precision dies, the mantissa is too coarse to represent the
    // field, so quantize it hard and bleed toward gray.
    float levels = max(1.0, exp2(mix(20.0, 0.0, madness)));
    base = floor(base * levels + 0.5) / levels;
    vec3 color = applyCorruption(base, magnitude, madness * 0.6, iTime);

    // dust of lost bits drifting in the fog
    float dust = hash21(floor(fragCoord * 0.5) + floor(iTime * 8.0));
    color += madness * (dust - 0.5) * 0.15;

    // a faint scale label line where we cross into denormals
    float crossing = smoothstep(0.004, 0.0, abs(magnitude - FP32_MIN_NORMAL) / FP32_MIN_NORMAL);
    color = mix(color, vec3(1.0, 0.3, 0.4), crossing * 0.5);

    fragColor = vec4(color, 1.0);
}
