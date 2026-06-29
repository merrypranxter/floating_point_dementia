#!/usr/bin/env python3
"""catastrophic_cancellation.py — watch significant bits die.

The CPU companion to phenomena/catastrophic_cancellation.frag. We compute a
quantity two ways: a *stable* formula and a *naive* one that subtracts two
nearly-equal numbers. The naive version loses one correct digit for roughly
every power of ten the operands share, until the answer is pure rounding noise.

Pure standard library — no numpy needed.

Run:
    python3 examples/catastrophic_cancellation.py
"""
import math


def naive(x):
    # f(x) = (1 - cos x) / x^2  -> true limit 0.5 as x->0.
    # 1 - cos(x) subtracts two values that both approach 1.0: cancellation.
    return (1.0 - math.cos(x)) / (x * x)


def stable(x):
    # Algebraically identical, but built from sin(x/2) so nothing cancels:
    # (1 - cos x) = 2 sin^2(x/2).
    s = math.sin(x / 2.0)
    return 2.0 * s * s / (x * x)


def surviving_digits(approx, exact):
    if exact == 0.0:
        return 0.0
    rel = abs(approx - exact) / abs(exact)
    if rel == 0.0:
        return 16.0  # ~full float64
    return max(0.0, -math.log10(rel))


def main():
    true_value = 0.5  # the analytic limit
    print(f"{'x':>10} | {'naive (1-cos x)/x^2':>24} | {'stable':>20} | digits left")
    print("-" * 78)
    for k in range(1, 12):
        x = 10.0 ** (-k)
        a = naive(x)
        b = stable(x)
        digits = surviving_digits(a, true_value)
        d = int(round(digits))
        bar = "#" * d + "." * (16 - d)
        print(f"{x:10.1e} | {a:24.16f} | {b:20.16f} | {bar} {digits:4.1f}")

    print()
    print("The 'stable' column holds ~0.5 the whole way down.")
    print("The 'naive' column rots from the bottom bit up, then collapses to 0.0")
    print("once 1 - cos(x) has no surviving bits to divide. Same math, different death.")


if __name__ == "__main__":
    main()
