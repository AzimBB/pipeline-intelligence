import { MapContainer, TileLayer, Polyline, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import type { LatLngTuple } from 'leaflet';

// Define a strict interface for your pipeline coordinates instead of using 'any'
interface PipelinePoint {
    lat: number;
    lon: number;
    alt?: number;
}

interface PipelineMapProps {
    points: PipelinePoint[];
    pressure: number | null;
    threshold: number;
}

// Fixed line 33 issue: Fallback to 0 if pressure is null so it's always a strict 'number'
const getPathColor = (pressure: number | null, threshold: number): string => {
    const currentPressure = pressure ?? 0;
    return currentPressure > threshold ? '#ef4444' : '#10b981'; // Red for anomaly, Green for healthy
};

export function PipelineMap({ points, pressure, threshold }: PipelineMapProps) {
    // 1. Safe array checking
    const safePoints = Array.isArray(points) ? points : [];

    // 2. Cleaned up conflicting early returns into a single clear guard clause
    if (safePoints.length === 0) {
        return (
            <div style={{ color: '#64748b', padding: '20px', textAlign: 'center' }}>
                Waiting for pipeline data from server...
            </div>
        );
    }

    // Fixed line 43 issue: Explicitly type the mapped array as an array of LatLngTuples
    const positions: LatLngTuple[] = safePoints.map(p => [p.lat, p.lon]);
    
    // Fallback coordinates default safely to an explicit LatLngTuple
    const center: LatLngTuple = positions[0] || [37.95, 58.38]; 

    return (
        <div style={{ height: '100%', width: '100%', overflow: 'hidden' }}> 
        <MapContainer center={center} zoom={7} style={{ height: '100%', width: '100%' }} zoomControl={false} attributionControl={false}>
                {/* Dark Mode Tiles - easier on the eyes for a "Control Room" feel */}
                <TileLayer
                    url="https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png"
                />
                
                <Polyline 
                    positions={positions} 
                    pathOptions={{ 
                        color: getPathColor(pressure, threshold), 
                        weight: 5,
                        opacity: 0.8 
                    }} 
                >
                    <Popup>
                        <strong>Pipeline Segment</strong><br />
                        Current Pressure: {pressure !== null ? `${pressure.toFixed(2)} PSI` : 'N/A'}<br />
                        {safePoints[0]?.alt !== undefined && `Avg. Elevation: ${safePoints[0].alt}m`}
                    </Popup>
                </Polyline>
            </MapContainer>
        </div>
    );
}