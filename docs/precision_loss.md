# Precision Loss as Aesthetic

A field guide to *how* numbers fall apart, and how each failure becomes an image.
This is the design doc behind the shaders — the "why it looks like that."

## The thesis

Precision loss should look like a **dissolve, not a crash**. A crash is a black
frame and a stack trace. A dissolve is detail melting into its own substrate: the
continuous becoming discrete, the discrete becoming noise, the noise becoming
the bits themselves. We make the quantization *visible* and then *beautiful*.

## The five zones

Numbers pass through five regimes as they leave 1.0. Every shader is a tour of
one or more of them.

### 1. Healthy (|x| ≈ 1)
Full 23 bits. Everything resolves. This is the "before" we need so the "after"
reads as loss. Most shaders render a clean scene here first.

### 2. The precision desert (1 ≪ |x| ≪ 1e38)
The ULP grows with magnitude. Detail finer than the ULP simply cannot exist, so
smooth gradients **band**, fine motion **judders** onto the grid, and `sin(x)` at
x=1e10 looks like white noise because adjacent pixels jump whole periods.

→ `precision_tearing.frag`, `mandelbrot_dementia.frag`
→ knob: `precisionBitsAt(distance)` in `precision_sim.glsl`

### 3. Catastrophic cancellation (subtraction of near-equals)
Not about magnitude but about *similarity*. `a - b` where `a ≈ b` discards every
agreeing high bit, leaving a result made of former rounding noise. Visually:
a signal that should be smooth turns to grain exactly where it's needed most.

→ `catastrophic_cancellation.frag`
→ knob: `simSub()`, `cancellationError()`

### 4. Denormal underflow (|x| < 1.18e-38)
The exponent floor is hit; now only the mantissa shrinks, so relative precision
falls off a cliff. Numbers here are "alive but not well." We render it as a
thickening **gray fog** — present, but untrustworthy. Many GPUs flush these to
zero outright (FTZ), which reads as the fog simply swallowing things whole.

→ `denormal_fog.frag`
→ knob: `madnessLevel()`

### 5. The give-up values (Inf, NaN)
Math stops returning answers. Infinity is an honest blowout — warm white, almost
peaceful. NaN is the interesting one: it's **contagious**. Any operation touching
a NaN yields a NaN, so a single bad pixel metastasizes. We dramatize that as a
purple infection that spreads with a dendritic front.

→ `nan_corruption.frag`, the tail of `journey_to_inf.frag`
→ knobs: `corruptionField()`, `applyCorruption()`

## The palette of failure

Consistency across shaders makes the language readable:

| failure        | colour              | motion                    |
|----------------|---------------------|---------------------------|
| precision loss | the scene, banded   | judder onto the ULP grid  |
| cancellation   | red over green      | grain where it cancels    |
| denormal       | gray (`vec3(0.5)`)  | slow fog, drifting dust   |
| infinity       | warm white          | bloom, then stillness     |
| NaN            | purple, pulsing     | spreading dendritic front |

(Defined once in `corruption.glsl`; reused everywhere.)

## Two kinds of breakdown: real vs simulated

Some tearing is **real**: a GPU's `highp float` is genuine binary32, so a deep
Mandelbrot zoom shatters on its own. Some is **simulated**: we deliberately
`quantizeFloat()` to a chosen bit count so the effect is controllable, framerate-
independent, and identical across hardware. The shaders mix both — real where the
hardware obliges, simulated where we want art direction.

## Tuning knobs (the README's parameters, mapped to code)

| parameter             | where it lives                                  |
|-----------------------|-------------------------------------------------|
| `distance_from_origin`| `exp2(mix(0, ~26, drive))` in each phenomenon    |
| `zoom_rate`           | the `iTime` multiplier on `drive`               |
| `operation_type`      | `opError()` switch in `math_breakdown.frag`     |
| `show_bits`           | `bitStrip()` / `bit_reveal.frag`                |
| `corruption_mode`     | `nanColor` / `infColor` / `denormalColor`       |

## A note on motion

Static quantization is a screenshot; the dread is in the *transition*. Every
shader animates `drive` so you watch the desert arrive. Precision loss is a
process, and the process is the point.
