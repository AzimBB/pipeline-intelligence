import json

def load_graph(path="data/pipeline_graph.json"):
    with open(path, "r") as f:
        graph = json.load(f)

    nodes = {int(k): v for k, v in graph["nodes"].items()}

    edges = graph["edges"]

    # 🔥 FIX: ensure list
    if isinstance(edges, dict):
        edges = list(edges.values())

    return nodes, edges