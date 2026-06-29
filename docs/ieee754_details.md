# IEEE-754 binary32, for the Precision Poet

Everything in this repo is downstream of one 32-bit layout. Know the layout and
the breakdown stops being mysterious — it becomes *legible*.

## The bit layout (binary32 / "float")

```
 31 30        23 22                                   0
 ┌─┬─────────────┬──────────────────────────────────────┐
 │S│   exponent  │               mantissa                │
 │ │   (8 bits)  │              (23 bits)                │
 └─┴─────────────┴──────────────────────────────────────┘
  sign   biased E              fraction
```

The value of a *normal* number is:

```
value = (-1)^S × 1.fraction × 2^(E - 127)
```

Note the implicit leading `1.` — normal numbers get 24 bits of significand for
the price of 23 stored bits. The bias of 127 lets E represent exponents from
−126 to +127 using only unsigned bits.

## The special exponents

| E (raw) | mantissa | meaning                                            |
|--------:|----------|----------------------------------------------------|
| `0`     | `0`      | ±0.0                                               |
| `0`     | ≠0       | **denormal** — value `0.fraction × 2^-126`, no implicit 1 |
| `1..254`| any      | normal numbers                                     |
| `255`   | `0`      | ±Infinity                                          |
| `255`   | ≠0       | **NaN** (quiet if top mantissa bit set, else signaling) |

The denormal row is `denormal_fog.frag`. The bottom two rows are
`corruption.glsl`. Everything else is the precision desert.

## Landmark constants

These are the edges of sanity, mirrored in `shaders/common.glsl`:

| name                | value          | what it is                          |
|---------------------|----------------|-------------------------------------|
| `FP32_EPSILON`      | `1.1920929e-7` | 2⁻²³, the gap just above 1.0        |
| `FP32_MIN_NORMAL`   | `1.1754944e-38`| smallest normal; below = denormal   |
| `FP32_MIN_DENORMAL` | `1.4012985e-45`| smallest positive number at all     |
| `FP32_MAX`          | `3.4028235e38` | largest finite; above = Infinity    |

## ULP — the gap between neighbours

The **U**nit in the **L**ast **P**lace at magnitude `x` is the distance to the
next representable float:

```
ulp(x) = 2^(floor(log2|x|) − 23)
```

Near 1.0 that's ~1.2e-7. Near 16,777,216 (2²⁴) it's exactly **1.0** — which is
why `x + 1.0 == x` for all larger integers. Near 1e38 the gap is ~2e31: entire
galaxies fall between adjacent floats.

`precision_sim.glsl::ulp()` is this formula verbatim; `examples/ulp_walk.py`
walks it across the decades.

## Rounding

Default mode is **round-to-nearest, ties-to-even**. Every lossy operation in
`precision_sim.glsl` uses `floor(x/step + 0.5)*step`, the round-to-nearest grid
snap. Real hardware's tie-breaking is fancier, but for visuals the difference is
invisible — what matters is that results land on a grid whose spacing *is* the
ULP.

## Why subtraction is the dangerous one

Multiply and divide spread relative error around politely. Addition of like signs
is fine. The killer is subtracting two nearly-equal numbers: the high bits agree
and cancel, promoting low-order rounding noise to the most significant position.
You don't *introduce* error — you *expose* error that was already there. That's
**catastrophic cancellation**, and it's `catastrophic_cancellation.frag` /
`examples/catastrophic_cancellation.py`.

## Further reading

- Goldberg (1991), *What every computer scientist should know about floating-point arithmetic* — still the canonical text.
- Muller et al. (2018), *Handbook of Floating-Point Arithmetic*.
- Kahan's lecture notes on IEEE 754.
