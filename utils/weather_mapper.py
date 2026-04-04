import pandas as pd


def load_weather(path="data/weather.csv"):
    df = pd.read_csv(path)

    df["timestamp"] = pd.to_datetime(df["timestamp"])
    df["hour"] = df["timestamp"].dt.hour

    return df


def get_weather_for_time(weather_df, hour):
    # Get closest hour
    row = weather_df.iloc[(weather_df["hour"] - hour).abs().argsort()[:1]]

    return float(row["temperature"].values[0]), float(row["solar_radiation"].values[0])