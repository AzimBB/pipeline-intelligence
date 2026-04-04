import json
from pipeline_parser import parse_overpass

nodes, edges = parse_overpass("data/pipeline.json")

nodes_str = {str(k): v for k, v in nodes.items()}

graph = {
    "nodes": nodes_str,
    "edges": edges
}
with open("data/pipeline_graph.json", "w") as f:
    json.dump(graph, f)

print("✅ Graph saved")