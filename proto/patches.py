from common import *
SIZE = {"leicht": 5, "mittel": 7, "schwer": 9, "experte": 11}
MAX_AREA = {"leicht": 6, "mittel": 8, "schwer": 10, "experte": 12}

def partition(n, rng, max_area):
    owner = [[-1] * n for _ in range(n)]; rects = []
    for r in range(n):
        for c in range(n):
            if owner[r][c] != -1: continue
            # choose random w,h fitting the free area, biased away from 1x1
            opts = []
            for h in range(1, n - r + 1):
                for w in range(1, n - c + 1):
                    if w * h > max_area: break
                    if all(owner[r + i][c + j] == -1 for i in range(h) for j in range(w)):
                        opts.append((w, h))
            opts = [o for o in opts if o != (1, 1)] or opts
            w, h = rng.choice(opts)
            idx = len(rects); rects.append((r, c, w, h))
            for i in range(h):
                for j in range(w): owner[r + i][c + j] = idx
    return rects, owner

def placements(n, clue_r, clue_c, area, clue_cells):
    """all rectangles of `area` containing (clue_r, clue_c) within grid and containing no other clue"""
    out = []
    for h in range(1, min(area, n) + 1):
        if area % h: continue
        w = area // h
        if w > n: continue
        for r in range(clue_r - h + 1, clue_r + 1):
            for c in range(clue_c - w + 1, clue_c + 1):
                if r < 0 or c < 0 or r + h > n or c + w > n: continue
                if any((rr, cc) in clue_cells and (rr, cc) != (clue_r, clue_c) for rr in range(r, r + h) for cc in range(c, c + w)): continue
                out.append((r, c, w, h))
    return out

def count_solutions(n, clues, limit=2):
    # clues: dict (r,c)->area
    cells = set(clues)
    opts = {k: placements(n, k[0], k[1], a, cells) for k, a in clues.items()}
    cover = [[False] * n for _ in range(n)]; cnt = [0]
    def free(rect): return all(not cover[r][c] for r in range(rect[0], rect[0] + rect[3]) for c in range(rect[1], rect[1] + rect[2]))
    def setc(rect, v):
        for r in range(rect[0], rect[0] + rect[3]):
            for c in range(rect[1], rect[1] + rect[2]): cover[r][c] = v
    def rec(done):
        if cnt[0] >= limit: return
        if len(done) == len(clues): cnt[0] += 1; return
        best = None
        for k in clues:
            if k in done: continue
            valid = [o for o in opts[k] if free(o)]
            if not valid: return
            if best is None or len(valid) < len(best[1]): best = (k, valid)
        k, valid = best
        for o in valid:
            setc(o, True); done.add(k); rec(done); done.discard(k); setc(o, False)
    rec(set()); return cnt[0]

def generate(diff, rng):
    n = SIZE[diff]
    for _ in range(100):
        rects, owner = partition(n, rng, MAX_AREA[diff])
        for _ in range(8):
            clues = {}
            for (r, c, w, h) in rects:
                cr, cc = r + rng.int(h), c + rng.int(w)
                clues[(cr, cc)] = w * h
            if count_solutions(n, clues) == 1:
                return {"n": n, "clues": clues, "rects": rects}
    return None

if __name__ == "__main__":
    bench("patches", generate, n=8)
    p = generate("mittel", Rng(4))
    g = [["."] * p["n"] for _ in range(p["n"])]
    for (r, c), a in p["clues"].items(): g[r][c] = str(a)
    for row in g: print(" ".join(x.rjust(2) for x in row))
