"""
Pathfinding utilities: Dijkstra algorithm for shortest route in pipeline graph.
[AI-NOTE] Graph loading and path computation separated for modularity.
"""

from typing import Dict, List, Tuple, Optional
import heapq
from pathlib import Path


class GraphLoader:
    """[AI-NOTE] Singleton for lazy-loading graph nodes and edges."""
    _instance: Optional["GraphLoader"] = None
    
    def __new__(cls) -> "GraphLoader":
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._loaded = False
        return cls._instance
    
    def load(self) -> Tuple[Dict, List[Dict]]:
        """
        [AI-NOTE] Load nodes and edges from JSON.
        Cached after first load.
        """
        if self._loaded:
            return self.nodes, self.edges
        
        try:
            import json
            data_dir = Path(__file__).parent.parent.parent / "data"
            
            with open(data_dir / "pipeline.json") as f:
                pipeline_data = json.load(f)
            
            self.nodes = {str(n["id"]): n for n in pipeline_data.get("nodes", [])}
            self.edges = pipeline_data.get("edges", [])
            self._loaded = True
            
            return self.nodes, self.edges
        
        except Exception as e:
            raise RuntimeError(f"Graph loading failed: {e}")


def build_adjacency_graph(edges: List[Dict]) -> Dict[str, List[Tuple[str, float]]]:
    """
    [AI-NOTE] Construct adjacency list with weights (distances).
    Format: {node_id: [(neighbor_id, distance), ...]}
    """
    graph: Dict[str, List[Tuple[str, float]]] = {}
    
    for edge in edges:
        from_node = str(edge.get("from"))
        to_node = str(edge.get("to"))
        weight = float(edge.get("distance", 1.0))
        
        if from_node not in graph:
            graph[from_node] = []
        if to_node not in graph:
            graph[to_node] = []
        
        # Undirected graph: add both directions
        graph[from_node].append((to_node, weight))
        graph[to_node].append((from_node, weight))
    
    return graph


def dijkstra(
    graph: Dict[str, List[Tuple[str, float]]],
    start: str,
    end: str
) -> Tuple[List[str], float]:
    """
    [AI-NOTE] Dijkstra's algorithm for shortest path.
    Returns: (path as list of nodes, total_distance_km)
    """
    if start == end:
        return [start], 0.0
    
    # Initialize
    distances = {node: float('inf') for node in graph}
    distances[start] = 0.0
    previous = {node: None for node in graph}
    visited = set()
    pq = [(0.0, start)]
    
    while pq:
        current_dist, current_node = heapq.heappop(pq)
        
        if current_node in visited:
            continue
        
        visited.add(current_node)
        
        if current_node == end:
            # Reconstruct path
            path = []
            node = end
            while node is not None:
                path.append(node)
                node = previous[node]
            path.reverse()
            return path, distances[end]
        
        # Relax edges
        for neighbor, weight in graph.get(current_node, []):
            if neighbor not in visited:
                new_dist = current_dist + weight
                if new_dist < distances[neighbor]:
                    distances[neighbor] = new_dist
                    previous[neighbor] = current_node
                    heapq.heappush(pq, (new_dist, neighbor))
    
    # No path found
    return [], float('inf')
