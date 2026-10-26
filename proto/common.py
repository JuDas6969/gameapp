import random, time

DIFFS = ["leicht", "mittel", "schwer", "experte"]

class Rng:
    """Mirror of Swift SplitMix64 so results are reproducible; wraps python random for convenience."""
    def __init__(self, seed):
        self.r = random.Random(seed)
    def int(self, n): return self.r.randrange(n)
    def chance(self, p): return self.r.random() < p
    def shuffle(self, a): self.r.shuffle(a); return a
    def choice(self, a): return a[self.r.randrange(len(a))]

def bench(name, gen, tiers=DIFFS, n=5, seed0=1):
    for d in tiers:
        t = time.time(); ok = 0
        for i in range(n):
            p = gen(d, Rng(seed0 + i * 7919))
            if p is not None: ok += 1
        print(f"{name:10s} {d:8s} ok={ok}/{n}  {(time.time()-t)/n*1000:7.1f} ms/puzzle")
