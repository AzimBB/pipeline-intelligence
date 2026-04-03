import pandas as pd
import numpy as np

def generate_data(n=1000):
    np.random.seed(42)
    time = np.arange(n)
    time_of_day = time % 24

    df = pd.DataFrame({
        "timestamp": time,
        "time_of_day": time_of_day
    })
    
    temperature = 15 + 10 * np.sin(2 * np.pi * time_of_day / 24) + np.random.normal(0, 1, n)

    df["temperature"] = temperature

    solar = np.maximum(0, 800 * np.sin(2 * np.pi * (time_of_day - 6) / 24))
    df["solar_radiation"] = solar

    flow_rate = 50 + np.random.normal(0, 2, n)
    df["flow_rate"] = flow_rate

    pressure = (
    100
    + 0.5 * temperature
    + 0.2 * flow_rate
    + 0.01 * solar
    + np.random.normal(0, 1.5, n)
    )
    df["pressure"] = pressure

    anomaly_indices = np.random.choice(n, size=int(0.02 * n), replace=False)

    for idx in anomaly_indices:
        if df.loc[idx, "solar_radiation"] > 300:
            df.loc[idx, "pressure"] += np.random.normal(25, 5)
        else:
            df.loc[idx, "pressure"] += np.random.normal(15, 5)

        return df

# if __name__ == "__main__":
#     df = generate_data()
#     print(df.head())


if __name__ == "__main__":
    df = generate_data()
    df.to_csv("data/simulated.csv", index=False)
    print("✅ Data generated: data/simulated.csv")