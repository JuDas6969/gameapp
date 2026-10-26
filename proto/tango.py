from common import *
N = 6
# constraints: dict {((r1,c1),(r2,c2)): '=' or 'x'} on orthogonal neighbours
CONSTRAINTS = {"leicht": 7, "mittel": 6, "schwer": 5, "experte": 4}
TARGET_GIVENS = {"leicht": 10, "mittel": 7, "schwer": 4, "experte": 0}

def line_ok(line):
    # line with -1 unknown, 0/1 symbols; no three equal in a row, max N/2 each
    for i in range(len(line) - 2):
        if line[i] != -1 and line[i] == line[i + 1] == line[i + 2]: return False
    return line.count(0) <= N // 2 and line.count(1) <= N // 2

def ok(g, cons, r, c):
    row = g[r]; col = [g[i][c] for i in range(N)]
    if not line_ok(row) or not line_ok(col): return False
    for (a, b), t in cons.items():
        if (r, c) in (a, b):
            va, vb = g[a[0]][a[1]], g[b[0]][b[1]]
            if va != -1 and vb != -1 and ((t == '=') != (va == vb)): return False
    return True

def fill(g, rng, idx=0):
    if idx == N * N: return True
    r, c = divmod(idx, N)
    for v in rng.shuffle([0, 1]):
        g[r][c] = v
        if ok(g, {}, r, c) and fill(g, rng, idx + 1): return True
    g[r][c] = -1
    return False

def count_solutions(g, cons, limit=2, idx=0):
    while idx < N * N and g[idx // N][idx % N] != -1: idx += 1
    if idx == N * N: return 1
    r, c = divmod(idx, N); total = 0
    for v in (0, 1):
        g[r][c] = v
        if ok(g, cons, r, c): total += count_solutions(g, cons, limit, idx + 1)
        g[r][c] = -1
        if total >= limit: break
    return total

def generate(diff, rng):
    sol = [[-1] * N for _ in range(N)]
    fill(sol, rng)
    pairs = [((r, c), (r, c + 1)) for r in range(N) for c in range(N - 1)] + \
            [((r, c), (r + 1, c)) for r in range(N - 1) for c in range(N)]
    cons = {}
    for a, b in rng.shuffle(pairs)[:CONSTRAINTS[diff]]:
        cons[(a, b)] = '=' if sol[a[0]][a[1]] == sol[b[0]][b[1]] else 'x'
    g = [row[:] for row in sol]; givens = N * N
    for r, c in rng.shuffle([(r, c) for r in range(N) for c in range(N)]):
        if givens <= TARGET_GIVENS[diff]: break
        v = g[r][c]; g[r][c] = -1
        if count_solutions([row[:] for row in g], cons) == 1: givens -= 1
        else: g[r][c] = v
    return {"grid": g, "solution": sol, "constraints": cons, "givens": givens}

if __name__ == "__main__":
    bench("tango", generate, n=10)
    p = generate("experte", Rng(2)); print(p["givens"]); print(p["constraints"])
