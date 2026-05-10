"""
API Routers: All FastAPI endpoints organized by domain.
[AI-NOTE] Thin layer between HTTP and business logic engines.
"""

from fastapi import APIRouter, HTTPException
from datetime import datetime
import logging

from schemas import (
    PredictionRequest, PredictionResponse,
    HydrateRiskRequest, HydrateRiskResponse,
    PressureProfileRequest, PressureProfileResponse, PressurePoint,
    EarthquakeProximityRequest, EarthquakeProximityResponse, EarthquakeEvent,
    SegmentListResponse, SegmentStatus,
    AlertCheckRequest, AlertCheckResponse,
    RouteAnalysisRequest, RouteAnalysisResponse
)
from ml_engine import MLEngine
from geo_engine import GeoEngine
from utils.physics import detect_hydrate_risk, compute_hydrate_formation_index
from utils.physics import compute_pressure_profile
from utils.pathfinding import build_adjacency_graph, dijkstra, GraphLoader
from utils.alerts import evaluate_alerts
from utils.data_loader import DataLoader

logger = logging.getLogger(__name__)
router = APIRouter()

# Singleton engine instances
ml_engine = MLEngine()
geo_engine = GeoEngine()
graph_loader = GraphLoader()
data_loader = DataLoader()


# ============ PREDICTION ENDPOINTS ============
@router.post("/api/predict", response_model=PredictionResponse)
def predict_pressure(req: PredictionRequest):
    """
    [AI-NOTE] ML model inference endpoint.
    Normalizes inputs via scaler, returns predicted pressure.
    """
    try:
        pressure = ml_engine.predict_pressure(
            temperature=req.temperature,
            solar_radiation=req.solar_radiation,
            flow_rate=req.flow_rate,
            time_of_day=req.time_of_day,
            day_of_year=req.day_of_year
        )
        
        return PredictionResponse(
            predicted_pressure_bar=pressure,
            input_summary={
                "temperature": req.temperature,
                "solar_radiation": req.solar_radiation,
                "flow_rate": req.flow_rate,
                "time_of_day": req.time_of_day
            },
            timestamp=datetime.utcnow()
        )
    except Exception as e:
        logger.error(f"Prediction failed: {e}")
        raise HTTPException(status_code=500, detail="Prediction inference failed")


# ============ HYDRATE RISK ENDPOINTS ============
@router.post("/api/hydrate-risk", response_model=HydrateRiskResponse)
def check_hydrate_risk(req: HydrateRiskRequest):
    """
    [AI-NOTE] Evaluates hydrate formation risk based on state equations.
    Returns risk index and severity classification.
    """
    index = compute_hydrate_formation_index(req.temperature, req.pressure)
    is_at_risk = detect_hydrate_risk(req.temperature, req.pressure)
    
    reasoning = (
        "Safe zone (above hydrate curve)" if not is_at_risk
        else f"Hydrate formation possible (index={index:.2f})"
    )
    
    return HydrateRiskResponse(
        is_at_risk=is_at_risk,
        hydration_index=index,
        reasoning=reasoning
    )


