// =============================================================================
// phenomena/mandelbrot_dementia.frag — deep-zoom precision death
// -----------------------------------------------------------------------------
// (EXTRA) The canonical real-world floating-point failure: zoom far enough into
// the Mandelbrot set and binary32 runs out of mantissa. The smooth boundary
// shatters into blocky "ULP pixels" — every screen pixel inside a single
// representable coordinate cell maps to the same orbit. Beauty becoming a grid.
//
// We force the death by snapping the complex coordinate to the surviving
// precision grid for the current zoom, so it happens on every GPU, predictably.
// =============================================================================
#include "../common.glsl"
#include "../core/precision_sim.glsl"
#include "../core/quantization.glsl"

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = centeredUV(fragCoord, iResolution.xy);

    // Zoom toward a pretty point on the boundary.
    const vec2 center = vec2(-0.743643887037151, 0.131825904205330);
    float drive = iMouse.z > 0.0 ? (iMouse.x / iResolution.x)
                                 : 0.5 + 0.5 * sin(iTime * 0.12);
    float zoom = exp2(mix(2.0, 28.0, drive));      // magnification

    // Coordinate of this pixel in the complex plane.
    vec2 cpx = center + uv / zoom;

    // The dementia: snap c to the precision grid available at |center| ~ 0.75.
    // As zoom grows, uv/zoom drops below the ULP at this magnitude and pixels
    // start sharing a coordinate -> blocky quantization of the fractal.
    float bits = FP32_MANTISSA_BITS;
    float step = ulp(0.75);                         // gap between floats near 0.75
    vec2 cq = floor(cpx / step + 0.5) * step;

    // Iterate.
    vec2 z = vec2(0.0);
    float i;
    const float MAX = 160.0;
    for (float k = 0.0; k < MAX; k++) {
        z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + cq;
        if (dot(z, z) > 256.0) { i = k; break; }
        i = k;
    }

    // Smooth-ish coloring.
    float m = i / MAX;
    vec3 color = 0.5 + 0.5 * cos(TAU * (m * 3.0 + vec3(0.0, 0.33, 0.67)) + iTime * 0.2);
    if (dot(z, z) <= 256.0) color = vec3(0.02); // interior

    // Highlight the quantization: tint cells whose width exceeds a pixel.
    float pixelSize = (2.0 / iResolution.y) / zoom;
    float deathRatio = clamp(step / max(pixelSize, 1e-30), 0.0, 1.0);
    color = mix(color, quantizeColor(color, 4.0), deathRatio);
    // Grid lines at the ULP boundaries once they're visible. Compute the cell
    // position from the *relative* coord (uv/zoom), which stays small and well-
    // conditioned — using cpx/step directly would itself be precision-dead at
    // these magnitudes and just smear to a flat wash.
    vec2 rel  = uv / zoom;
    vec2 cell = abs(fract(rel / step) - 0.5);
    float grid = smoothstep(0.46, 0.5, max(cell.x, cell.y));
    color = mix(color, vec3(0.9, 0.2, 0.5), grid * deathRatio * 0.45);

    fragColor = vec4(color, 1.0);
}
