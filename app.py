import streamlit as st
import pandas as pd
import plotly.express as px

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