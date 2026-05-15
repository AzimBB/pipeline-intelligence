import pandas as pd
import numpy as np
import xgboost as xgb
from sklearn.metrics import mean_absolute_error
import joblib

def train_pipeline_weather_model():
    print("Loading synthetic telemetry dataset...")
    # Read the CSV generated from our high-fidelity script
    df = pd.read_csv("../new_synthesis/cacgp_one_year_telemetry.csv", parse_dates=True, index_col=0)
    
    # 1. Define Features and Targets
    # We use cyclical trigonometric features so the model understands calendar boundaries
    features = ['day_sin', 'day_cos', 'time_sin', 'time_cos']
    targets = ['solar_radiation_wm2', 'ambient_temperature_c']
    
    X = df[features]
    Y = df[targets]
    
    # 2. Time-Series Splitting (Train on 9 months, Validate on last 3 months)
    # Never use random train_test_split on time-series to avoid future data leak!
    split_idx = int(len(df) * 0.75)
    
    X_train, X_val = X.iloc[:split_idx], X.iloc[split_idx:]
    Y_train, Y_val = Y.iloc[:split_idx], Y.iloc[split_idx:]
    
    print(f"Training matrix shape: {X_train.shape}, Validation matrix shape: {X_val.shape}")
    
    # 3. Initialize and Train Multi-Output XGBoost Regressor
    # MultiOutputRegressor handles predicting both targets simultaneously
    model = xgb.XGBRegressor(
        n_estimators=150,
        max_depth=6,
        learning_rate=0.08,
        subsample=0.8,
        colsample_bytree=0.8,
        random_state=42,
        n_jobs=-1
    )
    
    print("Training XGBoost Regressor Core Engine...")
    model.fit(
        X_train, Y_train,
        eval_set=[(X_val, Y_val)],
        verbose=10
    )
    
    # 4. Evaluate Performance Metric
    predictions = model.predict(X_val)
    mae = mean_absolute_error(Y_val, predictions, multioutput='raw_values')
    print("\n--- Model Validation Report ---")
    print(f"Solar Radiation MAE: {mae[0]:.2f} W/m²")
    print(f"Ambient Temperature MAE: {mae[1]:.2f} °C")
    
    # 5. Save the Trained Model File
    model_filename = "pipeline_weather_predictor.pkl"
    joblib.dump(model, model_filename)
    print(f"\nModel artifact serialized successfully as '{model_filename}'")

if __name__ == "__main__":
    train_pipeline_weather_model()