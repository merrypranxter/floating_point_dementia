# Gallery & Tuning Notes

What each shader does, what to look for, and which knob to turn. Open `index.html`
and follow along; every shader responds to the mouse.

> Shadertoy note: these use `iZero` (a 0.0 uniform the viewer provides) to make
> NaN/Inf without the compiler folding the constant away. When porting, add this
> at the top of the Image tab: `float iZero = min(iResolution.z, 0.0);`

---

## phenomena/

### precision_tearing.frag
A grid + orbiting dots near the origin, pushed out into the desert.
- **Look for:** the grid lines fattening into chunky steps, then the whole field
  hashing into static once `precisionBitsAt` drops below ~5.
- **Knob:** mouse X (or time) = distance, swept `1 → 6.7e7`.
- **Bottom strip:** a green→pink bar showing how far gone you are.

### z_fight_cosmic.frag
Two planes one unit apart in depth, viewed from increasing distance.
- **Look for:** clean blue/orange split up close; at cosmic distance the quantized
  depths tie and the planes dither and swap per-pixel — the fight.
- **Knob:** mouse X = camera distance.

### denormal_fog.frag
A descent below `FP32_MIN_NORMAL` into gradual underflow.
- **Look for:** flowing bands at the top drowning in gray fog toward the bottom;
  a red line marks the normal→denormal crossing.
- **Knob:** mouse Y = depth into the denormal range.

### nan_corruption.frag
A `0/0` is born and spreads.
- **Look for:** the pulsing purple front with a bright sizzling edge; it breathes
  in and out on an 8-second cycle.
- **Knob:** click to plant the infection seed under the cursor.

### catastrophic_cancellation.frag
`(1 − cos x)/x²` evaluated naively as magnitude grows.
- **Look for:** cyan (exact) and orange (lossy) curves agreeing on the left, then
  the orange shattering into noise on the right as the background goes red.
- **Knob:** mouse X = operand magnitude.
- **CPU twin:** `examples/catastrophic_cancellation.py`.

### mandelbrot_dementia.frag
Deep zoom into the boundary until binary32 gives out.
- **Look for:** smooth filaments degrading into blocky "ULP pixels," with pink
  grid lines appearing once a representable cell is wider than a screen pixel.
- **Knob:** mouse X = zoom (`exp2(2 → 28)`).

---

## demo/

### journey_to_inf.frag
The grand tour: a 40-second ride from 1.0 through every zone into +Inf, then loop.
- **Look for:** starfield → desert grit → warm-white blowout at the end; the HUD
  bar at the bottom changes colour per zone (green/yellow/orange/white).
- **Knob:** mouse X scrubs the journey.

### math_breakdown.frag
Six operations (+ − × ÷ √ log) on a 3×2 grid, magnitude rising over time.
- **Look for:** each cell glowing green while its lossy result matches the exact
  one, bleeding red as they diverge; the needle's jitter grows with error.
- **Knob:** mouse X = magnitude. Corner pips count the op index.

### bit_reveal.frag
The raw IEEE-754 bits of a number that climbs through the magnitudes.
- **Look for:** the 32-bit strip — red sign, green exponent, blue mantissa — with
  the exponent field counting and the mantissa churning; decoded meters below.
- **Knob:** mouse X = the value under the microscope.
- **CPU twins:** `examples/float_anatomy.py`, `examples/float_bits.js`.

---

## Recording a clip

The viewer renders to a normal `<canvas>`; any screen recorder works. For a clean
loop, `journey_to_inf` repeats every 40s and `nan_corruption` every 8s. Pause with
the ⏸ button to grab a still, or ↺ to restart time.
