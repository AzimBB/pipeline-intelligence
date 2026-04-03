import streamlit as st
import pandas as pd

st.title("Pipeline Intelligence Dashboard 🚀")

df = pd.read_csv("data/simulated.csv")

st.write("Dataset Preview")
st.dataframe(df.head())