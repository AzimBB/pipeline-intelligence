"""
Alert logic: Rule-based system for anomaly detection.
[AI-NOTE] Extracted from Streamlit for backend reusability.
"""

from typing import List, Tuple
from schemas import SystemAlert


def evaluate_alerts(
    predicted_pressure: float,
    temperature: float,
    solar_radiation: float,
    flow_rate: float,
    pressure_threshold: float = 140,
    anomaly_threshold: float = 58
) -> Tuple[List[SystemAlert], str]:
    """
    [AI-NOTE] Rule engine: evaluates conditions and triggers alerts.
    Returns: (alert_list, overall_system_status)
    """
    alerts: List[SystemAlert] = []
    
    # Pressure threshold rules
    if predicted_pressure > pressure_threshold:
        alerts.append(SystemAlert(
            code="CRITICAL_PRESSURE",
            severity="CRITICAL",
            message=f"Predicted pressure {predicted_pressure:.1f} bar exceeds threshold {pressure_threshold}"
        ))
    elif predicted_pressure > pressure_threshold - 10:
        alerts.append(SystemAlert(
            code="PRESSURE_WARNING",
            severity="WARNING",
            message=f"Pressure rising toward threshold: {predicted_pressure:.1f} bar"
        ))
    
    # Hydrate formation risk
    if temperature < 5 and predicted_pressure > 120:
        alerts.append(SystemAlert(
            code="HYDRATE_RISK",
            severity="WARNING",
            message=f"Cold temp {temperature}°C + high pressure {predicted_pressure:.1f} bar = hydrate risk"
        ))
    
    # Thermal expansion risk
    if solar_radiation > 600 and temperature > 25:
        alerts.append(SystemAlert(
            code="THERMAL_EXPANSION",
            severity="WARNING",
            message=f"High solar {solar_radiation} W/m² + temp {temperature}°C causes thermal stress"
        ))
    
    # High flow rate
    if flow_rate > anomaly_threshold:
        alerts.append(SystemAlert(
            code="HIGH_FLOW",
            severity="WARNING",
            message=f"Flow rate {flow_rate:.1f} m³/s exceeds nominal {anomaly_threshold}"
        ))
    
    # Determine overall status
    if any(a.severity == "CRITICAL" for a in alerts):
        overall_status = "CRITICAL"
    elif any(a.severity == "WARNING" for a in alerts):
        overall_status = "WARNING"
    else:
        overall_status = "STABLE"
    
    return alerts, overall_status
