import requests
import pandas as pd

URL = "https://earthquake.usgs.gov/fdsnws/event/1/query"


def fetch_earthquakes():
    params = {
        "format": "geojson",
        "limit": 50,          # recent 50 events
        "orderby": "time"
    }

    response = requests.get(URL, params=params)

    if response.status_code != 200:
        raise Exception("Failed to fetch earthquake data")

    data = response.json()

    earthquakes = []

    for feature in data["features"]:
        props = feature["properties"]
        coords = feature["geometry"]["coordinates"]

        earthquakes.append({
            "magnitude": props["mag"],
            "place": props["place"],
            "time": props["time"],
            "lon": coords[0],
            "lat": coords[1],
            "depth": coords[2]
        })

    df = pd.DataFrame(earthquakes)

    return df


if __name__ == "__main__":
    df = fetch_earthquakes()
    print(df.head())