import pandas as pd

df = pd.read_csv("data/merged.csv")

print(df.head())

df["timestamp"] = pd.to_datetime(df["timestamp"])
df["day_of_year"] = df["timestamp"].dt.dayofyear

features = [
    "temperature",
    "solar_radiation",
    "flow_rate",
    "time_of_day",
    "day_of_year"
]

target = "pressure"

X = df[features]
y = df[target]

from sklearn.model_selection import train_test_split

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

from sklearn.preprocessing import StandardScaler

scaler = StandardScaler()

X_train = scaler.fit_transform(X_train)
X_test = scaler.transform(X_test)


from sklearn.neural_network import MLPRegressor

model = MLPRegressor(
    hidden_layer_sizes=(16, 8),
    max_iter=1500,
    random_state=42
)

model.fit(X_train, y_train)


from sklearn.metrics import mean_absolute_error

preds = model.predict(X_test)

mae = mean_absolute_error(y_test, preds)

print(f"MAE: {mae:.2f}")


import joblib

joblib.dump(model, "models/model.pkl")
joblib.dump(scaler, "models/scaler.pkl")

print("✅ Model saved")