# API Quick Reference

All endpoints return JSON. Base URL: `http://localhost:8000`

---

## Prediction Endpoints

### POST /api/predict
Predicts gas pressure using trained ML model.

**Request:**
```json
{
  "temperature": 15.0,
  "solar_radiation": 200.0,
  "flow_rate": 50.0,
  "time_of_day": 12,
  "day_of_year": 130
}
```

**Response:**
```json
{
  "predicted_pressure_bar": 135.42,
  "input_summary": {
    "temperature": 15.0,
    "solar_radiation": 200.0,
    "flow_rate": 50.0,
    "time_of_day": 12
  },
  "timestamp": "2024-01-15T10:30:45.123Z"
}
```

---

### POST /api/hydrate-risk
Checks if conditions fall within hydrate formation envelope.

**Request:**
```json
{
  "temperature": 2.0,
  "pressure": 130.0
}
```

**Response:**
```json
{
  "is_at_risk": true,
  "hydration_index": 0.75,
  "reasoning": "Hydrate formation possible (index=0.75)"
}
```

---

### POST /api/alerts
Evaluates system alerts based on thresholds.

**Request:**
```json
{
  "predicted_pressure": 155.0,
  "temperature": 5.0,
  "solar_radiation": 700.0,
  "flow_rate": 59.0,
  "pressure_threshold": 140,
  "anomaly_threshold": 58
}
```

**Response:**
```json
{
  "alerts": [
    {
      "code": "CRITICAL_PRESSURE",
      "severity": "CRITICAL",
      "message": "Predicted pressure 155.0 bar exceeds threshold 140"
    },
    {
      "code": "HIGH_FLOW",
      "severity": "WARNING",
      "message": "Flow rate 59.0 m³/s exceeds nominal 58"
    }
  ],
  "system_status": "CRITICAL"
}
```

---

## Geospatial Endpoints

### POST /api/earthquake-proximity
Checks for nearby earthquake risk.

**Request:**
```json
{
  "pipeline_latitude": 40.0,
  "pipeline_longitude": 70.0,
  "danger_distance_km": 5.0,
  "min_magnitude": 4.0
}
```

**Response:**
```json
{
  "near_events": [
    {
      "magnitude": 4.5,
      "place": "Hindu Kush Region, Afghanistan",
      "latitude": 40.2,
      "longitude": 70.1,
      "depth_km": 15.3,
      "timestamp": "2024-01-15T09:30:00Z"
    }
  ],
  "count": 1,
  "max_magnitude": 4.5,
  "alert_level": "WARNING"
}
```

---

### POST /api/pressure-profile
Simulates pressure along a route using Dijkstra + physics.

**Request:**
```json
{
  "start_node": "N001",
  "end_node": "N050",
  "base_pressure": 140.0,
  "flow_rate": 52.0,
  "ambient_temperature": 15.0,
  "ambient_solar": 300.0
}
```

**Response:**
```json
{
  "path": ["N001", "N005", "N010", "N015", "N020", "N050"],
  "total_distance_km": 125.5,
  "pressure_profile": [
    {
      "node_index": 0,
      "pressure_bar": 140.0,
      "temperature": 15.0,
      "distance_km": 0.0
    },
    {
      "node_index": 1,
      "pressure_bar": 138.5,
      "temperature": 14.2,
      "distance_km": 25.1
    }
  ],
  "risk_points": [3, 5],
  "critical_alerts": [
    "High pressure zone detected"
  ]
}
```

---

### POST /api/route-analysis
Simple route existence and distance check.

**Request:**
```json
{
  "start_node": "N001",
  "end_node": "N050"
}
```

**Response:**
```json
{
  "path_found": true,
  "path": ["N001", "N005", "N010", "N015", "N020", "N050"],
  "total_distance_km": 125.5,
  "node_count": 6
}
```

---

## Monitoring Endpoints

### GET /api/segments
Returns health status of all 3 pipeline segments.

**Request:** None (GET)

**Response:**
```json
{
  "segments": [
    {
      "segment_id": 0,
      "location_lat": 40.0,
      "location_lon": 70.0,
      "current_pressure_bar": 135.2,
      "anomaly_rate": 0.05,
      "alert_status": "WARNING"
    },
    {
      "segment_id": 1,
      "location_lat": 41.0,
      "location_lon": 71.0,
      "current_pressure_bar": 142.1,
      "anomaly_rate": 0.02,
      "alert_status": "STABLE"
    },
    {
      "segment_id": 2,
      "location_lat": 42.0,
      "location_lon": 72.0,
      "current_pressure_bar": 138.5,
      "anomaly_rate": 0.12,
      "alert_status": "CRITICAL"
    }
  ],
  "total_anomalies": 245
}
```

