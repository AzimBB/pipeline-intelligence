"""
Pydantic models for API request/response validation.
Ensures type safety and automatic OpenAPI documentation.
"""

from pydantic import BaseModel, Field
from typing import List, Dict, Optional
from datetime import datetime


# ============ PREDICTION SCHEMAS ============
class PredictionRequest(BaseModel):
    """[AI-NOTE] ML model input validation. Normalizes user inputs for scikit-learn."""
    temperature: float = Field(..., description="Ambient temperature (°C)", ge=-20, le=40)
    solar_radiation: float = Field(..., description="Solar radiation (W/m²)", ge=0, le=800)
    flow_rate: float = Field(..., description="Gas flow rate (m³/s)", ge=40, le=60)
    time_of_day: int = Field(..., description="Hour (0-23)", ge=0, le=23)
    day_of_year: Optional[int] = Field(None, description="Day of year (1-365)")


class PredictionResponse(BaseModel):
    """[AI-NOTE] Direct model output. Pressure in bar."""
    predicted_pressure_bar: float
    input_summary: Dict[str, float]
    timestamp: datetime


# ============ HYDRATE RISK SCHEMAS ============
class HydrateRiskRequest(BaseModel):
    """[AI-NOTE] Validates hydrate formation risk inputs."""
    temperature: float = Field(..., description="Temperature (°C)", ge=-30, le=50)
    pressure: float = Field(..., description="Pressure (bar)", ge=0, le=300)


class HydrateRiskResponse(BaseModel):
    """[AI-NOTE] Boolean risk flag + severity reasoning."""
    is_at_risk: bool
    hydration_index: float
    reasoning: str


# ============ PRESSURE PROFILE SCHEMAS ============
class PressureProfileRequest(BaseModel):
    """[AI-NOTE] Route-based pressure simulation along node path."""
    start_node: str
    end_node: str
    base_pressure: float = Field(..., description="Initial pressure (bar)", ge=50, le=200)
    flow_rate: float = Field(..., description="Flow rate (m³/s)", ge=40, le=60)
    ambient_temperature: float = Field(..., description="Ambient temp (°C)", ge=-20, le=40)
    ambient_solar: float = Field(..., description="Solar radiation (W/m²)", ge=0, le=800)


class PressurePoint(BaseModel):
    """[AI-NOTE] Single point in pressure profile."""
    node_index: int
    pressure_bar: float
    temperature: float
    distance_km: float


class PressureProfileResponse(BaseModel):
    """[AI-NOTE] Full route simulation results."""
    path: List[str]
    total_distance_km: float
    pressure_profile: List[PressurePoint]
    risk_points: List[int]
    critical_alerts: List[str]


# ============ EARTHQUAKE SCHEMAS ============
class EarthquakeEvent(BaseModel):
    """[AI-NOTE] USGS earthquake record."""
    magnitude: float
    place: str
    latitude: float
    longitude: float
    depth_km: float
    timestamp: datetime


class EarthquakeProximityRequest(BaseModel):
    """[AI-NOTE] Earthquake risk assessment for a pipeline location."""
    pipeline_latitude: float = Field(..., ge=-90, le=90)
    pipeline_longitude: float = Field(..., ge=-180, le=180)
    danger_distance_km: float = Field(default=5.0, ge=0.1, le=100)
    min_magnitude: float = Field(default=4.0, ge=0, le=10)


class EarthquakeProximityResponse(BaseModel):
    """[AI-NOTE] Earthquakes within danger zone."""
    near_events: List[EarthquakeEvent]
    count: int
    max_magnitude: Optional[float]
    alert_level: str  # "SAFE", "WARNING", "CRITICAL"


# ============ SEGMENT SCHEMAS ============
class SegmentStatus(BaseModel):
    """[AI-NOTE] Pipeline segment health snapshot."""
    segment_id: int
    location_lat: float
    location_lon: float
    current_pressure_bar: float
    anomaly_rate: float
    alert_status: str  # "STABLE", "WARNING", "CRITICAL"


class SegmentListResponse(BaseModel):
    """[AI-NOTE] All segments with health metrics."""
    segments: List[SegmentStatus]
    total_anomalies: int


# ============ ALERT SCHEMAS ============
class SystemAlert(BaseModel):
    """[AI-NOTE] Rule-based alert triggered."""
    code: str
    severity: str  # "INFO", "WARNING", "CRITICAL"
    message: str


class AlertCheckRequest(BaseModel):
    """[AI-NOTE] Validates conditions for triggering alerts."""
    predicted_pressure: float
    temperature: float
    solar_radiation: float
    flow_rate: float
    pressure_threshold: float = Field(default=140, ge=100, le=200)
    anomaly_threshold: float = Field(default=58, ge=50, le=70)


class AlertCheckResponse(BaseModel):
    """[AI-NOTE] Triggered alerts with severity ranking."""
    alerts: List[SystemAlert]
    system_status: str  # "STABLE", "WARNING", "CRITICAL"


# ============ ROUTE ANALYSIS SCHEMAS ============
class RouteAnalysisRequest(BaseModel):
    """[AI-NOTE] End-to-end route feasibility check."""
    start_node: str
    end_node: str


class RouteAnalysisResponse(BaseModel):
    """[AI-NOTE] Route viability metrics."""
    path_found: bool
    path: List[str]
    total_distance_km: float
    node_count: int
