import { useEffect } from 'react';
import { MapContainer, TileLayer, Polyline, Popup, Marker, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L, { type LatLngExpression } from 'leaflet';

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
    // FIXED: Changed from PipelinePoint[] to PipelinePoint to match your actual data shape
    allSegmentsGeometry: Record<string, PipelinePoint[]>; 
    currentSegmentId: string; 
    ambientTemp: number;
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

export function PipelineMap({ points, stations, activePressuresGradient, allSegmentsGeometry, currentSegmentId, ambientTemp }: PipelineMapProps) {
    
    useEffect(() => {
        const styleId = "leaflet-pulsing-crystal-waves";
        if (!document.getElementById(styleId)) {
            const styleNode = document.createElement("style");
            styleNode.id = styleId;
            styleNode.innerHTML = `
                @keyframes strokePulseWave {
                    0% { stroke-dashoffset: 40; stroke-opacity: 0.4; }
                    50% { stroke-dashoffset: 20; stroke-opacity: 1.0; stroke-width: 8px; }
                    100% { stroke-dashoffset: 0; stroke-opacity: 0.4; }
                }
                .crystal-active-wave {
                    animation: strokePulseWave 1.8s linear infinite !important;
                }
            `;
            document.head.appendChild(styleNode);
        }
    }, []);

    const getContinuousSpectrumColor = (bar: number): string => {
        const maxP = 74.0;
        const minP = 50.0;
        const clampedBar = Math.max(minP, Math.min(maxP, bar));
        const ratio = (clampedBar - minP) / (maxP - minP); 

        let r = 0;
        let g = 0;
        if (ratio > 0.5) {
            r = Math.floor(239 * (1 - (ratio - 0.5) * 2));
            g = 210;
        } else {
            r = 239;
            g = Math.floor(210 * (ratio * 2));
        }
        return `rgb(${r}, ${g}, 40)`;
    };

    const isCrystalFormationRisk = (pressureBar: number): boolean => {
        return pressureBar > 58.0 && ambientTemp < 10.0;
    };

    return (
        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
            
            {/* Visual Dashboard Map Legend Panel Overlay */}
            <div style={{ position: 'absolute', top: '24px', right: '24px', backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', padding: '14px', zIndex: 1000, color: '#f8fafc', fontSize: '0.8rem', boxShadow: '0 4px 12px rgba(0,0,0,0.5)', width: '220px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div>
                    <strong style={{ display: 'block', marginBottom: '6px', color: '#94a3b8' }}>Active Fluid Spectrum</strong>
                    <div style={{ height: '12px', borderRadius: '4px', background: 'linear-gradient(to right, rgb(239, 0, 40), rgb(239, 210, 40), rgb(0, 210, 40))', width: '100%', marginBottom: '4px' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem' }}>
                        <span>50 Bar</span> <span>62 Bar</span> <span>74 Bar</span>
                    </div>
                </div>
                
                <hr style={{ border: 'none', borderTop: '1px solid #334155', margin: '4px 0' }} />
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '25px', height: '5px', borderRadius: '2px', backgroundColor: '#00ffff', border: '2px dashed #ffffff' }} />
                        <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#00ffff' }}>Crystal Risk Wave</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '25px', height: '4px', borderRadius: '2px', backgroundColor: '#475569' }} />
                        <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Inactive Segments (Gray)</span>
                    </div>
                </div>
            </div>

            <MapContainer
                center={[41.0, 71.0]}
                zoom={5}
                style={{ width: '100%', height: '100%' }}
                zoomControl={true}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <MapViewRecenter points={points} />


                {/* LAYER 1: Draw ALL INACTIVE SEGMENTS in uniform deep gray lines */}
                {(() => {
                    // 1. Create a Quick-lookup Set of your active coordinates
                    const activePointsSet = new Set(points.map(p => `${p.lat.toFixed(6)},${p.lon.toFixed(6)}`));

                    // 2. Separate points into continuous groups (arrays of paths)
                    const polylineGroups: LatLngExpression[][] = [];
                    let currentGroup: LatLngExpression[] = [];

                    // Convert entries to an array sorted by their key/index to ensure sequential order
                    const sortedEntries = Object.entries(allSegmentsGeometry).sort(
                        (a, b) => Number(a[0].replace(/\D/g, '')) - Number(b[0].replace(/\D/g, ''))
                    );

                    for (const [segId, pointData] of sortedEntries) {
                        const isIdMatch = segId === currentSegmentId || segId === String(currentSegmentId);

                        // If it's part of the active segment, hit a boundary gap!
                        if (isIdMatch) {
                            if (currentGroup.length >= 2) {
                                polylineGroups.push(currentGroup);
                            }
                            currentGroup = []; // Reset and skip this point to create the gap
                            continue;
                        }

                        // SAFE NORMALIZATION: Tell TypeScript this can be an array OR a single point object safely
                        const pointsArray: PipelinePoint[] = Array.isArray(pointData) ? pointData : [pointData as unknown as PipelinePoint];

                        // Process each individual point item safely
                        for (const point of pointsArray) {
                            if (!point || typeof point.lat !== 'number' || typeof point.lon !== 'number') {
                                continue;
                            }

                            const pointKey = `${point.lat.toFixed(6)},${point.lon.toFixed(6)}`;
                            const isCoordinateMatch = activePointsSet.has(pointKey);

                            if (isCoordinateMatch) {
                                if (currentGroup.length >= 2) {
                                    polylineGroups.push(currentGroup);
                                }
                                currentGroup = []; 
                                continue;
                            }

                            // Correctly references individual point metrics without breaking compiler conditions
                            currentGroup.push([point.lat, point.lon] as [number, number]);
                        }
                    }

                    // Don't forget to push the final group if it has valid line segments left over
                    if (currentGroup.length >= 2) {
                        polylineGroups.push(currentGroup);
                    }

                    if (polylineGroups.length === 0) return null;

                    // 3. Render each continuous background segment independently
                    return (
                        <>
                            {polylineGroups.map((groupPoints, groupIndex) => (
                                <Polyline
                                    key={`inactive-group-${groupIndex}-${currentSegmentId}`}
                                    positions={groupPoints}
                                    pathOptions={{
                                        color: '#475569', 
                                        weight: 4,
                                        opacity: 0.60
                                    }}
                                />
                            ))}
                        </>
                    );
                })()}

                {/* LAYER 2: Draw the ACTIVE SELECTED SIMULATED GRADIENT segment */}
                {points.map((point, index) => {
                    if (index === points.length - 1) return null;
                    
                    const nextPoint = points[index + 1];
                    const pointPressure = activePressuresGradient[index] !== undefined ? activePressuresGradient[index] : 74.0;
                    const strokeColor = getContinuousSpectrumColor(pointPressure);
                    const hasCrystalRisk = isCrystalFormationRisk(pointPressure);

                    return (
                        <div key={`active-link-node-${index}`}>
                            <Polyline
                                positions={[
                                    [point.lat, point.lon],
                                    [nextPoint.lat, nextPoint.lon]
                                ]}
                                pathOptions={{
                                    color: strokeColor,
                                    weight: 7,
                                    opacity: 1.0,
                                    lineCap: 'round'
                                }}
                            >
                                <Popup>
                                    <div style={{ fontFamily: 'sans-serif', color: '#1e293b', fontSize: '13px' }}>
                                        <strong style={{ textTransform: 'uppercase', color: '#64748b', fontSize: '10px' }}>Active Path: {currentSegmentId}</strong>
                                        <hr style={{ margin: '4px 0', border: 'none', borderTop: '1px solid #e2e8f0' }} />
                                        <strong>Pressure Node:</strong> {pointPressure.toFixed(2)} Bar<br />
                                        <strong>Temperature context:</strong> {ambientTemp.toFixed(1)} °C<br />
                                        <strong>Crystal Formation:</strong> {hasCrystalRisk ? <span style={{ color: '#00ffff', fontWeight: 'bold' }}>RISK ENCOUNTERED</span> : 'Normal flow'}
                                    </div>
                                </Popup>
                            </Polyline>

                            {/* LAYER 3: Overlaying animated Wave Overlay */}
                            {hasCrystalRisk && (
                                <Polyline
                                    positions={[
                                        [point.lat, point.lon],
                                        [nextPoint.lat, nextPoint.lon]
                                    ]}
                                    pathOptions={{
                                        color: '#00ffff', 
                                        weight: 8,
                                        dashArray: '8, 12',
                                        className: 'crystal-active-wave' 
                                    }}
                                />
                            )}
                        </div>
                    );
                })}

                {/* Compressor Stations Map Icons Nodes */}
                {stations.map((station) => (
                    <Marker
                        key={`station-node-${station.station_index}`}
                        position={[station.lat, station.lon]}
                        icon={compressorIcon}
                    >
                        <Popup>
                            <div style={{ fontFamily: 'sans-serif', fontSize: '13px', color: '#1e293b' }}>
                                <strong>Compressor Station #{station.station_index}</strong>
                                <hr style={{ margin: '4px 0', border: 'none', borderTop: '1px solid #e2e8f0' }} />
                                <strong>Station Distance Position:</strong> {station.distance_from_source_km.toFixed(1)} km<br />
                                <strong>Altimetric Height:</strong> {station.elevation_m} m
                            </div>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>
        </div>
    );
}