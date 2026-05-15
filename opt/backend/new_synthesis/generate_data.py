import numpy as np
import pandas as pd
from datetime import datetime

def generate_industrial_pipeline_data(year: int = 2026) -> pd.DataFrame:
    print(f"Initializing 365-day telemetry matrix generation for {year}...")
    
    # 1. Setup Timeframe (72 intervals of 20 mins per day = 26,280 rows)
    time_index = pd.date_range(
        start=f"{year}-01-01 00:00:00", 
        end=f"{year}-12-31 23:40:00", 
        freq="20min"
    )
    df = pd.DataFrame(index=time_index)
    
    # 2. Extract and Isolate Time Dimensions
    df['day_of_year'] = df.index.dayofyear
    df['hour'] = df.index.hour + df.index.minute / 60.0
    df['month'] = df.index.month
    
    # 3. Cyclical Trigonometric Encoding (Critical for ML Pattern Recognition)
    df['day_sin'] = np.sin(2 * np.pi * df['day_of_year'] / 365.25)
    df['day_cos'] = np.cos(2 * np.pi * df['day_of_year'] / 365.25)
    df['time_sin'] = np.sin(2 * np.pi * df['hour'] / 24.0)
    df['time_cos'] = np.cos(2 * np.pi * df['hour'] / 24.0)
    
    print("Simulating regional climate dynamics (Central Asia / Ashgabat geography)...")
    
    # 4. Synthesize Ambient Air Temperature (Macro Seasonal + Micro Diurnal)
    # January mean ~ -5°C, July mean ~ 38°C for arid pipeline routes
    seasonal_temp_baseline = 16.5 + 21.5 * np.sin(2 * np.pi * (df['day_of_year'] - 105) / 365.25)
    daily_temp_swing = (12.0 + 5.0 * df['day_sin']) * np.sin(2 * np.pi * (df['hour'] - 9.0) / 24.0)
    air_noise = np.random.normal(0, 1.5, size=len(df))
    df['ambient_temperature_c'] = seasonal_temp_baseline + daily_temp_swing + air_noise
    
    # 5. Synthesize Buried Ground Soil Temperature (Thermal Inertia Buffer)
    # Soil temp dampens and lags air temperature by roughly 30 days due to depth conduction
    df['ground_temperature_c'] = 15.0 + 12.0 * np.sin(2 * np.pi * (df['day_of_year'] - 135) / 365.25) + np.random.normal(0, 0.2, size=len(df))
    
    # 6. Synthesize High-Fidelity Solar Radiation (Global Horizontal Irradiance)
    # Solar declination approximation for Latitude ~ 40° N
    declination = 23.45 * np.sin(2 * np.pi * (df['day_of_year'] - 80) / 365.25)
    # Approximate solar altitude angle over the year
    solar_altitude = 90.0 - (40.0 - declination)
    max_gri_potential = 400 + 550 * np.sin(np.radians(solar_altitude))
    
    # Generate diurnal shape peaking at 13:00 (1 PM)
    diurnal_solar = max_gri_potential * np.sin(np.pi * (df['hour'] - 5.5) / 13.0)
    # Bound it tightly to daylight window
    df['solar_radiation_wm2'] = np.where((df['hour'] >= 5.5) & (df['hour'] <= 18.5), diurnal_solar, 0.0)
    df['solar_radiation_wm2'] = df['solar_radiation_wm2'].clip(lower=0.0)
    
    # Inject Seasonal Cloud/Weather Attenuation Matrix
    # Central Asia gets heavy winter systems but highly stable, clear summers
    winter_cloud_probability = 0.55  # Dec - Feb
    summer_cloud_probability = 0.10  # Jun - Aug
    
    # Interpolate cloud probability curve across the year
    cloud_prob_curve = 0.325 + 0.225 * np.cos(2 * np.pi * df['day_of_year'] / 365.25)
    random_weather_draw = np.random.rand(len(df))
    cloud_cover_factor = np.where(random_weather_draw < cloud_prob_curve, np.random.uniform(0.4, 0.85, size=len(df)), 0.0)
    
    df['solar_radiation_wm2'] *= (1.0 - cloud_cover_factor)
    
    print("Synthesizing compressor station boundary constraints...")
    
    # 7. Synthesize Compressor Operational Metrics (CACGP Specific Patterns)
    # Winter heating requires maximum pipeline throughput (Mass Flow spikes)
    df['mass_flow_rate_kgs'] = 460.0 + 75.0 * np.cos(2 * np.pi * (df['day_of_year'] - 15) / 365.25)
    # Add diurnal industrial drawdowns (mornings/evenings)
    df['mass_flow_rate_kgs'] += 25.0 * np.sin(2 * np.pi * (df['hour'] - 7.0) / 12.0)
    df['mass_flow_rate_kgs'] += np.random.normal(0, 8.0, size=len(df))
    
    # Discharge Pressure maps to mass flow load to keep velocity stable (Range: 70 - 88 Bar)
    df['discharge_pressure_bar'] = 76.0 + 8.0 * np.cos(2 * np.pi * (df['day_of_year'] - 15) / 365.25)
    df['discharge_pressure_bar'] += 2.5 * np.sin(2 * np.pi * (df['hour'] - 6.0) / 12.0)
    df['discharge_pressure_bar'] += np.random.normal(0, 0.4, size=len(df))
    
    # Discharge Temperature (Compressors run hot under load, mitigated by aftercoolers)
    df['discharge_temperature_c'] = 34.0 + 6.0 * (df['mass_flow_rate_kgs'] / df['mass_flow_rate_kgs'].max())
    df['discharge_temperature_c'] += 2.0 * np.sin(2 * np.pi * (df['hour'] - 12.0) / 24.0) + np.random.normal(0, 0.5, size=len(df))
    
    print("Finalizing formatting configurations...")
    # Clean up column precision metrics
    rounding_map = {
        'ambient_temperature_c': 2, 'ground_temperature_c': 2,
        'solar_radiation_wm2': 1, 'mass_flow_rate_kgs': 2,
        'discharge_pressure_bar': 2, 'discharge_temperature_c': 2
    }
    for col, decimals in rounding_map.items():
        df[col] = df[col].round(decimals)
        
    return df

if __name__ == "__main__":
    # Generate the pristine 1-year matrix
    dataset = generate_industrial_pipeline_data(2026)
    
    # Export cleanly to CSV
    output_filename = "cacgp_one_year_telemetry.csv"
    dataset.to_csv(output_filename)
    print(f"Generation complete! Matrix saved with shape {dataset.shape} to '{output_filename}'")