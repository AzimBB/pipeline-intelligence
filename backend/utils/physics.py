"""
Physics utilities: Pressure, hydrate formation, and thermal calculations.
[AI-NOTE] All formulas extracted from monolith for reusability.
"""

from typing import List, Tuple, Optional


def compute_hydrate_formation_index(temperature: float, pressure: float) -> float:
    """
    [AI-NOTE] Simplified hydrate equilibrium envelope using empirical correlation.
    Index > 0.8 indicates high hydrate risk.
    """
    # Simplified CPM-style hydrate curve
    if pressure < 1:
        return 0.0
    
    # Approximate hydrate formation envelope
    critical_temp = 15 - (0.001 * pressure)
    
    if temperature > critical_temp:
        return 0.0  # Above curve, safe
    
    # Below curve: risk increases exponentially
    index = 1.0 - (temperature - critical_temp) / 30.0
    return max(0.0, min(1.0, index))


def detect_hydrate_risk(temperature: float, pressure: float) -> bool:
    """
    [AI-NOTE] Boolean flag for hydrate formation risk.
    True if conditions fall within thermodynamic hydrate region.
    """
    return compute_hydrate_formation_index(temperature, pressure) > 0.5


def compute_joules_thomson_cooling(
    pressure_drop: float,
    initial_temperature: float
) -> float:
    """
    [AI-NOTE] Joules-Thomson expansion cooling effect.
    Pressure drop induces isenthalpic temperature decrease.
    Coefficient ~0.5 K/bar for natural gas.
    """
    jt_coefficient = 0.5  # K/bar (typical for natural gas)
    temp_drop = pressure_drop * jt_coefficient
    return initial_temperature - temp_drop


def compute_thermal_expansion(
    temperature_delta: float,
    initial_pressure: float
) -> float:
    """
    [AI-NOTE] Gay-Lussac law: pressure change from temperature delta at constant volume.
    Assumes pipeline segment volume is fixed.
    """
    # Volumetric expansion coefficient for steel pipe containing gas
    expansion_coefficient = 0.003  # 1/K
    pressure_increase = initial_pressure * expansion_coefficient * temperature_delta
    return initial_pressure + pressure_increase


def compute_pressure_loss_per_segment(
    distance_km: float,
    flow_rate: float,
    pipe_diameter_mm: float = 500
) -> float:
    """
    [AI-NOTE] Darcy-Weisbach friction loss approximation.
    Returns pressure drop in bar per segment.
    """
    # Simplified: friction factor depends on Reynolds number and roughness
    # Typical for 500mm steel pipe with natural gas at moderate flow
    friction_loss_factor = 0.02  # dimensionless
    
    pressure_drop = (
        friction_loss_factor * 
        (distance_km / pipe_diameter_mm) * 
        (flow_rate ** 2)
    )
    
    return pressure_drop


def compute_pressure_profile(
    path: List[str],
    nodes: dict,
    ambient_temperatures: List[float],
    ambient_solar: List[float],
    base_pressure: float,
    flow_rate: float
) -> Tuple[List[float], List[float]]:
    """
    [AI-NOTE] Simulate pressure along route accounting for friction, thermal effects.
    Returns: (pressure_list, temperature_list)
    """
    pressures = [base_pressure]
    temperatures = [ambient_temperatures[0] if ambient_temperatures else 15]
    
    for i in range(len(path) - 1):
        start_node = nodes[path[i]]
        end_node = nodes[path[i + 1]]
        
        # Distance between nodes (approximate from lat/lon)
        lat_diff = abs(end_node["lat"] - start_node["lat"])
        lon_diff = abs(end_node["lon"] - start_node["lon"])
        segment_distance = (lat_diff**2 + lon_diff**2)**0.5 * 111  # rough km conversion
        
        # Friction loss
        pressure_loss = compute_pressure_loss_per_segment(segment_distance, flow_rate)
        new_pressure = pressures[-1] - pressure_loss
        
        # Temperature: use ambient or compute thermal effects
        if i < len(ambient_temperatures):
            new_temp = ambient_temperatures[i]
        else:
            # Joules-Thomson cooling from pressure drop
            new_temp = compute_joules_thomson_cooling(pressure_loss, temperatures[-1])
        
        pressures.append(max(0, new_pressure))  # Pressure cannot be negative
        temperatures.append(new_temp)
    
    return pressures, temperatures
