// =============================================================================
// phenomena/z_fight_cosmic.frag — extreme-distance flicker
// -----------------------------------------------------------------------------
// Two parallel planes at slightly different depths. Near the camera the depth
// buffer resolves them cleanly. Push them out to cosmic distance and their
// quantized depths collide — the comparison becomes a coin flip and they swap,
// shimmer, and fight. The classic z-fighting failure, dramatized.
// =============================================================================
#include "../common.glsl"
#include "../core/precision_sim.glsl"

// Quantize a depth value the way a fixed-width depth buffer would, given how
// many bits survive at this magnitude.
float quantizeDepth(float z, float bits) {
    float e = floor(log2(max(z, 1e-20)));
    float step = exp2(e - bits);
    return floor(z / step + 0.5) * step;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = centeredUV(fragCoord, iResolution.xy);

    // camera distance sweeps across decades
    float drive = iMouse.z > 0.0 ? (iMouse.x / iResolution.x)
                                 : 0.5 + 0.5 * sin(iTime * 0.2);
    float camDist = exp2(mix(0.0, 24.0, drive));

    float bits = precisionBitsAt(camDist);

    // Two planes, true depths very close together but distinct.
    float zA = camDist + 0.5 + 0.3 * sin(uv.x * 4.0 + iTime);
    float zB = camDist + 0.5 + 0.3 * sin(uv.x * 4.0 + iTime) + 1.0; // 1 unit behind

    float qA = quantizeDepth(zA, bits);
    float qB = quantizeDepth(zB, bits);

    // Decide who's in front. When the quantized depths tie, dither randomly —
    // that's the fight.
    float winner;
    if (qA < qB)      winner = 0.0;        // A wins (front)
    else if (qB < qA) winner = 1.0;        // B wins
    else              winner = step(0.5, hash21(floor(fragCoord) + floor(iTime * 30.0)));

    vec3 colA = vec3(0.20, 0.55, 0.85);  // cool blue plane
    vec3 colB = vec3(0.85, 0.35, 0.20);  // warm orange plane
    vec3 color = mix(colA, colB, winner);

    // tie zone gets extra shimmer to read as "unstable"
    float tie = 1.0 - step(0.5, abs(qA - qB) / max(ulp(camDist), 1e-20));
    color += tie * (hash21(fragCoord + iTime) - 0.5) * 0.6;

    // vignette of distance: the further out, the more washed/uncertain
    color = mix(color, vec3(0.5), drive * 0.25);

    fragColor = vec4(color, 1.0);
}
