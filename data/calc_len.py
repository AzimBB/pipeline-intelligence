import json
import math

def haversine(lat1, lon1, lat2, lon2):
    """
    Calculate the great-circle distance between two points on the Earth 
    using their latitude and longitude in decimal degrees.
    """
    R = 6371.0  # Earth's radius in kilometers
    
    # Convert decimal degrees to radians
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    
    # Haversine formula
    a = (math.sin(delta_phi / 2.0) ** 2 + 
         math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    
    return R * c

def calculate_pipeline_length(file_path):
    try:
        with open(file_path, 'r') as f:
            data = json.load(f)
        
        elements = data.get("elements", [])
        if not elements:
            print("Error: No 'elements' array found at the root level.")
            return None
            
        # Extract the geometry points from the first element
        first_element = elements[0]
        geometry = first_element.get("geometry", [])
        
        if not geometry:
            print("Error: No 'geometry' array found inside the first element.")
            return None
            
        total_length_km = 0.0
        
        # Iterate through coordinates sequentially to track cumulative length
        for i in range(1, len(geometry)):
            pt1 = geometry[i - 1]
            pt2 = geometry[i]
            
            distance = haversine(pt1["lat"], pt1["lon"], pt2["lat"], pt2["lon"])
            total_length_km += distance
            
        return total_length_km

    except FileNotFoundError:
        print(f"Error: The file '{file_path}' was not found.")
        return None
    except json.JSONDecodeError:
        print("Error: Failed to decode JSON. Check file formatting.")
        return None

# --- Execution ---
file_name = "updated_pipeline_last_ready.json"  # Update path if necessary
length = calculate_pipeline_length(file_name)

if length is not None:
    print(f"--- Pipeline Calculations ---")
    print(f"Total Points Sampled: {length:.0f}") # Will dynamically match data size
    print(f"Total Measured Length: {length:.2f} km")
    print(f"Total Measured Length: {length * 0.621371:.2f} miles")