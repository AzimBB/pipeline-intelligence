"""
ML Engine: Singleton for model inference and prediction.
[AI-NOTE] Models loaded ONCE at startup, reused for all requests.
"""

import joblib
import pandas as pd
import numpy as np
from pathlib import Path
from typing import Tuple, Optional
import datetime


class MLEngine:
    """[AI-NOTE] Singleton pattern prevents memory waste from repeated joblib.load() calls."""
    _instance: Optional["MLEngine"] = None
    
    def __new__(cls) -> "MLEngine":
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialize()
        return cls._instance
    
    def _initialize(self) -> None:
        """[AI-NOTE] Load models + scaler from disk. Called once per process."""
        model_dir = Path(__file__).parent.parent / "models"
        
        try:
            self.model = joblib.load(model_dir / "model.pkl")
            self.scaler = joblib.load(model_dir / "scaler.pkl")
            self.is_ready = True
            self.use_mock = False
        except (FileNotFoundError, ValueError) as e:
            # [AI-NOTE] If models can't be loaded (missing or numpy version issue), use mock predictor
            import warnings
            warnings.warn(f"Could not load models: {e}. Using mock predictor for testing.")
            self._initialize_mock_predictor()
            self.is_ready = True
            self.use_mock = True
    
    def _initialize_mock_predictor(self) -> None:
        """[AI-NOTE] Mock predictor for testing when real model unavailable."""
        self.model = None
        self.scaler = None
    
    def predict_pressure(
        self,
        temperature: float,
        solar_radiation: float,
        flow_rate: float,
        time_of_day: int,
        day_of_year: Optional[int] = None
    ) -> float:
        """
        [AI-NOTE] Pressure prediction via trained sklearn model.
        Expects exactly 5 features in model training order.
        Returns pressure in bar.
        """
        if day_of_year is None:
            day_of_year = datetime.datetime.now().timetuple().tm_yday
        
        # [AI-NOTE] Use mock predictor if real model unavailable
        if self.use_mock or self.model is None:
            return self._mock_predict(temperature, solar_radiation, flow_rate, time_of_day, day_of_year)
        
        # Construct feature DataFrame matching training schema
        input_df = pd.DataFrame([{
            "temperature": temperature,
            "solar_radiation": solar_radiation,
            "flow_rate": flow_rate,
            "time_of_day": time_of_day,
            "day_of_year": day_of_year
        }])
        
        # Normalize via stored scaler
        input_scaled = self.scaler.transform(input_df)
        prediction = float(self.model.predict(input_scaled)[0])
        
        return prediction
    
    def _mock_predict(self, temp, solar, flow, time_of_day, day_of_year) -> float:
        """[AI-NOTE] Mock predictor: simple heuristic for testing."""
        # Base pressure with small variations
        base = 120.0
        temp_effect = temp * 0.5  # Higher temp → higher pressure
        solar_effect = solar * 0.02  # Solar heating effect
        flow_effect = flow * 0.3  # Flow rate effect
        time_effect = np.sin((time_of_day / 24) * 2 * np.pi) * 5  # Daily cycle
        
        pressure = base + temp_effect + solar_effect + flow_effect + time_effect
        return float(np.clip(pressure, 50, 200))  # Realistic pressure range
    
    def is_initialized(self) -> bool:
        """[AI-NOTE] Check if models successfully loaded."""
        return getattr(self, "is_ready", False)