# ============ PRESSURE PROFILE ENDPOINTS ============
@router.post("/api/pressure-profile", response_model=PressureProfileResponse)
def compute_route_pressure_profile(req: PressureProfileRequest):
    """
    [AI-NOTE] Simulates pressure along a route using Dijkstra + physics.
    Detects hydrate risks and pressure violations.
    """
    try:
        nodes, edges = graph_loader.load()
        graph = build_adjacency_graph(edges)
        
        # Find shortest path
        path, distance_km = dijkstra(graph, req.start_node, req.end_node)
        
        if not path:
            raise HTTPException(status_code=404, detail="No route found between nodes")
        
        # Build temperature/solar arrays for path
        ambient_temps = [req.ambient_temperature] * len(path)
        ambient_solar = [req.ambient_solar] * len(path)
        
        # Compute pressure profile
        pressures, temps = compute_pressure_profile(
            path=path,
            nodes=nodes,
            ambient_temperatures=ambient_temps,
            ambient_solar=ambient_solar,
            base_pressure=req.base_pressure,
            flow_rate=req.flow_rate
        )
        
        # Build response
        profile_points = [
            PressurePoint(
                node_index=i,
                pressure_bar=pressures[i],
                temperature=temps[i],
                distance_km=distance_km * (i / len(path)) if len(path) > 1 else 0
            )
            for i in range(len(pressures))
        ]
        
        # Detect anomalies
        risk_points = [
            i for i in range(len(pressures))
            if detect_hydrate_risk(temps[i], pressures[i])
        ]
        
        critical_alerts = []
        if min(pressures) < 80:
            critical_alerts.append("Critical pressure drop detected")
        if max(pressures) > 140:
            critical_alerts.append("Dangerous high pressure zone")
        if any(t < 0 for t in temps):
            critical_alerts.append("Freezing conditions along route")
        
        return PressureProfileResponse(
            path=path,
            total_distance_km=distance_km,
            pressure_profile=profile_points,
            risk_points=risk_points,
            critical_alerts=critical_alerts
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Pressure profile computation failed: {e}")
        raise HTTPException(status_code=500, detail="Pressure profile computation failed")


# ============ EARTHQUAKE ENDPOINTS ============
@router.post("/api/earthquake-proximity", response_model=EarthquakeProximityResponse)
def check_earthquake_proximity(req: EarthquakeProximityRequest):
    """
    [AI-NOTE] Fetches recent earthquakes and filters by distance/magnitude.
    Returns alert level and nearby events.
    """
    try:
        near_events, max_magnitude, alert_level = geo_engine.find_near_earthquakes(
            pipeline_lat=req.pipeline_latitude,
            pipeline_lon=req.pipeline_longitude,
            danger_distance_km=req.danger_distance_km,
            min_magnitude=req.min_magnitude
        )
        
        earthquake_models = [
            EarthquakeEvent(
                magnitude=e["magnitude"],
                place=e["place"],
                latitude=e["latitude"],
                longitude=e["longitude"],
                depth_km=e["depth_km"],
                timestamp=e["timestamp"]
            )
            for e in near_events
        ]
        
        return EarthquakeProximityResponse(
            near_events=earthquake_models,
            count=len(earthquake_models),
            max_magnitude=max_magnitude,
            alert_level=alert_level
        )
    
    except Exception as e:
        logger.error(f"Earthquake proximity check failed: {e}")
        raise HTTPException(status_code=500, detail="Earthquake API error")


# ============ ALERT ENDPOINTS ============
@router.post("/api/alerts", response_model=AlertCheckResponse)
def check_system_alerts(req: AlertCheckRequest):
    """
    [AI-NOTE] Rule engine for anomaly detection and alert triggering.
    """
    alerts, status = evaluate_alerts(
        predicted_pressure=req.predicted_pressure,
        temperature=req.temperature,
        solar_radiation=req.solar_radiation,
        flow_rate=req.flow_rate,
        pressure_threshold=req.pressure_threshold,
        anomaly_threshold=req.anomaly_threshold
    )
    
    return AlertCheckResponse(alerts=alerts, system_status=status)


# ============ SEGMENT ENDPOINTS ============
@router.get("/api/segments", response_model=SegmentListResponse)
def get_all_segments():
    """
    [AI-NOTE] Returns health metrics for all pipeline segments (0, 1, 2).
    """
    try:
        segment_statuses = []
        segment_coords = {
            0: {"lat": 40.0, "lon": 70.0},
            1: {"lat": 41.0, "lon": 71.0},
            2: {"lat": 42.0, "lon": 72.0}
        }
        
        df = data_loader.get_data()
        total_anomalies = 0
        
        for seg_id in [0, 1, 2]:
            stats = data_loader.get_segment_stats(seg_id)
            coords = segment_coords[seg_id]
            
            # Determine alert status
            if stats["anomaly_rate"] > 0.1:
                alert_status = "CRITICAL"
            elif stats["anomaly_rate"] > 0.05:
                alert_status = "WARNING"
            else:
                alert_status = "STABLE"
            
            segment_statuses.append(SegmentStatus(
                segment_id=seg_id,
                location_lat=coords["lat"],
                location_lon=coords["lon"],
                current_pressure_bar=stats["pressure_mean"],
                anomaly_rate=stats["anomaly_rate"],
                alert_status=alert_status
            ))
            
            total_anomalies += int(stats["anomaly_rate"] * len(df[df["segment"] == seg_id]))
        
        return SegmentListResponse(
            segments=segment_statuses,
            total_anomalies=total_anomalies
        )
    
    except Exception as e:
        logger.error(f"Segment listing failed: {e}")
        raise HTTPException(status_code=500, detail="Segment fetch failed")


# ============ ROUTE ANALYSIS ENDPOINTS ============
@router.post("/api/route-analysis", response_model=RouteAnalysisResponse)
def analyze_route(req: RouteAnalysisRequest):
    """
    [AI-NOTE] Simple route existence check and distance computation.
    """
    try:
        nodes, edges = graph_loader.load()
        graph = build_adjacency_graph(edges)
        
        path, distance_km = dijkstra(graph, req.start_node, req.end_node)
        
        return RouteAnalysisResponse(
            path_found=len(path) > 0,
            path=path,
            total_distance_km=distance_km,
            node_count=len(path)
        )
    
    except Exception as e:
        logger.error(f"Route analysis failed: {e}")
        raise HTTPException(status_code=500, detail="Route analysis failed")


@router.get("/api/health")
def health_check():
    """[AI-NOTE] Readiness probe for orchestrators."""
    return {
        "status": "healthy",
        "ml_ready": ml_engine.is_initialized(),
        "timestamp": datetime.utcnow()
    }
