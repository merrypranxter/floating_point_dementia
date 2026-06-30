#!/usr/bin/env python3
"""float_anatomy.py — dissect a float32 into sign / exponent / mantissa.

The CPU companion to demo/bit_reveal.frag. Give it numbers on the command line
(or run with no args for a curated tour through the special values) and it prints
the raw IEEE-754 binary32 bit pattern, colour-coded by field, plus the decoded
value and the ULP (gap to the next representable float) at that magnitude.

Run:
    python3 examples/float_anatomy.py 1.0 0.1 1e38 1e-40 inf nan
    python3 examples/float_anatomy.py        # the guided tour
"""
import struct
import sys


def bits_of(x: float) -> int:
    # pack as big-endian float32, read back as uint32
    return struct.unpack(">I", struct.pack(">f", x))[0]


def classify(exp_field: int, mant: int) -> str:
    if exp_field == 0:
        return "zero" if mant == 0 else "denormal (gradual underflow)"
    if exp_field == 255:
        return "infinity" if mant == 0 else "NaN"
    return "normal"


def ulp(x: float) -> float:
    # gap to the next float32 above |x|
    b = bits_of(x) & 0x7FFFFFFF
    if b >= 0x7F800000:
        return float("nan")
    if b == 0x7F7FFFFF:  # FP32_MAX: b+1 would be +Inf, so report the prior step
        b = 0x7F7FFFFE
    nxt = struct.unpack(">f", struct.pack(">I", b + 1))[0]
    cur = struct.unpack(">f", struct.pack(">I", b))[0]
    return nxt - cur


def render(x: float) -> str:
    b = bits_of(x)
    sign = (b >> 31) & 0x1
    expf = (b >> 23) & 0xFF
    mant = b & 0x7FFFFF

    s = f"{sign:01b}"
    e = f"{expf:08b}"
    m = f"{mant:023b}"

    kind = classify(expf, mant)
    unbiased = expf - 127 if expf not in (0, 255) else ("-126*" if expf == 0 else "—")

    # round-tripped float32 value (what actually got stored)
    stored = struct.unpack(">f", struct.pack(">f", x))[0]

    lines = [
        f"  input    : {x!r}",
        f"  stored   : {stored!r}   ({kind})",
        f"  bits     : [{s}] [{e}] [{m}]",
        f"             sign exp      mantissa",
        f"  exponent : raw={expf}  unbiased={unbiased}",
        f"  mantissa : {mant} / 8388608",
        f"  ULP here : {ulp(x):.3e}   (distance to the next float32)",
    ]
    return "\n".join(lines)


def main():
    args = sys.argv[1:]
    if not args:
        args = ["1.0", "0.1", "16777217", "3.4e38", "1e38",
                "1.18e-38", "1e-40", "1.4e-45", "inf", "-inf", "nan"]
    for a in args:
        try:
            x = float(a)
        except ValueError:
            print(f"  ?? cannot parse {a!r}\n")
            continue
        print(render(x))
        print()
    print("* denormals share the exponent of the smallest normal; precision, not")
    print("  range, is what's collapsing. Note 16777217 (2^24 + 1) cannot be stored")
    print("  in float32 — it rounds to 16777216. That's where x+1==x begins.")


if __name__ == "__main__":
    main()
