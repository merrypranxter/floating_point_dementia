#!/usr/bin/env python3
"""ulp_walk.py — walk the representable number line and watch the gaps grow.

Floating-point numbers are not evenly spaced. Near 1.0 they're dense; every time
the exponent ticks up, the gap between neighbours (the ULP) doubles. This script
walks across the decades and shows the ULP, plus the punchline: the largest x for
which x + 1.0 != x in float32 (spoiler: 2^24 = 16,777,216).

Run:
    python3 examples/ulp_walk.py
"""
import struct


def f32(x: float) -> float:
    return struct.unpack(">f", struct.pack(">f", x))[0]


def ulp32(x: float) -> float:
    b = struct.unpack(">I", struct.pack(">f", abs(x)))[0]
    nxt = struct.unpack(">f", struct.pack(">I", b + 1))[0]
    return nxt - abs(f32(x))


def main():
    print(f"{'magnitude':>14} | {'ULP (gap to next float32)':>26} | x + 1.0 == x ?")
    print("-" * 64)
    for k in range(0, 40, 3):
        x = f32(2.0 ** k)
        gap = ulp32(x)
        eats_one = f32(x + 1.0) == x
        print(f"{x:14.3e} | {gap:26.3e} | {'YES' if eats_one else 'no'}")

    print()
    # find the exact crossover where adding 1.0 stops mattering
    n = 1
    while f32(float(n) + 1.0) != float(n):
        n *= 2
    print(f"Smallest power of two where x + 1.0 == x in float32:  {n:,}  (= 2^{n.bit_length()-1})")
    print("Above this, integers themselves become unrepresentable — the number line")
    print("has holes wider than the things you're trying to count.")


if __name__ == "__main__":
    main()
