# floating_point_dementia

> IEEE-754 precision tearing toward far UVs. When numbers lose their minds.

## What This Is

Floating-point arithmetic is an approximation. As numbers get very large or very small, precision degrades. Far from 1.0, the gaps between representable numbers grow. Operations that should be simple become lossy, then meaningless, then **visually spectacular**.

This repo explores the visual aesthetics of floating-point breakdown:
- **Precision loss** — as numbers drift from 1.0, details dissolve
- **Denormalized numbers** — the "gradual underflow" zone where precision collapses
- **Infinity and NaN** — what happens when math gives up
- **Catastrophic cancellation** — subtracting nearly-equal large numbers
- **Order-of-operations sensitivity** — `(a+b)+c ≠ a+(b+c)` made visible

## Visual Phenomena

### 1. Precision Tearing
As the camera zooms out, precision drops. Objects jitter, then fragment, then dissolve into quantization noise.

```glsl
// Precision tearing simulation
float far_field(float x) {
    // At large x, x + 1.0 == x (no change!)
    float coarse = x + 1.0;
    float fine = fract(x);  // Only the mantissa bits
    return mix(fine, noise(coarse), smoothstep(1e4, 1e7, x));
}
```

### 2. UV Distortion at Extremes
Texture coordinates that wrap correctly near origin become garbage at ±1e20.

### 3. Z-Fighting on Cosmic Scales
Parallel planes that are distinct near the camera become indistinguishable, then swap randomly.

### 4. Denormal Underflow
Numbers below ~1e-38 (float32) lose precision exponentially. Visualized as a "fog" of uncertainty.

### 5. NaN Propagation
Once a NaN enters your computation, it infects everything. Visualized as a spreading purple corruption.

## The Far UV Aesthetic

"Far UVs" refers to UV coordinates far from the [0,1] range where textures are defined. The visual result is:
- **Quantization bands** — visible steps where precision runs out
- **Periodicity breakdown** — `sin(x)` at x=1e10 looks like noise
- **Aliasing** — Nyquist failure at extreme frequencies
- **Fractal structure** — the bits themselves become visible

## Parameters

- `distance_from_origin` — how far into the precision desert
- `zoom_rate` — speed of precision collapse
- `operation_type` — add / subtract / multiply / divide / sqrt / log
- `show_bits` — visualize the raw IEEE-754 bit pattern
- `corruption_mode` — NaN purple / Inf white / denormal gray

## Shader Architecture

```glsl
// Floating-point dementia core
vec3 render_demented(vec2 uv, float distance) {
    // Normal precision zone
    vec3 color = normal_render(uv);
    
    // Precision loss zone: show quantization
    float precision_bits = 23.0 - log2(distance); // float32 mantissa
    if (precision_bits < 5.0) {
        vec3 quantized = quantize(color, precision_bits);
        vec3 noise = hash23(uv * distance);
        color = mix(quantized, noise, 1.0 - precision_bits/5.0);
    }
    
    // Denormal zone: fade to gray uncertainty
    if (distance > 1e38) {
        color = mix(color, vec3(0.5), 0.5);
    }
    
    // Infinity: blow out to white
    if (isinf(distance)) {
        color = vec3(1.0, 0.9, 0.8); // warm white
    }
    
    // NaN: purple corruption
    if (isnan(distance) || isnan(color.r)) {
        color = vec3(0.8, 0.0, 1.0) * (0.5 + 0.5 * sin(iTime));
    }
    
    return color;
}
```

## Repository Layout

```
floating_point_dementia/
├── index.html                     # WebGL2 viewer — run any shader in the browser
├── shaders/
│   ├── common.glsl                # hashes, noise, constants (shared prelude)
│   ├── core/
│   │   ├── precision_sim.glsl     # IEEE-754 behavior model (ULP, lossy ops)
│   │   ├── quantization.glsl      # bit-level quantization + bit reveal
│   │   └── corruption.glsl        # NaN/Inf/denormal spread
│   ├── phenomena/
│   │   ├── precision_tearing.frag # zoom-based dissolution
│   │   ├── z_fight_cosmic.frag    # extreme-distance flicker
│   │   ├── denormal_fog.frag      # underflow uncertainty
│   │   ├── nan_corruption.frag    # purple infection
│   │   ├── catastrophic_cancellation.frag  # subtractive annihilation
│   │   └── mandelbrot_dementia.frag        # deep-zoom precision death
│   └── demo/
│       ├── journey_to_inf.frag    # camera zooms to infinity
│       ├── math_breakdown.frag    # operations fail visibly
│       └── bit_reveal.frag        # raw IEEE-754 visualization
├── examples/
│   ├── catastrophic_cancellation.py  # numeric companion: watch the bits die
│   ├── float_anatomy.py              # decompose a float into sign/exp/mantissa
│   ├── float_bits.js                 # the same, in the browser's float64
│   └── ulp_walk.py                   # walk the representable number line
└── docs/
    ├── ieee754_details.md
    ├── precision_loss.md
    └── gallery.md                 # what each shader looks like + tuning notes
```

The `.glsl` files in `core/` and `common.glsl` are **libraries** — collections of
functions with no `mainImage`. The `.frag` files are full Shadertoy-style shaders
that pull the libraries in with `#include`. The viewer (and the bundler) resolve
those includes for you.

## Running the Shaders

### In the browser (recommended)

```sh
# Any static file server works; here are two:
python3 -m http.server 8080
# then open http://localhost:8080/

npx serve .
```

Open `index.html`, pick a shader from the dropdown, and drag the mouse to feed
`iMouse`. The viewer is plain WebGL2 — no build step, no dependencies. It resolves
`#include` directives at load time with a tiny preprocessor (with include guards,
so the core libraries are only pasted once).

### On Shadertoy

Shadertoy has no `#include`. Two options:

1. Paste each `core/*.glsl` and `common.glsl` into the **Common** tab (strip the
   `#include` lines), then paste the chosen `.frag` into the **Image** tab.
2. Run `node tools/bundle.js shaders/demo/bit_reveal.frag` to get a single flattened
   file with every include inlined, ready to paste.

> Note on precision: real GPU `highp float` is genuine IEEE-754 binary32, so the
> tearing you see is *partly real* and partly simulated. Many GPUs flush denormals
> to zero (FTZ), which is, conveniently, exactly the aesthetic we want.

## References

- Goldberg (1991). *What every computer scientist should know about floating-point arithmetic*
- IEEE 754-2008 standard
- Muller et al. (2018). *Handbook of Floating-Point Arithmetic*
- Kahan, W. *Lecture notes on the status of IEEE 754*

## Related

- `false_vacuum_decay_front` — shared "things fall apart" aesthetic
- `abandoned_orphaned_memory` — shared digital-debris theme

---

*Your GPU believes 1.0 + 1e-8 = 1.0. At sufficient scale, everything is equal to everything else.*
