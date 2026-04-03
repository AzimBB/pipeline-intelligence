import streamlit as st
import pandas as pd
import plotly.express as px
import joblib
import numpy as np
import datetime

# -------------------------------
# CONFIG
# -------------------------------
st.set_page_config(layout="wide")
st.title("Pipeline Intelligence Dashboard 🚀")

# -------------------------------
# LOAD DATA (CACHED)
# -------------------------------
@st.cache_resource
def load_model():
    model = joblib.load("models/model.pkl")
    scaler = joblib.load("models/scaler.pkl")
    return model, scaler

@st.cache_data
def load_data():
    return pd.read_csv("data/merged.csv")

model, scaler = load_model()
df = load_data()

# -------------------------------
# SEGMENT SIMULATION
# -------------------------------
df["segment"] = (df["timestamp"] // 50) % 3
segment = st.sidebar.selectbox("Pipeline Segment", [0, 1, 2])

# -------------------------------
# SIDEBAR CONTROLS
# -------------------------------
st.sidebar.header("Controls")
st.sidebar.subheader("Prediction Input")

input_temp = st.sidebar.slider("Temperature", -20.0, 40.0, 15.0)
input_solar = st.sidebar.slider("Solar Radiation", 0.0, 800.0, 200.0)
input_flow = st.sidebar.slider("Flow Rate", 40.0, 60.0, 50.0)
input_time = st.sidebar.slider("Time of Day", 0, 23, 12)

# Auto day_of_year
today = datetime.datetime.now()
input_day = today.timetuple().tm_yday

# -------------------------------
# PREDICTION
# -------------------------------
input_df = pd.DataFrame([{
    "temperature": input_temp,
    "solar_radiation": input_solar,
    "flow_rate": input_flow,
    "time_of_day": input_time,
    "day_of_year": input_day
}])

input_scaled = scaler.transform(input_df)
prediction = model.predict(input_scaled)[0]

st.subheader("Predicted Pressure")
st.metric("Predicted Pressure (bar)", round(prediction, 2))

st.caption(f"Inputs → Temp: {input_temp}, Solar: {input_solar}, Flow: {input_flow}")

# Coordination setting  

# -------------------------------
# LOCATION INFO
# -------------------------------
st.markdown("### 🛢️ Pipeline Network Monitoring System")

segment_coords = {
    0: {"lat": 40.0, "lon": 70.0},
    1: {"lat": 41.0, "lon": 71.0},
    2: {"lat": 42.0, "lon": 72.0},
}

coords = segment_coords[segment]
st.write(f"📍 Location: {coords}")

# Earthquake system  



from services.earthquake_api import fetch_earthquakes

@st.cache_data(ttl=300)  # refresh every 5 min
def load_earthquakes():
    return fetch_earthquakes()

eq_df = load_earthquakes()

import numpy as np

def compute_distance(lat1, lon1, lat2, lon2):
    return np.sqrt((lat1 - lat2)**2 + (lon1 - lon2)**2)


pipeline_lat = coords["lat"]
pipeline_lon = coords["lon"]

eq_df["distance"] = eq_df.apply(
    lambda row: compute_distance(
        pipeline_lat,
        pipeline_lon,
        row["lat"],
        row["lon"]
    ),
    axis=1
)

# Define "danger zone"
near_eq = eq_df[
    (eq_df["distance"] < 5) &
    (eq_df["magnitude"] > 4)
]

st.markdown("### 🌍 Recent Earthquakes")

if not near_eq.empty:
    st.dataframe(near_eq[["magnitude", "place", "distance"]])
else:
    st.success("No significant earthquakes near pipeline")


# -------------------------------
# ALERT SYSTEM (AFTER PREDICTION)
# -------------------------------
threshold = st.sidebar.slider("Anomaly Threshold", 120, 180, 140)
st.caption(f"Active threshold: {threshold}")

st.markdown("### 🚨 Alert Panel")

alerts = []

if prediction > threshold:
    alerts.append("🔴 Critical Pressure Predicted")
elif prediction > threshold - 10:
    alerts.append("⚠️ Pressure Rising Warning")

if input_temp < 5 and prediction > 120:
    alerts.append("❄️ Hydrate Formation Risk")

if input_solar > 600 and input_temp > 25:
    alerts.append("🌡️ Thermal Expansion Risk")

if input_flow > 58:
    alerts.append("⚠️ High Flow Rate Detected")

if alerts:
    for alert in alerts:
        st.error(alert)
else:
    st.success("✅ System Stable")

if not near_eq.empty:
    max_mag = near_eq["magnitude"].max()
    alerts.append(f"🌍 Earthquake Risk (M {max_mag}) Nearby")
    
# -------------------------------
# FILTER CONTROLS
# -------------------------------
time_range = st.sidebar.slider(
    "Select Time Range",
    0,
    int(df["timestamp"].max()),
    (0, 200)
)

# -------------------------------
# ANOMALY DETECTION
# -------------------------------
df["is_anomaly"] = (
    (df["pressure"] > threshold) |
    (df["flow_rate"] > 58)
)

# -------------------------------
# FILTER DATA
# -------------------------------
filtered_df = df[
    (df["timestamp"] >= time_range[0]) &
    (df["timestamp"] <= time_range[1]) &
    (df["segment"] == segment)
]

# -------------------------------
# EMPTY STATE CHECK
# -------------------------------
if filtered_df.empty:
    st.warning("No data for selected range")
    st.stop()

# -------------------------------
# SEGMENT STATUS
# -------------------------------
st.subheader("Segment Health Status")

if filtered_df["is_anomaly"].mean() > 0.1:
    st.error("🔴 Segment Unstable")
elif filtered_df["is_anomaly"].mean() > 0.05:
    st.warning("⚠️ Segment Warning")
else:
    st.success("✅ Segment Stable")



# -------------------------------
# SYSTEM OVERVIEW
# -------------------------------
st.markdown("## 🌐 System Overview")

total_anomalies = df["is_anomaly"].sum()
st.metric("Total System Anomalies", int(total_anomalies))

# -------------------------------
# METRICS
# -------------------------------
col1, col2, col3 = st.columns(3)

col1.metric("Max Pressure", round(filtered_df["pressure"].max(), 2))
col2.metric("Min Pressure", round(filtered_df["pressure"].min(), 2))
col3.metric("Anomaly Count", int(filtered_df["is_anomaly"].sum()))

st.caption(f"Avg Pressure: {round(filtered_df['pressure'].mean(), 2)}")

# -------------------------------
# DATA PREVIEW
# -------------------------------
with st.expander("Dataset Preview"):
    st.dataframe(filtered_df.head())

# -------------------------------
# PRESSURE CHART
# -------------------------------
fig = px.line(
    filtered_df,
    x="timestamp",
    y="pressure",
    title="Pressure Over Time"
)

anomalies = filtered_df[filtered_df["is_anomaly"]]

fig.add_scatter(
    x=anomalies["timestamp"],
    y=anomalies["pressure"],
    mode="markers",
    name="Anomalies",
    marker=dict(size=8, color="red")
)

st.plotly_chart(fig, use_container_width=True)

# -------------------------------
# TEMP vs PRESSURE
# -------------------------------
fig2 = px.scatter(
    filtered_df,
    x="temperature",
    y="pressure",
    title="Temperature vs Pressure",
    color="is_anomaly"
)

st.plotly_chart(fig2, use_container_width=True)

