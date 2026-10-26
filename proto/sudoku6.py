from common import *
N = 6; BR, BC = 2, 3  # box rows x box cols

def box(r, c): return (r // BR) * (N // BC) + c // BC

def valid(g, r, c, v):
    for i in range(N):
        if g[r][i] == v or g[i][c] == v: return False
    br, bc = (r // BR) * BR, (c // BC) * BC
    for i in range(BR):
        for j in range(BC):
            if g[br + i][bc + j] == v: return False
    return True

def fill(g, rng, idx=0):
    if idx == N * N: return True
    r, c = divmod(idx, N)
    if g[r][c]: return fill(g, rng, idx + 1)
    for v in rng.shuffle(list(range(1, N + 1))):
        if valid(g, r, c, v):
            g[r][c] = v
            if fill(g, rng, idx + 1): return True
            g[r][c] = 0
    return False

def count_solutions(g, limit=2):
    # pick empty cell with fewest candidates
    best = None
    for r in range(N):
        for c in range(N):
            if g[r][c] == 0:
                cands = [v for v in range(1, N + 1) if valid(g, r, c, v)]
                if not cands: return 0
                if best is None or len(cands) < len(best[2]): best = (r, c, cands)
    if best is None: return 1
    r, c, cands = best; total = 0
    for v in cands:
        g[r][c] = v
        total += count_solutions(g, limit)
        g[r][c] = 0
        if total >= limit: break
    return total

TARGET_GIVENS = {"leicht": 20, "mittel": 16, "schwer": 12, "experte": 0}

def generate(diff, rng):
    sol = [[0] * N for _ in range(N)]
    fill(sol, rng)
    g = [row[:] for row in sol]
    givens = N * N
    for r, c in rng.shuffle([(r, c) for r in range(N) for c in range(N)]):
        if givens <= TARGET_GIVENS[diff]: break
        v = g[r][c]; g[r][c] = 0
        if count_solutions([row[:] for row in g]) == 1: givens -= 1
        else: g[r][c] = v
    return {"grid": g, "solution": sol, "givens": givens}

if __name__ == "__main__":
    bench("sudoku6", generate, n=10)
    print(generate("experte", Rng(3))["givens"])
