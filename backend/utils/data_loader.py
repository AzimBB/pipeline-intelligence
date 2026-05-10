"""
Data loaders: CSV and cached data management.
[AI-NOTE] Singleton pattern for efficient data loading.
"""

import pandas as pd
from pathlib import Path
from typing import Optional


class DataLoader:
    """[AI-NOTE] Singleton for loading merged CSV data once."""
    _instance: Optional["DataLoader"] = None
    
    def __new__(cls) -> "DataLoader":
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._load()
        return cls._instance
    
    def _load(self) -> None:
        """[AI-NOTE] Load merged.csv into memory at startup."""
        try:
            data_dir = Path(__file__).parent.parent.parent / "data"
            self.df = pd.read_csv(data_dir / "merged.csv")
        except FileNotFoundError:
            raise RuntimeError("merged.csv not found in data/ directory")
    
    def get_data(self) -> pd.DataFrame:
        """Return cached dataframe."""
        return self.df
    
    def get_segment_stats(self, segment_id: int) -> dict:
        """
        [AI-NOTE] Compute health metrics for a pipeline segment.
        Returns anomaly rate, mean pressure, etc.
        """
        df = self.df
        segment_data = df[df["segment"] == segment_id]
        
        if segment_data.empty:
            return {"segment": segment_id, "anomaly_rate": 0, "pressure_mean": 0}
        
        # Define anomaly: pressure > 140 OR flow_rate > 58
        anomalies = (segment_data["pressure"] > 140) | (segment_data["flow_rate"] > 58)
        anomaly_rate = anomalies.mean()
        
        return {
            "segment": segment_id,
            "anomaly_rate": anomaly_rate,
            "pressure_mean": segment_data["pressure"].mean(),
            "pressure_max": segment_data["pressure"].max(),
            "pressure_min": segment_data["pressure"].min()
        }
