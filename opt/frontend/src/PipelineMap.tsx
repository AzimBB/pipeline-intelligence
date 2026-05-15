import { useEffect } from 'react';
import { MapContainer, TileLayer, Polyline, Popup, Marker, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

interface PipelinePoint {
    lat: number;
    lon: number;
    elevation_m?: number;
}

interface CompressorStation {
    station_index: number;
    lat: number;
    lon: number;
    distance_from_source_km: number;
    elevation_m: number;
}

interface PipelineMapProps {
    points: PipelinePoint[];
    stations: CompressorStation[];
    activePressuresGradient: number[];
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
            box-shadow: 0 0 10px rgba(59, 130, 246, 0.8);
            color: white;
            font-size: 10px;
            font-weight: bold;
            font-family: sans-serif;
        ">CS</div>
    `,
    className: 'custom-station-marker',
    iconSize: [24, 24],
    iconAnchor: [12, 12]
});

function MapViewRecenter({ points }: { points: PipelinePoint[] }) {
    const map = useMap();
    useEffect(() => {
        if (points.length > 0) {
            const bounds = L.latLngBounds(points.map(p => [p.lat, p.lon]));
            map.fitBounds(bounds, { padding: [40, 40] });
        }
    }, [points, map]);
    return null;
}

export function PipelineMap({ points, stations, activePressuresGradient }: PipelineMapProps) {
    
    /**
     * Translates bar pressure metrics linearly across a high-density 
     * smooth-spectrum multi-color color space map range.
     * 74+ Bar: Healthy Green (0, 210, 40)
     * ~62 Bar: Mid Transition Yellow/Orange (239, 210, 40)
     * <51 Bar: Warning Red Intake (239, 0, 40)
     */
    const getContinuousSpectrumColor = (bar: number): string => {
        const maxP = 74.0;
        const minP = 50.0;
        const clampedBar = Math.max(minP, Math.min(maxP, bar));
        const ratio = (clampedBar - minP) / (maxP - minP); // ratio 0.0 to 1.0

        let r = 0;
        let g = 0;
        const b = 40; // stable contrast anchor offset baseline

        if (ratio > 0.5) {
            // High bounds: Green down to Yellow/Orange
            const factor = (ratio - 0.5) * 2; // scale 0 to 1
            r = Math.floor(239 * (1 - factor));
            g = 210;
        } else {
            // Low bounds: Yellow/Orange down to Critical Red
            const factor = ratio * 2; // scale 0 to 1
            r = 239;
            g = Math.floor(210 * factor);
        }

        return `rgb(${r}, ${g}, ${b})`;
    };

    return (
        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
            
            {/* Floating Visual Spectrum Gradient Overlay Map Legend Display */}
            <div style={{ position: 'absolute', top: '24px', right: '24px', backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '14px', zIndex: 1000, color: '#f8fafc', fontSize: '0.8rem', boxShadow: '0 4px 12px rgba(0,0,0,0.5)', width: '200px' }}>
                <strong style={{ display: 'block', marginBottom: '8px', color: '#94a3b8' }}>Dynamic Loss Spectrum</strong>
                <div style={{ height: '12px', borderRadius: '4px', background: 'linear-gradient(to right, rgb(239, 0, 40), rgb(239, 210, 40), rgb(0, 210, 40))', width: '100%', marginBottom: '6px' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 'bold' }}>
                    <span style={{ color: '#ef4444' }}>50 Bar</span>
                    <span style={{ color: '#eab308' }}>62 Bar</span>
                    <span style={{ color: '#10b981' }}>74 Bar</span>
                </div>
            </div>

            <MapContainer
                center={[41.0, 71.0]}
                zoom={5}
                style={{ width: '100%', height: '100%' }}
                zoomControl={true}
            >
                {/* Standard Map Tiles */}
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <MapViewRecenter points={points} />

                {/* Sliced Path Vector Map Loop */}
                {points.map((point, index) => {
                    if (index === points.length - 1) return null;
                    
                    const nextPoint = points[index + 1];
                    const pointPressure = activePressuresGradient[index] !== undefined ? activePressuresGradient[index] : 74.0;
                    const strokeColor = getContinuousSpectrumColor(pointPressure);

                    return (
                        <Polyline
                            key={`pipe-segment-idx-${index}-${point.lat}`}
                            positions={[
                                [point.lat, point.lon],
                                [nextPoint.lat, nextPoint.lon]
                            ]}
                            pathOptions={{
                                color: strokeColor,
                                weight: 6,
                                opacity: 0.95,
                                lineCap: 'round'
                            }}
                        >
                            <Popup>
                                <div style={{ fontFamily: 'sans-serif', color: '#1e293b', fontSize: '13px' }}>
                                    <strong>Hydraulic Profile Node</strong>
                                    <hr style={{ margin: '4px 0', border: 'none', borderTop: '1px solid #e2e8f0' }} />
                                    <strong>Node Position:</strong> Index {index}<br />
                                    <strong>Pressure Metric:</strong> <span style={{ color: strokeColor, fontWeight: 'bold', background: '#0f172a', padding: '1px 4px', borderRadius: '3px' }}>{pointPressure.toFixed(2)} Bar</span><br />
                                    <strong>Elevation Profile:</strong> {point.elevation_m || 0} m
                                </div>
                            </Popup>
                        </Polyline>
                    );
                })}

                {/* Stations */}
                {stations.map((station) => (
                    <Marker
                        key={`station-node-${station.station_index}`}
                        position={[station.lat, station.lon]}
                        icon={compressorIcon}
                    >
                        <Popup>
                            <div style={{ fontFamily: 'sans-serif', fontSize: '13px', color: '#1e293b' }}>
                                <strong style={{ color: '#2563eb' }}>Compressor Station #{station.station_index}</strong>
                                <hr style={{ margin: '4px 0', border: 'none', borderTop: '1px solid #e2e8f0' }} />
                                <strong>Relative Segment Distance:</strong> {station.distance_from_source_km.toFixed(1)} km<br />
                                <strong>Altimetric Height:</strong> {station.elevation_m} m
                            </div>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>
        </div>
    );
}