---

### GET /api/health
Readiness probe for monitoring systems.

**Request:** None (GET)

**Response:**
```json
{
  "status": "healthy",
  "ml_ready": true,
  "timestamp": "2024-01-15T10:30:45.123Z"
}
```

---

## Root Endpoint

### GET /
Returns API metadata.

**Response:**
```json
{
  "api": "Pipeline Intelligence Backend",
  "version": "1.0.0",
  "docs": "/docs",
  "status": "operational"
}
```

---

## Error Responses

### 400 Bad Request
```json
{
  "detail": "Input validation failed: temperature must be between -20 and 40"
}
```

### 404 Not Found
```json
{
  "detail": "No route found between nodes"
}
```

### 500 Internal Server Error
```json
{
  "detail": "Prediction inference failed"
}
```

---

## Parameter Constraints

### Temperature
- Range: -20°C to 40°C
- Type: float

### Solar Radiation
- Range: 0 to 800 W/m²
- Type: float

### Flow Rate
- Range: 40 to 60 m³/s
- Type: float

### Time of Day
- Range: 0-23 (hours)
- Type: int

### Day of Year
- Range: 1-365
- Type: int (auto-populated if omitted)

### Pressure (General)
- Range: 0 to 300 bar
- Type: float

### Latitude
- Range: -90 to 90
- Type: float

### Longitude
- Range: -180 to 180
- Type: float

### Distance (Geospatial)
- Range: 0.1 to 100 km
- Type: float

### Magnitude (Earthquake)
- Range: 0 to 10
- Type: float

---

## Testing with cURL

### Test Prediction
```bash
curl -X POST http://localhost:8000/api/predict \
  -H "Content-Type: application/json" \
  -d '{
    "temperature": 15,
    "solar_radiation": 200,
    "flow_rate": 50,
    "time_of_day": 12,
    "day_of_year": 130
  }' | jq .predicted_pressure_bar
```

### Test Hydrate Risk
```bash
curl -X POST http://localhost:8000/api/hydrate-risk \
  -H "Content-Type: application/json" \
  -d '{
    "temperature": 2,
    "pressure": 130
  }' | jq .is_at_risk
```

### Test Earthquakes
```bash
curl -X POST http://localhost:8000/api/earthquake-proximity \
  -H "Content-Type: application/json" \
  -d '{
    "pipeline_latitude": 40,
    "pipeline_longitude": 70,
    "danger_distance_km": 5,
    "min_magnitude": 4
  }' | jq .alert_level
```

### Test Health
```bash
curl http://localhost:8000/api/health | jq .status
```

---

## Response Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 400 | Bad request (validation failed) |
| 404 | Not found (e.g., no route) |
| 500 | Server error |

---

## Rate Limiting & Caching

- **Earthquake API**: Cached for 5 minutes (USGS API call reduced)
- **ML Model**: Loaded once at startup
- **Graph Data**: Loaded once at startup
- **CSV Data**: Loaded once at startup

No explicit rate limiting configured. Add if needed:
```python
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter

@router.post("/api/predict")
@limiter.limit("100/minute")
def predict(req):
    ...
```

---

## CORS Headers

All endpoints include:
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, OPTIONS
Access-Control-Allow-Headers: Content-Type
```

Restrict in production by updating `main.py`:
```python
allow_origins=["https://yourdomain.com"]
```

---

## Pagination (Future)

Currently no pagination. For large results, add:
```python
class PageParams(BaseModel):
    page: int = 1
    page_size: int = 50
```

---

## Sorting (Future)

Currently no sorting. Add to responses as needed:
```python
class SegmentListResponse(BaseModel):
    segments: List[SegmentStatus]
    sort_by: str = "segment_id"
    sort_order: str = "asc"
```

---

## WebSocket Support (Future)

For real-time updates, extend with:
```python
@app.websocket("/ws/alerts")
async def websocket_alerts(websocket: WebSocket):
    await websocket.accept()
    while True:
        # Stream alerts in real-time
        await websocket.send_json(latest_alerts)
```

---

**Last Updated:** 2024-01-15
**API Version:** 1.0.0
**Status:** Production Ready ✅
