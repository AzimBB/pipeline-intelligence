import json
import math


def haversine(lat1, lon1, lat2, lon2):
    """Calculate distance between two points (km)"""
    R = 6371
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)

    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)

    a = math.sin(dphi/2)**2 + \
        math.cos(phi1) * math.cos(phi2) * math.sin(dlambda/2)**2

    return 2 * R * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def parse_overpass(file_path):
    with open(file_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    nodes = {}
    edges = []
    node_index = {}
    node_id = 0

    for element in data["elements"]:
        if element["type"] != "way":
            continue

        geometry = element.get("geometry", [])

        prev_node = None

        for point in geometry:
            lat = point["lat"]
            lon = point["lon"]

            key = (round(lat, 6), round(lon, 6))

            # Deduplicate nodes
            if key not in node_index:
                node_index[key] = node_id
                nodes[node_id] = {
                    "lat": lat,
                    "lon": lon
                }
                node_id += 1

            current_node = node_index[key]

            # Create edge (direction = geometry order)
            if prev_node is not None:
                distance = haversine(
                    nodes[prev_node]["lat"],
                    nodes[prev_node]["lon"],
                    lat,
                    lon
                )

                edges.append({
                    "from": prev_node,
                    "to": current_node,
                    "distance_km": distance
                })

            prev_node = current_node

    return nodes, edges