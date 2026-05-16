from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import joblib
import pandas as pd
import numpy as np
import os
import sys
import json
from typing import List, Dict

# Preserve path overrides to locate local modules smoothly
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))
from utils.physics import calculate_pressure_profile_scientific

app = FastAPI(title="Pipeline Intelligence API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Core Model Artifact Paths
MODEL_PATH = "../../models/model.pkl"
SCALER_PATH = "../../models/scaler.pkl"
WEATHER_PREDICTOR_PATH = "./model/pipeline_weather_predictor.pkl"
GEOMETRY_PATH = "../../data/pipeline_with_elevation.json"

# Safe loading checks
model = joblib.load(MODEL_PATH)
scaler = joblib.load(SCALER_PATH)
weather_predictor = joblib.load(WEATHER_PREDICTOR_PATH) if os.path.exists(WEATHER_PREDICTOR_PATH) else None


# --- LEGACY ENDPOINTS PRESERVED UNTOUCHED ---

class PredictRequest(BaseModel):
    temperature: float
    solar_radiation: float
    flow_rate: float
    time_of_day: int
    day_of_year: int

@app.post("/api/predict")
async def predict_pressure(data: PredictRequest):
    try:
        input_df = pd.DataFrame([data.model_dump()])
        scaled = scaler.transform(input_df)
        prediction = model.predict(scaled)[0]
        return {"pressure": float(prediction)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/health")
async def health():
    return {"status": "optimized_engine_online"}

@app.get("/api/pipeline-path")
async def get_pipeline_path():
    try:
        with open("../../data/pipeline_with_elevation.json", "r") as f:
            data = json.load(f)
        points, stations = [], []
        elements = data.get("elements", [])
        if elements:
            if "geometry" in elements[0]:
                for pt in elements[0]["geometry"]:
                    points.append(pt)
            stations = elements[0].get("stations", [])
        return {"points": points, "stations": stations}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# --- DYNAMIC STATION-SEGMENTATION LIVE ENGINE ---

class SimulationRequest(BaseModel):
    segment_id: str   # Expected values: "segment_1", "segment_2", "segment_3", ..., "segment_6"
    start_date: str   # Format: "2026-05-05"
    end_date: str     # Format: "2026-05-06"


def extract_station_segment_slice(geometry_points: list, stations: list, segment_id: str) -> list:
    """
    Dynamically tracks down station positions inside the master coordinates array 
    and slices out the precise geometry stretch belonging to the requested segment.
    """
    # Sort stations by index to guarantee directional continuity
    sorted_stations = sorted(stations, key=lambda x: x.get("station_index", 0))
    
    # Locate index coordinates of each station inside the full array path
    station_indices = []
    for st in sorted_stations:
        lat, lon = st["lat"], st["lon"]
        best_idx, min_dist = 0, float('inf')
        for idx, pt in enumerate(geometry_points):
            dist = (pt["lat"] - lat)**2 + (pt["lon"] - lon)**2
            if dist < min_dist:
                min_dist = dist
                best_idx = idx
        station_indices.append((st.get("station_index"), best_idx))
    
    # Build dictionary map mapping "segment_1" -> (station_1_idx, station_2_idx), etc.
    segment_map = {}
    for i in range(len(station_indices) - 1):
        st_num_curr, idx_curr = station_indices[i]
        st_num_next, idx_next = station_indices[i+1]
        segment_map[f"segment_{st_num_curr}"] = (idx_curr, idx_next)
    
    if segment_id not in segment_map:
        raise HTTPException(
            status_code=400, 
            detail=f"Unknown ID target '{segment_id}'. Available options: {list(segment_map.keys())}"
        )
    
    start_idx, end_idx = segment_map[segment_id]
    # Return slice including the endpoint node for proper geometric connection matching
    return geometry_points[start_idx : end_idx + 1]


@app.post("/api/pipeline/simulate-segment")
async def simulate_segment(payload: SimulationRequest):
    if not os.path.exists(GEOMETRY_PATH):
        raise HTTPException(status_code=500, detail="Pipeline layout topology map not found.")
        
    with open(GEOMETRY_PATH, "r", encoding="utf-8") as f:
        layout_data = json.load(f)
        master_geometry = layout_data["elements"][0]["geometry"]
        stations_list = layout_data["elements"][0].get("stations", [])

    # 1. Dynamically find the correct segment slice based on the Station indices
    geometry_slice = extract_station_segment_slice(master_geometry, stations_list, payload.segment_id)

    # 2. Derive timeline indexing increments
    try:
        time_index = pd.date_range(start=payload.start_date, end=payload.end_date, freq="20min")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Date parsing syntax error configuration: {e}")

    # 3. Create Cyclical Features Matrix for the Weather ML model
    day_of_year = time_index.dayofyear
    hour = time_index.hour + time_index.minute / 60.0

    day_sin = np.sin(2 * np.pi * day_of_year / 365.25)
    day_cos = np.cos(2 * np.pi * day_of_year / 365.25)
    time_sin = np.sin(2 * np.pi * hour / 24.0)
    time_cos = np.cos(2 * np.pi * hour / 24.0)

    ml_features = np.column_stack((day_sin, day_cos, time_sin, time_cos))
    inferred_weather = weather_predictor.predict(ml_features)

    # 4. Generate seasonal baseline boundary conditions for the station
    initial_day = day_of_year[0]
    seasonal_curve = np.cos(2 * np.pi * (initial_day - 15) / 365.25)
    base_pressure = float(76.0 + 8.0 * seasonal_curve)
    base_flow_rate = float(460.0 + 75.0 * seasonal_curve)

    response_timeline = []

    # 5. Run physics calculations on the isolated segment geometry slice
    for idx, timestamp in enumerate(time_index):
        solar_rad = float(max(0.0, inferred_weather[idx, 0]))
        ambient_temp = float(inferred_weather[idx, 1])

        scada_frame = {
            "inputs": {
                "discharge_pressure_bar": base_pressure,
                "discharge_temperature_c": 38.0,
                "mass_flow_rate_kgs": base_flow_rate,
                "solar_radiation_wm2": solar_rad,
                "ambient_temperature_c": ambient_temp
            }
        }

        # Calculate physics for just this segment's coordinate sub-slice!
        pressures = calculate_pressure_profile_scientific(geometry_slice, scada_frame)
        
        response_timeline.append({
            "timestamp": timestamp.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "solar_radiation": round(solar_rad, 1),
            "ambient_temperature": round(ambient_temp, 2),
            "discharge_pressure": round(base_pressure, 2),
            "pressures_gradient": pressures
        })

    return {
        "segment_id": payload.segment_id,
        "total_frames": len(response_timeline),
        "geometry": [{"lat": pt["lat"], "lon": pt["lon"], "elevation_m": pt.get("elevation_m", 0.0)} for pt in geometry_slice],
        "timeline": response_timeline
    }