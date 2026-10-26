from common import *
SIZE = {"leicht": 6, "mittel": 7, "schwer": 8, "experte": 9}
DIRS4 = [(1, 0), (-1, 0), (0, 1), (0, -1)]

def random_queens(n, rng):
    # permutation p (row -> col) with no diagonal adjacency between consecutive rows
    for _ in range(1000):
        p = rng.shuffle(list(range(n)))
        if all(abs(p[i] - p[i + 1]) >= 2 for i in range(n - 1)): return p
    return None

def grow_regions(n, queens, rng):
    reg = [[-1] * n for _ in range(n)]
    frontier = []  # list of (region, r, c) candidate expansions
    for i, c in enumerate(queens):
        reg[i][c] = i
    cells_left = n * n - n
    while cells_left > 0:
        # pick random assigned cell with an unassigned neighbour -> expand
        cands = []
        for r in range(n):
            for c in range(n):
                if reg[r][c] >= 0:
                    for dr, dc in DIRS4:
                        rr, cc = r + dr, c + dc
                        if 0 <= rr < n and 0 <= cc < n and reg[rr][cc] < 0:
                            cands.append((reg[r][c], rr, cc))
        if rng.chance(0.6):  # favour the smallest region -> balanced sizes
            sizes = [sum(row.count(i) for row in reg) for i in range(n)]
            cands.sort(key=lambda x: sizes[x[0]])
            smallest = [x for x in cands if sizes[x[0]] == sizes[cands[0][0]]]
            g, r, c = rng.choice(smallest)
        else:
            g, r, c = rng.choice(cands)
        reg[r][c] = g; cells_left -= 1
    return reg

def solutions(n, reg, limit=2):
    """returns list of solutions (each a row->col list), at most `limit`"""
    cols = [False] * n; regs = [False] * n; placed = [-1] * n; out = []
    def rec(r):
        if len(out) >= limit: return
        if r == n: out.append(placed[:]); return
        for c in range(n):
            if cols[c] or regs[reg[r][c]]: continue
            if r > 0 and abs(placed[r - 1] - c) <= 1: continue
            cols[c] = regs[reg[r][c]] = True; placed[r] = c
            rec(r + 1)
            cols[c] = regs[reg[r][c]] = False; placed[r] = -1
    rec(0); return out

def connected_without(n, reg, g, r0, c0):
    """is region g still connected if cell (r0,c0) is removed from it?"""
    cells = [(r, c) for r in range(n) for c in range(n) if reg[r][c] == g and (r, c) != (r0, c0)]
    if not cells: return False
    seen = {cells[0]}; stack = [cells[0]]
    while stack:
        r, c = stack.pop()
        for dr, dc in DIRS4:
            nb = (r + dr, c + dc)
            if nb not in seen and 0 <= nb[0] < n and 0 <= nb[1] < n and reg[nb[0]][nb[1]] == g and nb != (r0, c0):
                seen.add(nb); stack.append(nb)
    return len(seen) == len(cells)

def repair(n, reg, q, rng, max_steps=400):
    """move cells between regions until the intended queens are the unique solution"""
    for _ in range(max_steps):
        sols = solutions(n, reg)
        if len(sols) == 1: return True
        alt = sols[0] if sols[0] != q else sols[1]
        rows = rng.shuffle([r for r in range(n) if alt[r] != q[r]])
        moved = False
        for r in rows:
            c = alt[r]; g = reg[r][c]
            nbs = rng.shuffle([(r + dr, c + dc) for dr, dc in DIRS4])
            for rr, cc in nbs:
                if 0 <= rr < n and 0 <= cc < n and reg[rr][cc] != g and connected_without(n, reg, g, r, c):
                    reg[r][c] = reg[rr][cc]; moved = True; break
            if moved: break
        if not moved: return False
    return False

def generate(diff, rng):
    n = SIZE[diff]
    for _ in range(50):
        q = random_queens(n, rng)
        reg = grow_regions(n, q, rng)
        if repair(n, reg, q, rng):
            return {"n": n, "regions": reg, "queens": q}
    return None

if __name__ == "__main__":
    bench("queens", generate, n=10)
    p = generate("schwer", Rng(5))
    for row in p["regions"]: print("".join(chr(65 + x) for x in row))
