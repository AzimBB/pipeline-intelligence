import requests
import pandas as pd

URL = "https://power.larc.nasa.gov/api/temporal/hourly/point"


def fetch_weather_data():
    params = {
        "parameters": "T2M,ALLSKY_SFC_SW_DWN",
        "community": "RE",
        "longitude": 10.5,   # you can change later
        "latitude": 61.1,
        "start": "20240101",
        "end": "20240103",
        "format": "JSON"
    }

    response = requests.get(URL, params=params)

    if response.status_code != 200:
        raise Exception("API request failed")

    data = response.json()

    return data

def parse_weather_data(data):
    params = data["properties"]["parameter"]

    temperature = params["T2M"]
    solar = params["ALLSKY_SFC_SW_DWN"]

    df = pd.DataFrame({
        "timestamp": list(temperature.keys()),
        "temperature": list(temperature.values()),
        "solar_radiation": list(solar.values())
    })

    df["timestamp"] = pd.to_datetime(df["timestamp"], format="%Y%m%d%H")

    return df

if __name__ == "__main__":
    data = fetch_weather_data()
    df = parse_weather_data(data)

    df.to_csv("data/weather.csv", index=False)

    print("✅ Weather data saved to data/weather.csv")
    print(df.head())