from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import joblib
import pandas as pd
import os
import sys
import json
import requests
import rasterio


# Add the root directory to sys.path so we can reuse your utils
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))
from utils.physics import compute_pressure_profile
from utils.pathfinding import build_graph, dijkstra
# from utils.graph_loader import load_graph

app = FastAPI(title="Pipeline Intelligence API")

# Enable CORS so your React frontend can talk to this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load artifacts using the specific paths from your project
MODEL_PATH = "./models/model.pkl"
SCALER_PATH = "./models/scaler.pkl"

model = joblib.load(MODEL_PATH)
scaler = joblib.load(SCALER_PATH)
# nodes, edges = load_graph() # Pre-load for speed

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
        with open("./data/updated_pipeline_last_ready.json", "r") as f:
            data = json.load(f)
        
        points = []
        stations = []
        
        # Pull elements safely
        elements = data.get("elements", [])
        if elements:
            # 1. Grab points from the geometry array
            if "geometry" in elements[0]:
                for pt in elements[0]["geometry"]:
                    points.append({"lat": pt["lat"], "lon": pt["lon"]})
            
            # 2. Grab the stations from inside the first element where they are nested!
            stations = elements[0].get("stations", [])
        
        return {
            "points": points,
            "stations": stations
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))