import os
import json
import rasterio
from typing import List, Dict, Tuple

# Define file paths
TIFF_PATH = "./GEBCO_13_May_2026_63c74a8f383f/gebco_2026_n44.69_s38.58_w63.3_e82.33_geotiff.tif"
JSON_PATH = "updated_pipeline_last_ready.json"
OUTPUT_JSON_PATH = "pipeline_with_elevation.json"

def extract_elevation_at_points(tif_path: str, coordinates: List[Tuple[float, float]]) -> List[float]:
    """
    Extracts elevation values from a GeoTIFF for a list of (latitude, longitude) coordinates.
    """
    if not os.path.exists(tif_path):
        raise FileNotFoundError(f"GeoTIFF file not found at: {tif_path}")

    elevations = []
    
    # Open the raster dataset
    with rasterio.open(tif_path) as src:
        # GEBCO data typically uses EPSG:4326 (WGS84 lat/lon), matching your coordinate pairs
        for lat, lon in coordinates:
            try:
                # rasterio expects (longitude, latitude) order for sample lookup
                row, col = src.index(lon, lat)
                
                # Read the pixel value at this coordinate index
                # window parameter takes a 1x1 pixel bounding box
                window = rasterio.windows.Window(col, row, 1, 1)
                data = src.read(1, window=window)
                
                # Extract value; handle edge cases where coordinates might fall out of bounds
                if data.size > 0:
                    elevation_value = float(data[0, 0])
                    # GEBCO sometimes uses specific nodata values (like -32767) for missing data
                    if elevation_value == src.nodata:
                        elevation_value = 0.0
                    elevations.append(elevation_value)
                else:
                    elevations.append(0.0)
                    
            except Exception as e:
                print(f"Warning: Could not extract elevation for lat: {lat}, lon: {lon}. Error: {e}")
                elevations.append(0.0)
                
    return elevations

def process_pipeline_json():
    """
    Loads the pipeline JSON, extracts elevations, and writes a new file.
    """
    # 1. Load your existing JSON structure
    with open(JSON_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)
        
    # Safely navigate to elements[0].geometry
    try:
        pipeline_element = data["elements"][0]
        geometry_points = pipeline_element["geometry"]
    except (KeyError, IndexError) as e:
        print(f"Error parsing JSON structure: {e}")
        return

    # 2. Prepare coordinates array [(lat, lon), ...]
    coord_pairs = [(pt["lat"], pt["lon"]) for pt in geometry_points]
    print(f"Extracted {len(coord_pairs)} trail points from JSON. Querying GeoTIFF elevations...")

    # 3. Extract the elevation metrics from GEBCO raster
    elevation_profile = extract_elevation_at_points(TIFF_PATH, coord_pairs)

    # 4. Inject elevation values back into each point in the geometry array
    for i, pt in enumerate(geometry_points):
        pt["elevation_m"] = elevation_profile[i]

    # 5. Also handle the compressor stations if they are in the bounding box
    if "stations" in pipeline_element:
        station_coords = [(st["lat"], st["lon"]) for st in pipeline_element["stations"]]
        station_elevations = extract_elevation_at_points(TIFF_PATH, station_coords)
        for i, st in enumerate(pipeline_element["stations"]):
            st["elevation_m"] = station_elevations[i]

    # 6. Save updated pipeline dataset
    with open(OUTPUT_JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)
        
    print(f"Successfully saved updated schema with elevation matrices to: {OUTPUT_JSON_PATH}")

if __name__ == "__main__":
    process_pipeline_json()