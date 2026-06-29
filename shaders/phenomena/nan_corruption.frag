// =============================================================================
// phenomena/nan_corruption.frag — purple infection
// -----------------------------------------------------------------------------
// A clean scene. Somewhere in it, a 0.0/0.0 happens and a NaN is born. From
// that seed the corruption crawls outward, dendritic and pulsing purple, until
// it has eaten the frame. Click to plant a new infection seed under the mouse.
// =============================================================================
#include "../common.glsl"
#include "../core/corruption.glsl"

vec3 cleanScene(vec2 uv, float t) {
    float a = atan(uv.y, uv.x);
    float r = length(uv);
    float rings = 0.5 + 0.5 * sin(r * 8.0 - t * 2.0 + sin(a * 5.0));
    vec3 col = mix(vec3(0.04, 0.08, 0.12), vec3(0.15, 0.55, 0.65), rings);
    col += vec3(0.9, 0.8, 0.4) * smoothstep(0.1, 0.0, r) * (0.6 + 0.4 * sin(t * 3.0));
    return col;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = centeredUV(fragCoord, iResolution.xy);

    vec3 color = cleanScene(uv, iTime);

    // Where the NaN was born. Mouse click moves it; otherwise it wanders.
    vec2 source = iMouse.z > 0.0
        ? centeredUV(iMouse.xy, iResolution.xy)
        : vec2(cos(iTime * 0.4), sin(iTime * 0.3)) * 0.8;

    // Birth event: actually produce a NaN at the source to prove the point.
    float spark = 0.0;
    if (length(uv - source) < 0.03) {
        spark = iZero / iZero;       // <- the original sin (0/0 = NaN)
    }

    // The spreading field. Loops back so the infection breathes in and out.
    float cycle = mod(iTime, 8.0);
    float infection = corruptionField(uv, source, cycle, 0.35);

    // Apply: corrupted where infected, and definitely where the NaN itself is.
    color = applyCorruption(color, spark, infection, iTime);

    // sizzling boundary: brightest right at the advancing front
    float front = abs(infection - 0.5);
    color += vec3(0.6, 0.1, 0.8) * smoothstep(0.5, 0.0, front) * 0.4;

    fragColor = vec4(color, 1.0);
}
