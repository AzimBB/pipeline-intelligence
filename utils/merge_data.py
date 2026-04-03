import pandas as pd

sim = pd.read_csv("data/simulated.csv")
weather = pd.read_csv("data/weather.csv")

# Expand weather to match simulated size (simple repeat for MVP)
weather_expanded = pd.concat([weather]*50, ignore_index=True)

weather_expanded = weather_expanded.iloc[:len(sim)]

# Merge
sim["real_temperature"] = weather_expanded["temperature"]
sim["real_solar"] = weather_expanded["solar_radiation"]

sim.to_csv("data/merged.csv", index=False)

print("✅ Merged dataset created: data/merged.csv")
print(sim.head())