import { MapContainer, TileLayer, Polyline, Popup, Marker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import type { LatLngTuple } from 'leaflet';

// Define a strict interface for your pipeline coordinates
interface PipelinePoint {
    lat: number;
    lon: number;
    alt?: number;
}

// Define the interface for the compressor stations
interface CompressorStation {
    station_index: number;
    lat: number;
    lon: number;
    distance_from_source_km: number;
}

interface PipelineMapProps {
    points: PipelinePoint[];
    stations?: CompressorStation[]; // Made optional to prevent breaking changes elsewhere
    pressure: number | null;
    threshold: number;
}

// Custom modern SVG icon for the compressor stations
const compressorIcon = L.divIcon({
    html: `
        <div style="
            background-color: #3b82f6; 
            border: 2px solid #ffffff; 
            border-radius: 50%; 
            width: 24px; 
            height: 24px; 
            display: flex; 
            align-items: center; 
            justify-content: center;
            box-shadow: 0 0 8px rgba(59, 130, 246, 0.6);
            color: white;
            font-size: 11px;
            font-weight: bold;
            font-family: sans-serif;
        ">
            ⚙️
        </div>
    `,
    className: 'custom-compressor-icon',
    iconSize: [24, 24],
    iconAnchor: [12, 12], // Centers the icon precisely over the coordinate
});

const getPathColor = (pressure: number | null, threshold: number): string => {
    const currentPressure = pressure ?? 0;
    return currentPressure > threshold ? '#ef4444' : '#10b981'; // Red for anomaly, Green for healthy
};

export function PipelineMap({ points, stations = [], pressure, threshold }: PipelineMapProps) {
    // 1. Safe array checking
    const safePoints = Array.isArray(points) ? points : [];
    const safeStations = Array.isArray(stations) ? stations : [];

    // 2. Cleaned up conflicting early returns into a single clear guard clause
    if (safePoints.length === 0) {
        return (
            <div style={{ color: '#64748b', padding: '20px', textAlign: 'center' }}>
                Waiting for pipeline data from server...
            </div>
        );
    }

    // Explicitly type the mapped array as an array of LatLngTuples
    const positions: LatLngTuple[] = safePoints.map(p => [p.lat, p.lon]);
    
    // Fallback coordinates default safely to an explicit LatLngTuple
    const center: LatLngTuple = positions[0] || [37.95, 58.38]; 

    return (
        <div style={{ height: '100%', width: '100%', overflow: 'hidden' }}> 
            <MapContainer center={center} zoom={7} style={{ height: '100%', width: '100%' }} zoomControl={false} attributionControl={false}>
                {/* Map Tiles */}
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                
                {/* Pipeline Polyline */}
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

                {/* Render Compressor Stations */}
                {safeStations.map((station) => (
                    <Marker
                        key={`station-${station.station_index}`}
                        position={[station.lat, station.lon]}
                        icon={compressorIcon}
                    >
                        <Popup>
                            <div style={{ fontFamily: 'sans-serif', fontSize: '13px' }}>
                                <strong style={{ color: '#3b82f6' }}>Compressor Station #{station.station_index}</strong>
                                <hr style={{ margin: '4px 0', border: 'none', borderTop: '1px solid #e2e8f0' }} />
                                <strong>Distance:</strong> {station.distance_from_source_km} km<br />
                                <strong>Latitude:</strong> {station.lat.toFixed(5)}<br />
                                <strong>Longitude:</strong> {station.lon.toFixed(5)}
                            </div>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>
        </div>
    );
}