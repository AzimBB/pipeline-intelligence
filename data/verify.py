import pandas as pd

df = pd.read_csv("data/simulated.csv")

print(df["pressure"].max())

print(df.sort_values("pressure", ascending=False).head(10))