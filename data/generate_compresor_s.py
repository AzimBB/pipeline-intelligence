import json
import math

def haversine(lat1, lon1, lat2, lon2):
    """Calculate the great-circle distance between two points on Earth."""
    R = 6371.0  # Earth radius in kilometers
    
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    
    a = math.sin(delta_phi / 2.0) ** 2 + \
        math.cos(phi1) * math.cos(phi2) * \
        math.sin(delta_lambda / 2.0) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    
    return R * c

def place_compressor_stations(file_path, num_stations=5):
    with open(file_path, 'r') as f:
        data = json.load(f)
    
    # Extract coordinates from the geometry/nodes
    # Depending on how your JSON is structured, we extract the sequence of points
    points = []
    
    # Try parsing 'geometry' array if present, or fallback to elements
    for element in data.get("elements", []):
        if "geometry" in element:
            points = [(pt["lat"], pt["lon"]) for pt in element["geometry"]]
            break
        elif "nodes" in element and isinstance(element["nodes"], list) and len(element["nodes"]) > 0 and isinstance(element["nodes"][0], dict):
            points = [(pt["lat"], pt["lon"]) for pt in element["nodes"]]
            break
            
    # Fallback if structure uses a flat layout or specific parsed coordinate key
    if not points:
        # Scanning for any continuous array of lat/lon dicts
        for key, value in data.items():
            if isinstance(value, list) and len(value) > 0 and "lat" in value[0]:
                points = [(pt["lat"], pt["lon"]) for pt in value]
                break

    if not points:
        raise ValueError("Could not extract a valid sequence of coordinates from the JSON file.")

    # Step 1: Calculate cumulative distance along the path
    cumulative_distances = [0.0]
    total_dist = 0.0
    for i in range(1, len(points)):
        dist = haversine(points[i-1][0], points[i-1][1], points[i][0], points[i][1])
        total_dist += dist
        cumulative_distances.append(total_dist)
    
    print(f"Total Pipeline Length: {total_dist:.2f} km")
    
    # Step 2: Determine target intervals for the stations
    # Distribute them evenly across the path length
    # e.g., for 5 stations, we can space them at 1/6, 2/6... or 0, 1/4, 2/4... 
    # Usually, you want the first one near the source or slightly down the line.
    # Let's space them at equal intervals across the span:
    interval = total_dist / (num_stations + 1)
    target_distances = [interval * (i + 1) for i in range(num_stations)]
    
    stations = []
    point_idx = 0
    
    for target in target_distances:
        # Find the closest coordinate point that matches the target distance
        while point_idx < len(cumulative_distances) - 1 and cumulative_distances[point_idx] < target:
            point_idx += 1
            
        # Get the precise point
        stations.append({
            "station_index": len(stations) + 1,
            "lat": points[point_idx][0],
            "lon": points[point_idx][1],
            "distance_from_source_km": round(cumulative_distances[point_idx], 2)
        })
        
    return stations

# Run the placement mapping
try:
    compressor_locations = place_compressor_stations('updated_pipeline_last_ready.json', num_stations=5)
    print("\nProposed Compressor Station Locations:")
    print(json.dumps(compressor_locations, indent=4))
except Exception as e:
    print(e)