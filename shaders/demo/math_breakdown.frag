// =============================================================================
// demo/math_breakdown.frag — operations fail visibly
// -----------------------------------------------------------------------------
// A panel of arithmetic, watched as it breaks. The screen is split into cells,
// each running one operation (add / sub / mul / div / sqrt / log) at a magnitude
// that rises over time. Each cell glows green while the result still matches the
// exact answer and bleeds red as the lossy result diverges from it.
//
// This is the "operation_type" parameter from the README, all on screen at once.
// =============================================================================
#include "../common.glsl"
#include "../core/precision_sim.glsl"
#include "../core/corruption.glsl"

// exact-vs-lossy disagreement for one operation, returned as [0,1] error.
float opError(int op, float a, float b, float bits) {
    float exact, approx;
    if (op == 0) {                      // add
        exact = a + b;  approx = simAdd(a, b, bits);
    } else if (op == 1) {               // sub
        exact = a - b;  approx = simSub(a, b, bits);
    } else if (op == 2) {               // mul
        exact = a * b;  approx = quantizeFloat(a * b, bits);
    } else if (op == 3) {               // div
        exact = a / b;  approx = quantizeFloat(quantizeFloat(a, bits) / quantizeFloat(b, bits), bits);
    } else if (op == 4) {               // sqrt
        exact = sqrt(a); approx = quantizeFloat(sqrt(quantizeFloat(a, bits)), bits);
    } else {                            // log
        exact = log(a); approx = quantizeFloat(log(quantizeFloat(a, bits)), bits);
    }
    if (isNaNc(exact) || isInfc(exact)) return 1.0;
    float denom = max(abs(exact), ulp(max(abs(a), abs(b))));
    return clamp(abs(approx - exact) / denom, 0.0, 1.0);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;

    // 3x2 grid of operations.
    vec2 grid = vec2(3.0, 2.0);
    vec2 cell = floor(uv * grid);
    vec2 f = fract(uv * grid);
    int op = int(cell.x + cell.y * 3.0);   // 0..5

    // magnitude rises with time (and mouse), shared across cells.
    float drive = iMouse.z > 0.0 ? (iMouse.x / iResolution.x)
                                 : 0.5 + 0.5 * sin(iTime * 0.2);
    float scale = exp2(mix(0.0, 26.0, drive));
    float bits  = precisionBitsAt(scale);

    // operands: nearly-equal large values stress add/sub; div/log get edge cases.
    float a = scale + 1.0 + 0.5 * sin(iTime + cell.x);
    float b = scale + 0.5 * cos(iTime + cell.y);

    float err = opError(op, a, b, bits);

    // cell background by health
    vec3 color = mix(vec3(0.04, 0.12, 0.06), vec3(0.20, 0.03, 0.04), err);

    // a sweeping "result" needle whose jitter grows with error
    float needle = 0.5 + 0.4 * sin(iTime * 2.0 + float(op));
    needle += (hash21(fragCoord + floor(iTime * 20.0)) - 0.5) * err * 0.8;
    color += vec3(0.6, 0.9, 0.5) * smoothstep(0.03, 0.0, abs(f.y - needle)) * (1.0 - err);
    color += vec3(1.0, 0.4, 0.3) * smoothstep(0.03, 0.0, abs(f.y - needle)) * err;

    // cell borders
    float border = step(0.97, max(f.x, f.y)) + step(f.x, 0.015) + step(f.y, 0.015);
    color = mix(color, vec3(0.0), clamp(border, 0.0, 1.0) * 0.8);

    // little operator pip in the corner (count of dashes encodes op index)
    float pip = step(f.x, 0.04 + 0.03 * float(op)) * step(0.93, f.y);
    color += vec3(0.8) * pip;

    fragColor = vec4(color, 1.0);
}
