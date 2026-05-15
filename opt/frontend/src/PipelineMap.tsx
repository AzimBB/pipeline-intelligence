import { MapContainer, TileLayer, Polyline, Popup, Marker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import type { LatLngTuple } from 'leaflet';

interface PipelinePoint {
    lat: number;
    lon: number;
    alt?: number;
}

interface CompressorStation {
    station_index: number;
    lat: number;
    lon: number;
    distance_from_source_km: number;
}

interface PipelineMapProps {
    points: PipelinePoint[];
    stations: CompressorStation[];
    activeSegmentIndex: number; // Receives selected index from parent App dashboard
    pressure: number | null;
    threshold: number;
}

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
    iconAnchor: [12, 12],
});

// Calculate distance between points to find closest matching geometry index
const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    return Math.pow(lat1 - lat2, 2) + Math.pow(lon1 - lon2, 2);
};

export function PipelineMap({ points, stations, activeSegmentIndex, pressure, threshold }: PipelineMapProps) {
    const safePoints = Array.isArray(points) ? points : [];
    const safeStations = Array.isArray(stations) ? [...stations].sort((a, b) => a.station_index - b.station_index) : [];

    if (safePoints.length === 0) {
        return (
            <div style={{ color: '#64748b', padding: '20px', textAlign: 'center' }}>
                Waiting for pipeline data from server...
            </div>
        );
    }

    // 1. Dynamic Segmentation: Map compressor coordinates to their nearest pipeline geometry index
    const boundaryIndexes: number[] = [0]; // Always starts at the pipeline index 0

    safeStations.forEach((station) => {
        let closestIdx = 0;
        let minDistance = Infinity;

        for (let i = 0; i < safePoints.length; i++) {
            const dist = getDistance(safePoints[i].lat, safePoints[i].lon, station.lat, station.lon);
            if (dist < minDistance) {
                minDistance = dist;
                closestIdx = i;
            }
        }
        boundaryIndexes.push(closestIdx);
    });

    boundaryIndexes.push(safePoints.length - 1); // Always ends at the last coordinate index

    // 2. Build isolated rendering segments array
    const pipelineSegments: LatLngTuple[][] = [];
    for (let i = 0; i < boundaryIndexes.length - 1; i++) {
        const start = boundaryIndexes[i];
        const end = boundaryIndexes[i + 1];
        // Slice the path including boundary overlaps to prevent spatial map gaps
        const segmentCoords = safePoints.slice(start, end + 1).map(p => [p.lat, p.lon] as LatLngTuple);
        pipelineSegments.push(segmentCoords);
    }

    const center: LatLngTuple = [safePoints[0].lat, safePoints[0].lon] ;

    return (
        <div style={{ height: '100%', width: '100%', overflow: 'hidden' }}> 
            <MapContainer center={center} zoom={7} style={{ height: '100%', width: '100%' }} zoomControl={false} attributionControl={false}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                
                {/* 3. Render each segment with isolated color states */}
                {pipelineSegments.map((coords, index) => {
                    const isActive = index === activeSegmentIndex;
                    
                    // Default Color Strategy: Highlight selected segment conditionally; unselected segments stay standard green (#10b981)
                    let pathColor = '#10b981'; 
                    if (isActive) {
                        const currentPressure = pressure ?? 0;
                        pathColor = currentPressure > threshold ? '#ef4444' : '#10b981';
                    }

                    let segmentName = "";
                    if (index === 0) segmentName = "Source Terminal to Station #1";
                    else if (index === pipelineSegments.length - 1) segmentName = `Station #${index} to Destination Terminal`;
                    else segmentName = `Station #${index} to Station #${index + 1}`;

                    return (
                        <Polyline 
                            key={`pipe-segment-${index}`}
                            positions={coords} 
                            pathOptions={{ 
                                color: pathColor, 
                                weight: isActive ? 6 : 4, // Make active segment slightly bolder for a clearer visual cue
                                opacity: isActive ? 1.0 : 0.6 
                            }} 
                        >
                            <Popup>
                                <div style={{ fontFamily: 'sans-serif', fontSize: '12px' }}>
                                    <strong style={{ color: isActive ? '#3b82f6' : '#10b981' }}>{segmentName}</strong>
                                    <br />
                                    <span>Status: {isActive ? "Active Monitoring Target" : "Idle System Background"}</span>
                                    <br />
                                    {isActive && `Simulated Pressure: ${pressure !== null ? `${pressure.toFixed(2)} bar` : 'N/A'}`}
                                </div>
                            </Popup>
                        </Polyline>
                    );
                })}

                {/* Render Station Overlays */}
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