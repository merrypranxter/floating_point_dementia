// =============================================================================
// phenomena/precision_tearing.frag — zoom-based dissolution
// -----------------------------------------------------------------------------
// A clean grid lives near the origin. As we push the coordinate system out into
// the precision desert (driven by time / mouse.x), the ULP grows until x+1==x,
// the grid quantizes into chunky steps, then dissolves into hash noise.
//
// Drag mouse left/right to control distance manually.
// =============================================================================
#include "../common.glsl"
#include "../core/precision_sim.glsl"
#include "../core/quantization.glsl"

// A reference scene: a thin grid + a couple of orbiting dots. This is what we
// watch fall apart.
vec3 cleanScene(vec2 p, float t) {
    vec2 g = abs(fract(p) - 0.5);
    float line = smoothstep(0.49, 0.5, max(g.x, g.y));
    vec3 col = mix(vec3(0.05, 0.07, 0.10), vec3(0.20, 0.45, 0.75), line);
    for (int i = 0; i < 3; i++) {
        float fi = float(i);
        vec2 c = vec2(cos(t + fi * 2.1), sin(t * 1.3 + fi)) * 1.5;
        float d = length(p - c);
        col += vec3(1.0, 0.7, 0.3) * smoothstep(0.25, 0.0, d);
    }
    return col;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = centeredUV(fragCoord, iResolution.xy);

    // distance_from_origin: sweep across decades. Mouse overrides time.
    float drive = iMouse.z > 0.0 ? (iMouse.x / iResolution.x)
                                 : 0.5 + 0.5 * sin(iTime * 0.25);
    float distance = exp2(mix(0.0, 26.0, drive)); // 1 .. ~6.7e7

    // Push our sample point out to that magnitude, keeping local structure.
    vec2 p = uv * 3.0 + distance;

    // How much precision survives out here?
    float bits = precisionBitsAt(distance);

    // Quantize the *coordinates* to the surviving grid — this is the tearing.
    // The grid spacing IS the ULP at this magnitude (linear in distance). An
    // earlier hand-rolled exp2(floor(log2(distance)) - bits) was quadratic in
    // distance, which blew the step past the scene size almost immediately and
    // left a flat dead zone. (named gridStep, not step — `step` is a builtin.)
    float gridStep = ulp(distance);
    vec2 pq = floor(p / max(gridStep, 1e-20) + 0.5) * gridStep;

    vec3 color = cleanScene(pq - distance, iTime); // re-center for the scene

    // Below ~5 bits, dissolve into quantization grit. The grit is seeded from a
    // *stable* screen coordinate, not from pq: out here pq has no fractional bits
    // left, so hashing it would collapse to a single value (a black frame). The
    // block size grows as precision dies, so the noise visibly coarsens.
    float t = clamp(1.0 - bits / 5.0, 0.0, 1.0);
    if (t > 0.0) {
        float blocks = mix(420.0, 7.0, t);
        vec3 grit = hash23(floor(uv * blocks) + floor(log2(distance)));
        color = mix(color, grit, t);
    }

    // Also band the color, because the framebuffer is losing precision too.
    color = quantizeByBits(color, clamp(bits, 1.0, 8.0));

    // HUD strip along the bottom (centeredUV puts y in [-1,1], so the strip
    // lives just above y = -1). The bar fills left->right with `drive`.
    float hud = step(uv.y, -0.90) * step(-0.96, uv.y);
    float aspect = iResolution.x / iResolution.y;
    float barEnd = mix(-aspect, aspect, drive);
    vec3 bar = mix(vec3(0.1, 0.7, 0.3), vec3(0.9, 0.1, 0.4), drive);
    color = mix(color, bar, hud * step(uv.x, barEnd) * 0.85);

    fragColor = vec4(color, 1.0);
}
