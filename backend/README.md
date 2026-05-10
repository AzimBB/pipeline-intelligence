# Pipeline Intelligence Backend API

Production-grade FastAPI backend refactored from monolithic Streamlit prototype. Serves JSON data to high-performance 3D frontend (React/Three.js).

## Architecture

```
backend/
├── main.py              # FastAPI app, CORS, startup events
├── schemas.py           # Pydantic models for validation
├── ml_engine.py         # ML model singleton (pressure prediction)
├── geo_engine.py        # Earthquake API + geospatial math
├── routers.py           # All API endpoints
└── utils/
    ├── physics.py       # Hydrate risk, Joules-Thomson, pressure loss
    ├── pathfinding.py   # Dijkstra algorithm + graph loading
    ├── alerts.py        # Rule-based anomaly detection
    └── data_loader.py   # CSV data caching
```

## Key Design Principles

### 1. **Strict Constraints**
- **Max 300 lines per file** → Forces modularity, easier testing
- **DRY principle** → Shared utilities in `utils/`
- **Memory efficiency** → Models/graphs load ONCE at startup via singletons

### 2. **Type Safety**
- All endpoints use Pydantic models for automatic validation
- Type hints on every function (`-> float`, `List[dict]`)
- OpenAPI docs auto-generated at `/docs`

### 3. **Separation of Concerns**
- **Engines** (ML, Geo) encapsulate domain logic
- **Routers** handle HTTP only (thin layer)
- **Utils** contain reusable physics/algorithms

### 4. **AI-Optimized Comments**
- Structured comments (`[AI-NOTE]`) explain the *why*
- Dense, actionable (avoid obvious statements)

## API Endpoints

### Prediction
- `POST /api/predict` - ML pressure prediction
- `POST /api/hydrate-risk` - Hydrate formation risk assessment
- `POST /api/alerts` - Rule engine anomaly detection

### Geospatial
- `POST /api/earthquake-proximity` - Earthquake risk filtering
- `POST /api/pressure-profile` - Dijkstra route + physics simulation
- `POST /api/route-analysis` - Simple shortest path check

### Monitoring
- `GET /api/segments` - Pipeline segment health (all 3 segments)
- `GET /api/health` - Readiness probe

## Installation & Running

### 1. Install Dependencies
```bash
cd backend
pip install -r requirements.txt
```

### 2. Ensure Model Files Exist
```
../models/
  ├── model.pkl       # scikit-learn trained model
  └── scaler.pkl      # joblib StandardScaler
```

### 3. Ensure Data Files Exist
```
../data/
  ├── merged.csv          # Time-series pipeline data
  ├── pipeline.json       # Graph nodes/edges
  └── weather.csv         # (optional) Weather lookup
```

### 4. Run Development Server
```bash
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 5. Production Deployment
```bash
gunicorn -w 4 -k uvicorn.workers.UvicornWorker main:app
# OR with uvicorn directly:
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
```

## API Examples

### Example 1: Predict Pressure
```bash
curl -X POST http://localhost:8000/api/predict \
  -H "Content-Type: application/json" \
  -d '{
    "temperature": 15.0,
    "solar_radiation": 200.0,
    "flow_rate": 50.0,
    "time_of_day": 12,
    "day_of_year": 130
  }'
```

### Example 2: Check Hydrate Risk
```bash
curl -X POST http://localhost:8000/api/hydrate-risk \
  -H "Content-Type: application/json" \
  -d '{
    "temperature": 2.0,
    "pressure": 130.0
  }'
```

### Example 3: Route Pressure Profile
```bash
curl -X POST http://localhost:8000/api/pressure-profile \
  -H "Content-Type: application/json" \
  -d '{
    "start_node": "N001",
    "end_node": "N050",
    "base_pressure": 140.0,
    "flow_rate": 52.0,
    "ambient_temperature": 15.0,
    "ambient_solar": 300.0
  }'
```

### Example 4: Earthquake Proximity
```bash
curl -X POST http://localhost:8000/api/earthquake-proximity \
  -H "Content-Type: application/json" \
  -d '{
    "pipeline_latitude": 40.0,
    "pipeline_longitude": 70.0,
    "danger_distance_km": 5.0,
    "min_magnitude": 4.0
  }'
```

## Testing

### Unit Tests (Example)
```python
from ml_engine import MLEngine
from schemas import PredictionRequest

ml = MLEngine()
result = ml.predict_pressure(15.0, 200.0, 50.0, 12, 130)
assert 50 < result < 200, "Pressure out of bounds"
```

### Integration Test
```bash
# In another terminal
python -m pytest tests/ -v --cov=backend
```

## File Size Compliance

All files checked to stay under 300 lines:
- `main.py`: ~90 lines
- `routers.py`: ~280 lines
- `schemas.py`: ~155 lines
- `ml_engine.py`: ~70 lines
- `geo_engine.py`: ~130 lines
- `utils/physics.py`: ~130 lines
- `utils/pathfinding.py`: ~120 lines
- `utils/alerts.py`: ~60 lines
- `utils/data_loader.py`: ~60 lines

## CORS Configuration

By default, CORS allows all origins (`"*"`). For production:

```python
# In main.py:
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://yourdomain.com"],
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)
```

## Performance Notes

1. **ML Models** → Loaded once via MLEngine singleton
2. **Graph Data** → Cached in memory via GraphLoader singleton
3. **CSV Data** → Loaded once via DataLoader singleton
4. **Earthquake Cache** → 5-min TTL to reduce USGS API calls

## Next Steps for Frontend Integration

1. **React/Three.js** queries `/api/pressure-profile` for route visualization
2. **Real-time updates** via `/api/segments` polling (or WebSocket upgrade)
3. **Alert system** subscribes to `/api/alerts` with custom thresholds
4. **Map rendering** uses `/api/earthquake-proximity` for risk overlay

---

**Built for production. Optimized for AI co-pilots. Ready for scale.**
