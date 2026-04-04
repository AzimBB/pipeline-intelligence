from utils.physics import compute_pressure_profile, hydrate_risk

def simulate_pipeline(path, nodes, weather_df, input_time, prediction, input_flow, get_weather_for_time):
    temps = []
    solar_vals = []

    for _ in range(len(path) - 1):
        temp, solar = get_weather_for_time(weather_df, input_time)
        temps.append(temp)
        solar_vals.append(solar)

    pressures = compute_pressure_profile(
        path,
        nodes,
        solar_vals,
        base_pressure=prediction,
        flow_rate=input_flow
    )

    risk_points = [
        i for i in range(len(pressures))
        if hydrate_risk(temps[i], pressures[i])
    ]

    return pressures, temps, solar_vals, risk_points