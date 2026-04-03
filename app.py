import streamlit as st
import pandas as pd
import plotly.express as px
import joblib
import numpy as np

model = joblib.load("models/model.pkl")
scaler = joblib.load("models/scaler.pkl")


# -------------------------------
# CONFIG
# -------------------------------
st.set_page_config(layout="wide")
st.title("Pipeline Intelligence Dashboard 🚀")

# -------------------------------
# LOAD DATA
# -------------------------------
df = pd.read_csv("data/merged.csv")

# -------------------------------
# SIDEBAR CONTROLS
# -------------------------------
st.sidebar.header("Controls")

st.sidebar.header("Prediction Input")

input_temp = st.sidebar.slider("Temperature", -20.0, 40.0, 15.0)
input_solar = st.sidebar.slider("Solar Radiation", 0.0, 800.0, 200.0)
input_flow = st.sidebar.slider("Flow Rate", 40.0, 60.0, 50.0)
input_time = st.sidebar.slider("Time of Day", 0, 23, 12)
# input_day = st.sidebar.slider("Day of Year", 1, 365, 180)

import datetime

today = datetime.datetime.now()
input_day = today.timetuple().tm_yday


input_df = pd.DataFrame([{
    "temperature": input_temp,
    "solar_radiation": input_solar,
    "flow_rate": input_flow,
    "time_of_day": input_time,
    "day_of_year": input_day
}])

input_scaled = scaler.transform(input_df)
prediction = model.predict(input_scaled)[0]

threshold = st.sidebar.slider("Anomaly Threshold", 120, 180, 140)
st.caption(f"Active threshold: {threshold}")

time_range = st.sidebar.slider(
    "Select Time Range",
    0,
    int(df["timestamp"].max()),
    (0, 200)
)

# -------------------------------
# ANOMALY DETECTION (AFTER SLIDER)
# -------------------------------
df["is_anomaly"] = df["pressure"] > threshold

# -------------------------------
# FILTER DATA
# -------------------------------
filtered_df = df[
    (df["timestamp"] >= time_range[0]) &
    (df["timestamp"] <= time_range[1])
]

# -------------------------------
# METRICS (BASED ON FILTERED DATA)
# -------------------------------
col1, col2, col3 = st.columns(3)

col1.metric("Max Pressure", round(filtered_df["pressure"].max(), 2))
col2.metric("Min Pressure", round(filtered_df["pressure"].min(), 2))
col3.metric("Anomaly Count", int(filtered_df["is_anomaly"].sum()))

st.subheader("Predicted Pressure")

st.metric("Predicted Pressure (bar)", round(prediction, 2))

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

# Highlight anomalies
anomalies = filtered_df[filtered_df["is_anomaly"]]

fig.add_scatter(
    x=anomalies["timestamp"],
    y=anomalies["pressure"],
    mode="markers",
    name="Anomalies"
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