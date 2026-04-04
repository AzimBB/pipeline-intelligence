import math

def compute_pressure_profile(path, nodes, solar_vals, base_pressure=120, flow_rate=50):
    pressures = []
    pressure = base_pressure

    for i in range(len(path) - 1):
        n1 = nodes[path[i]]
        n2 = nodes[path[i + 1]]

        # Distance (approx)
        dx = n2["lat"] - n1["lat"]
        dy = n2["lon"] - n1["lon"]
        distance = math.sqrt(dx*dx + dy*dy) * 111  # km

        # Get solar for this segment
        solar = solar_vals[i]

        # Solar effect (heating → expansion → pressure change)
        solar_effect = 1 + (solar / 1200)

        # Pressure drop model
        drop = 0.02 * distance * (flow_rate / 50) * solar_effect

        pressure -= drop
        pressures.append(pressure)

    return pressures


def hydrate_risk(temp, pressure):
    return temp < 5 and pressure > 100