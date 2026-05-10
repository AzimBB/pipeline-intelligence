"""
Geo Engine: Earthquake API fetching and distance calculations.
[AI-NOTE] Caches earthquake data to avoid repeated API calls.
"""

import requests
import numpy as np
from typing import List, Dict, Tuple, Optional
from datetime import datetime, timedelta
import logging


logger = logging.getLogger(__name__)


class GeoEngine:
    """[AI-NOTE] Handles earthquake API integration + proximity math."""
    
    USGS_API_URL = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_month.geojson"
    CACHE_TTL_SECONDS = 300  # 5 min cache
    
    def __init__(self):
        self._cache: Optional[List[Dict]] = None
        self._cache_time: Optional[datetime] = None
    
    def _is_cache_valid(self) -> bool:
        """[AI-NOTE] TTL check for earthquake data staleness."""
        if self._cache is None or self._cache_time is None:
            return False
        elapsed = (datetime.utcnow() - self._cache_time).total_seconds()
        return elapsed < self.CACHE_TTL_SECONDS
    
    def fetch_earthquakes(self) -> List[Dict]:
        """
        [AI-NOTE] Fetches recent earthquakes from USGS API.
        Returns cached result if within TTL.
        """
        if self._is_cache_valid() and self._cache:
            return self._cache
        
        try:
            response = requests.get(self.USGS_API_URL, timeout=10)
            response.raise_for_status()
            data = response.json()
            
            # Parse GeoJSON features into flat records
            earthquakes = []
            for feature in data.get("features", []):
                props = feature.get("properties", {})
                geom = feature.get("geometry", {})
                coords = geom.get("coordinates", [None, None, None])
                
                eq = {
                    "magnitude": props.get("mag", 0),
                    "place": props.get("place", "Unknown"),
                    "latitude": coords[1],
                    "longitude": coords[0],
                    "depth_km": coords[2] if coords[2] is not None else 0,
                    "timestamp": datetime.utcfromtimestamp(props.get("time", 0) / 1000)
                }
                
                if eq["latitude"] is not None and eq["longitude"] is not None:
                    earthquakes.append(eq)
            
            self._cache = earthquakes
            self._cache_time = datetime.utcnow()
            return earthquakes
        
        except requests.RequestException as e:
            logger.error(f"USGS API fetch failed: {e}")
            # Return cached data even if stale, rather than None
            return self._cache if self._cache else []
    
    @staticmethod
    def haversine_distance(
        lat1: float, lon1: float,
        lat2: float, lon2: float
    ) -> float:
        """
        [AI-NOTE] Haversine formula for great-circle distance.
        Returns distance in kilometers.
        """
        R = 6371  # Earth radius in km
        
        lat1_rad = np.radians(lat1)
        lat2_rad = np.radians(lat2)
        delta_lat = np.radians(lat2 - lat1)
        delta_lon = np.radians(lon2 - lon1)
        
        a = np.sin(delta_lat/2)**2 + np.cos(lat1_rad) * np.cos(lat2_rad) * np.sin(delta_lon/2)**2
        c = 2 * np.arcsin(np.sqrt(a))
        
        return R * c
    
    def find_near_earthquakes(
        self,
        pipeline_lat: float,
        pipeline_lon: float,
        danger_distance_km: float = 5.0,
        min_magnitude: float = 4.0
    ) -> Tuple[List[Dict], Optional[float], str]:
        """
        [AI-NOTE] Filters earthquakes by proximity and magnitude.
        Returns: (near_earthquakes, max_magnitude, alert_level)
        """
        earthquakes = self.fetch_earthquakes()
        
        near_events = []
        for eq in earthquakes:
            distance = self.haversine_distance(
                pipeline_lat, pipeline_lon,
                eq["latitude"], eq["longitude"]
            )
            
            if distance <= danger_distance_km and eq["magnitude"] >= min_magnitude:
                eq["distance_km"] = distance
                near_events.append(eq)
        
        # Determine alert level
        if not near_events:
            alert_level = "SAFE"
            max_magnitude = None
        else:
            max_magnitude = max(e["magnitude"] for e in near_events)
            alert_level = "CRITICAL" if max_magnitude > 5.5 else "WARNING"
        
        return near_events, max_magnitude, alert_level
