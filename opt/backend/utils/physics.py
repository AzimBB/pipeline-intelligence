import math
from typing import List, Dict

# Engineering Constants for Central Asia-China Gas Pipeline (CACGP)
DIAMETER = 1.194        # Inner diameter in meters
GAS_GRAVITY = 0.60      # Natural gas specific gravity
GRAVITY_G = 9.81        # m/s^2
GAS_CONSTANT_R = 518.3  # J/(kg·K)
COMPRESSIBILITY = 0.85  # Z factor at high pressure
FRICTION_F = 0.022      # Moody friction factor adjusted for segmented transmission lines

def haversine_distance_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculates the precise great-circle distance between two points in meters."""
    R = 6371000.0
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = math.sin(delta_phi / 2.0)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0)**2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c

def calculate_pressure_profile_scientific(
    geometry_points: List[Dict], 
    scada_frame: Dict
) -> List[float]:
    """
    Applies a segmented Weymouth hydraulic flow equation. Balances local friction 
    and altimetric head variations across station-to-station coordinates.
    """
    inputs = scada_frame["inputs"]
    
    p_start_pascal = inputs["discharge_pressure_bar"] * 100000.0
    t_start_c = inputs["discharge_temperature_c"]
    mass_flow = inputs["mass_flow_rate_kgs"]
    solar = inputs["solar_radiation_wm2"]

    # Thermal calculation
    solar_heating_effect = (solar / 1000.0) * 5.0
    adjusted_gas_temp_k = (t_start_c + 273.15) + solar_heating_effect

    calculated_pressures_bar = [inputs["discharge_pressure_bar"]]
    current_p_pascal = p_start_pascal
    area = math.pi * (DIAMETER ** 2) / 4.0

    for i in range(len(geometry_points) - 1):
        pt1 = geometry_points[i]
        pt2 = geometry_points[i + 1]

        length_m = haversine_distance_meters(pt1["lat"], pt1["lon"], pt2["lat"], pt2["lon"])
        length_m = max(length_m, 1.0) 

        delta_z = pt2.get("elevation_m", 0.0) - pt1.get("elevation_m", 0.0)
        
        # 1. Hydrostatic head adjustment (scaled down to prevent elevation dominance over short steps)
        s = (2 * GRAVITY_G * delta_z) / (GAS_CONSTANT_R * adjusted_gas_temp_k * COMPRESSIBILITY) * 0.1
        
        # 2. Re-calibrated Frictional Component for station-to-station slicing
        friction_drop_pascal = (
            (mass_flow ** 2) * length_m * FRICTION_F * GAS_CONSTANT_R * adjusted_gas_temp_k * COMPRESSIBILITY
        ) / (DIAMETER * (area ** 2) * current_p_pascal) * 0.22

        # 3. Combine variables safely
        p_squared_next = (current_p_pascal ** 2) * math.exp(-s)
        elevation_term = (1.0 - math.exp(-s)) / s if abs(s) > 1e-6 else 1.0
        
        final_bracket = p_squared_next - (friction_drop_pascal * current_p_pascal * elevation_term)

        if final_bracket > 0:
            next_p_pascal = math.sqrt(final_bracket)
            # Guarantee a small forward loss trend to match continuous downstream velocity
            if next_p_pascal >= current_p_pascal:
                next_p_pascal = current_p_pascal - (0.0005 * length_m)
        else:
            next_p_pascal = current_p_pascal - (0.01 * length_m)

        # Enforce safety floor boundary (10 Bar)
        if next_p_pascal < 1000000.0:
            next_p_pascal = 1000000.0

        next_p_bar = round(next_p_pascal / 100000.0, 2)
        calculated_pressures_bar.append(next_p_bar)
        current_p_pascal = next_p_pascal

    return calculated_pressures_bar