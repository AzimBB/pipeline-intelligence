from collections import defaultdict
import heapq


def build_graph(edges):
    graph = defaultdict(list)

    for e in edges:
        graph[e["from"]].append((e["to"], e["distance_km"]))

    return graph


def dijkstra(graph, start, end):
    queue = [(0, start, [])]
    visited = set()

    while queue:
        cost, node, path = heapq.heappop(queue)

        if node in visited:
            continue

        path = path + [node]
        visited.add(node)

        if node == end:
            return path, cost

        for neighbor, weight in graph[node]:
            heapq.heappush(queue, (cost + weight, neighbor, path))

    return None, float("inf")