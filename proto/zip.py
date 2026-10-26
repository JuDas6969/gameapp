from common import *
SIZE = {"leicht": 5, "mittel": 6, "schwer": 7, "experte": 8}
TARGET_WAYPOINTS = {"leicht": 7, "mittel": 7, "schwer": 6, "experte": 5}
WALLS = {"leicht": 0, "mittel": 2, "schwer": 4, "experte": 6}
DIRS4 = [(1, 0), (-1, 0), (0, 1), (0, -1)]

def backbite_path(n, rng, moves=None):
    # serpentine start, then random backbite moves -> random Hamiltonian path
    path = []
    for r in range(n):
        cols = range(n) if r % 2 == 0 else range(n - 1, -1, -1)
        path += [(r, c) for c in cols]
    moves = moves or n * n * 10
    for _ in range(moves):
        if rng.chance(0.5): path.reverse()
        head = path[0]
        nbs = [(head[0] + dr, head[1] + dc) for dr, dc in DIRS4]
        nbs = [p for p in nbs if 0 <= p[0] < n and 0 <= p[1] < n and p != path[1]]
        nb = rng.choice(nbs)
        i = path.index(nb)
        path[:i] = path[:i][::-1]  # reverse segment [0, i)
    return path

def edge(a, b): return (a, b) if a < b else (b, a)

def count_paths(n, waypoints, walls, limit=2, budget=200000):
    """waypoints: dict cell->index (1-based), walls: set of edges. Count Hamiltonian paths
    starting at wp 1, ending at last wp, visiting wps in order. Returns count, or -1 if budget exceeded."""
    k = max(waypoints.values())
    start = next(c for c, i in waypoints.items() if i == 1)
    visited = [[False] * n for _ in range(n)]
    nodes = [0]; found = [0]; total = n * n

    def reachable_all(cur, remaining):
        # all unvisited cells reachable from cur (flood fill through unvisited, respecting walls)
        seen = set(); stack = [cur]; seen.add(cur); cnt = 0
        while stack:
            r, c = stack.pop()
            for dr, dc in DIRS4:
                nb = (r + dr, c + dc)
                if 0 <= nb[0] < n and 0 <= nb[1] < n and not visited[nb[0]][nb[1]] and nb not in seen and edge((r, c), nb) not in walls:
                    seen.add(nb); stack.append(nb); cnt += 1
        return cnt == remaining

    def rec(cur, depth, nextwp):
        nodes[0] += 1
        if nodes[0] > budget: raise TimeoutError
        if depth == total:
            if nextwp > k: found[0] += 1
            return
        if not reachable_all(cur, total - depth): return
        # dead-end prune: every unvisited cell (except final waypoint) needs >=2 open neighbours,
        # or 1 if it is adjacent to the current head
        for r in range(n):
            for c in range(n):
                if visited[r][c]: continue
                free = 0; adj_head = False
                for dr, dc in DIRS4:
                    nb = (r + dr, c + dc)
                    if 0 <= nb[0] < n and 0 <= nb[1] < n and edge((r, c), nb) not in walls:
                        if nb == cur: adj_head = True
                        elif not visited[nb[0]][nb[1]]: free += 1
                need = 1 if waypoints.get((r, c)) == k else 2
                if free + (1 if adj_head else 0) < need: return
        for dr, dc in DIRS4:
            nb = (cur[0] + dr, cur[1] + dc)
            if not (0 <= nb[0] < n and 0 <= nb[1] < n) or visited[nb[0]][nb[1]] or edge(cur, nb) in walls: continue
            w = waypoints.get(nb)
            if w is not None and w != nextwp: continue
            if w is None and nextwp == k and depth + 1 == total: continue
            visited[nb[0]][nb[1]] = True
            rec(nb, depth + 1, nextwp + 1 if w is not None else nextwp)
            visited[nb[0]][nb[1]] = False
            if found[0] >= limit: return
    visited[start[0]][start[1]] = True
    try: rec(start, 1, 2)
    except TimeoutError: return -1
    return found[0]

def generate(diff, rng):
    n = SIZE[diff]
    for attempt in range(30):
        path = backbite_path(n, rng)
        pos = {cell: i for i, cell in enumerate(path)}
        # walls: edges between adjacent cells that are NOT consecutive on the path
        cand = []
        for r in range(n):
            for c in range(n):
                for dr, dc in ((1, 0), (0, 1)):
                    nb = (r + dr, c + dc)
                    if nb[0] < n and nb[1] < n and abs(pos[(r, c)] - pos[nb]) != 1: cand.append(edge((r, c), nb))
        walls = set(rng.shuffle(cand)[:WALLS[diff]])
        # start with a waypoint every ~3 cells, then remove while unique
        step = 3
        idxs = list(range(0, n * n, step))
        if idxs[-1] != n * n - 1: idxs.append(n * n - 1)
        def wp_dict(idxs): return {path[i]: j + 1 for j, i in enumerate(idxs)}
        if count_paths(n, wp_dict(idxs), walls) != 1: continue
        removable = rng.shuffle(idxs[1:-1])
        for i in removable:
            if len(idxs) <= TARGET_WAYPOINTS[diff]: break
            trial = [x for x in idxs if x != i]
            if count_paths(n, wp_dict(trial), walls) == 1: idxs = trial
        return {"n": n, "path": path, "waypoints": wp_dict(idxs), "walls": walls}
    return None

if __name__ == "__main__":
    bench("zip", generate, n=6)
    p = generate("experte", Rng(9)); print(len(p["waypoints"]), p["walls"])
