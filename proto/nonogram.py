from common import *
SIZE = {"leicht": 5, "mittel": 10, "schwer": 15, "experte": 20}
DENSITY = {"leicht": 0.6, "mittel": 0.6, "schwer": 0.58, "experte": 0.55}
UNK, FILL, EMPTY = -1, 1, 0

def clues_of(line):
    out, run = [], 0
    for v in line:
        if v == 1: run += 1
        elif run: out.append(run); run = 0
    if run: out.append(run)
    return out

def solve_line(cells, clues):
    """returns updated cells (list) or None on contradiction. memo recursion returning
    (ok, fillmask, emptymask) for suffix starting at i with clue index j."""
    L = len(cells); memo = {}
    def rec(i, j):
        key = (i, j)
        if key in memo: return memo[key]
        if j == len(clues):
            ok = all(cells[x] != FILL for x in range(i, L))
            res = (ok, 0, ((1 << L) - 1) >> i << i if ok else 0)
            memo[key] = res; return res
        ok_any, fm, em = False, 0, 0
        # option a: cell i empty
        if i < L and cells[i] != FILL:
            ok, f, e = rec(i + 1, j)
            if ok: ok_any = True; fm |= f; em |= e | (1 << i)
        # option b: block of clues[j] starting at i
        blk = clues[j]
        if i + blk <= L and all(cells[x] != EMPTY for x in range(i, i + blk)) and (i + blk == L or cells[i + blk] != FILL):
            nxt = i + blk + 1 if i + blk < L else L
            ok, f, e = rec(nxt, j + 1) if i + blk < L else rec(L, j + 1)
            if ok:
                ok_any = True
                fm |= f | (((1 << blk) - 1) << i)
                em |= e | ((1 << (i + blk)) if i + blk < L else 0)
        res = (ok_any, fm, em); memo[key] = res; return res
    ok, fm, em = rec(0, 0)
    if not ok: return None
    out = cells[:]
    for x in range(L):
        if out[x] == UNK:
            f, e = (fm >> x) & 1, (em >> x) & 1
            if f and not e: out[x] = FILL
            elif e and not f: out[x] = EMPTY
    return out

def line_solve(n, rows, cols):
    g = [[UNK] * n for _ in range(n)]
    changed = True
    while changed:
        changed = False
        for r in range(n):
            new = solve_line(g[r], rows[r])
            if new is None: return None
            if new != g[r]: g[r] = new; changed = True
        for c in range(n):
            col = [g[r][c] for r in range(n)]
            new = solve_line(col, cols[c])
            if new is None: return None
            if new != col:
                for r in range(n): g[r][c] = new[r]
                changed = True
    return g

def generate(diff, rng):
    n = SIZE[diff]
    for _ in range(200):
        sol = [[1 if rng.chance(DENSITY[diff]) else 0 for _ in range(n)] for _ in range(n)]
        rows = [clues_of(sol[r]) for r in range(n)]
        cols = [clues_of([sol[r][c] for r in range(n)]) for c in range(n)]
        g = line_solve(n, rows, cols)
        if g and all(v != UNK for row in g for v in row):
            return {"n": n, "solution": sol, "rows": rows, "cols": cols}
    return None

if __name__ == "__main__":
    bench("nonogram", generate, n=8)
    p = generate("mittel", Rng(1))
    for row in p["solution"]: print("".join("#" if v else "." for v in row))
