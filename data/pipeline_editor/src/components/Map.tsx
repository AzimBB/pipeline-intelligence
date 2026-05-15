import React, { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, CircleMarker, useMapEvents, Rectangle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { MapData, Element } from './MapData.ts';

// --- Leaflet Icon Fix ---
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
let DefaultIcon = L.icon({
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

interface EditorProps { initialData: MapData; }

const InvalidateMap = () => {
    const map = useMap();
    useEffect(() => { map.invalidateSize(); }, [map]);
    return null;
};

const PipelineEditor = ({ initialData }: EditorProps) => {
    const [data, setData] = useState<MapData>(initialData);
    const [selectedWayId, setSelectedWayId] = useState<number | null>(null);

    const [mousePos, setMousePos] = useState<L.LatLng | null>(null);
    
    // Modes
    const [isMergeMode, setIsMergeMode] = useState(false);
    const [isMoveMode, setIsMoveMode] = useState(false);
    const [isReverseMode, setIsReverseMode] = useState(false);
    const [isStationMode, setIsStationMode] = useState(false);
    
    // Tools State
    const [mergeSelection, setMergeSelection] = useState<number[]>([]);
    const [stationSelection, setStationSelection] = useState<{wayId: number, indices: number[]}>({ wayId: -1, indices: [] });
    const [selectionBounds, setSelectionBounds] = useState<L.LatLngBounds | null>(null);
    const [isSelecting, setIsSelecting] = useState(false);
    const [startPos, setStartPos] = useState<L.LatLng | null>(null);

    // --- Core Actions ---

    const saveJson = () => {
        const jsonString = JSON.stringify(data, null, 4);
        const blob = new Blob([jsonString], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "updated_pipeline.json";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const reverseWay = (id: number) => {
        setData(prev => ({
            ...prev,
            elements: prev.elements.map(el => {
                if (el.id === id) {
                    const reversedGeometry = [...el.geometry].reverse();
                    const updatedElement: Element = { ...el, geometry: reversedGeometry };
                    if (el.nodes) updatedElement.nodes = [...el.nodes].reverse();
                    return updatedElement;
                }
                return el;
            })
        }));
    };

    const deleteWay = (id: number) => {
        setData(prev => ({ ...prev, elements: prev.elements.filter(el => el.id !== id) }));
        if (selectedWayId === id) setSelectedWayId(null);
    };

    const updateNodePosition = (wayId: number, index: number, latlng: L.LatLng) => {
        setData(prev => ({
            ...prev,
            elements: prev.elements.map(el => {
                if (el.id === wayId) {
                    const newGeo = [...el.geometry];
                    newGeo[index] = { lat: latlng.lat, lon: latlng.lng };
                    return { ...el, geometry: newGeo };
                }
                return el;
            })
        }));
    };

    const executeMerge = () => {
        if (mergeSelection.length !== 2) return;
        setData(prev => {
            const a = prev.elements.find(el => el.id === mergeSelection[0]);
            const b = prev.elements.find(el => el.id === mergeSelection[1]);
            if (!a || !b) return prev;
            const mergedElement: Element = {
                ...a,
                id: Date.now(),
                geometry: [...a.geometry, ...b.geometry],
                nodes: [...(a.nodes || []), ...(b.nodes || [])]
            };
            return { ...prev, elements: [...prev.elements.filter(el => el.id !== a.id && el.id !== b.id), mergedElement] };
        });
        setMergeSelection([]);
        setIsMergeMode(false);
    };

    const executeMarkStation = () => {
        if (stationSelection.indices.length !== 2) return;
        setData(prev => ({
            ...prev,
            elements: prev.elements.map(el => {
                if (el.id === stationSelection.wayId) {
                    const sortedIndices = [...stationSelection.indices].sort((a, b) => a - b);
                    return {
                        ...el,
                        tags: { 
                            ...el.tags, 
                            [`station_range_${sortedIndices[0]}_${sortedIndices[1]}`]: "compressor_station" 
                        }
                    };
                }
                return el;
            })
        }));
        setStationSelection({ wayId: -1, indices: [] });
        setIsStationMode(false);
    };

    const MapEvents = () => {
        const map = useMapEvents({
            mousedown(e) {
                if (e.originalEvent.shiftKey) {
                    map.dragging.disable();
                    setIsSelecting(true);
                    setStartPos(e.latlng);
                }
            },
            mousemove(e) {
                // Update mouse position state
                setMousePos(e.latlng);
                
                if (isSelecting && startPos) {
                    setSelectionBounds(L.latLngBounds(startPos, e.latlng));
                }
            },
            mouseup() {
                if (isSelecting) {
                    if (selectionBounds) {
                        setData(prev => ({
                            ...prev,
                            elements: prev.elements
                                .map(el => ({ ...el, geometry: el.geometry.filter(p => !selectionBounds.contains(L.latLng(p.lat, p.lon))) }))
                                .filter(el => el.geometry.length > 0)
                        }));
                    }
                    setIsSelecting(false); setStartPos(null); setSelectionBounds(null); map.dragging.enable();
                }
            },
            click(e) {
                if (selectedWayId && !isMergeMode && !isMoveMode && !isReverseMode && !isStationMode && !e.originalEvent.shiftKey) {
                    setData(prev => ({
                        ...prev,
                        elements: prev.elements.map(el => 
                            el.id === selectedWayId ? { ...el, geometry: [...el.geometry, { lat: e.latlng.lat, lon: e.latlng.lng }] } : el
                        )
                    }));
                }
            }
        });

        useEffect(() => {
            const handleKey = (e: KeyboardEvent) => {
                if (selectedWayId && (e.key === 'Delete' || e.key === 'Backspace')) deleteWay(selectedWayId);
            };
            window.addEventListener('keydown', handleKey);
            return () => window.removeEventListener('keydown', handleKey);
        }, [selectedWayId]);

        return null;
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
            <div className="toolbar" style={{ padding: '10px', background: '#2c3e50', color: 'white', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <button onClick={saveJson} style={{ background: '#27ae60' }}>💾 Save</button>
                <div style={{ height: '24px', width: '1px', background: '#ecf0f1' }} />
                
                <button onClick={() => { setIsMergeMode(!isMergeMode); setIsMoveMode(false); setIsReverseMode(false); setIsStationMode(false); }} 
                        style={{ background: isMergeMode ? '#f1c40f' : '#7f8c8d', color: 'black' }}>
                    {isMergeMode ? "🚫 Exit Merge" : "🔗 Merge Mode"}
                </button>
                
                <button onClick={() => { setIsMoveMode(!isMoveMode); setIsMergeMode(false); setIsReverseMode(false); setIsStationMode(false); }}
                        style={{ background: isMoveMode ? '#e67e22' : '#7f8c8d' }}>
                    {isMoveMode ? "🎯 Stop Moving" : "🏗️ Move Mode"}
                </button>

                <button onClick={() => { setIsReverseMode(!isReverseMode); setIsMergeMode(false); setIsMoveMode(false); setIsStationMode(false); }}
                        style={{ background: isReverseMode ? '#9b59b6' : '#7f8c8d' }}>
                    {isReverseMode ? "🛑 Stop Reversing" : "🔄 Reverse Mode"}
                </button>

                <button onClick={() => { setIsStationMode(!isStationMode); setIsMergeMode(false); setIsMoveMode(false); setIsReverseMode(false); }}
                        style={{ background: isStationMode ? '#1abc9c' : '#7f8c8d' }}>
                    {isStationMode ? "🚫 Exit Station" : "🏭 Station Mode"}
                </button>

                {isMergeMode && <button disabled={mergeSelection.length !== 2} onClick={executeMerge} style={{ background: '#2980b9' }}>Merge ({mergeSelection.length}/2)</button>}
                
                {isStationMode && <button disabled={stationSelection.indices.length !== 2} onClick={executeMarkStation} style={{ background: '#16a085' }}>Confirm Station ({stationSelection.indices.length}/2)</button>}

                <div style={{ fontSize: '12px', flexGrow: 1, textAlign: 'right' }}>
                    {isStationMode ? "Select 2 points to mark a Compressor Station." : `Selected: ${selectedWayId || "None"}`}
                </div>
            </div>

            <MapContainer center={[41.65, 68.04]} zoom={15} style={{ flex: 1 }}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <InvalidateMap /><MapEvents />

                {mousePos && (
                    <div style={{
                        position: 'absolute',
                        bottom: '20px',
                        left: '20px',
                        background: 'rgba(0, 0, 0, 0.7)',
                        color: 'white',
                        padding: '5px 10px',
                        borderRadius: '4px',
                        zIndex: 1000,
                        fontSize: '12px',
                        pointerEvents: 'none', // Critical: allows clicking "through" the label
                        fontFamily: 'monospace'
                    }}>
                        Lat: {mousePos.lat.toFixed(6)} | Lon: {mousePos.lng.toFixed(6)}
                    </div>
                )}
                {selectionBounds && <Rectangle bounds={selectionBounds} pathOptions={{ color: 'red', fillOpacity: 0.1, weight: 1 }} />}

                {data.elements.map((way) => {
                    if (!way.geometry || way.geometry.length === 0) return null;
                    const isSelected = selectedWayId === way.id || mergeSelection.includes(way.id);
                    const isStationWay = stationSelection.wayId === way.id;
                    const start = way.geometry[0];
                    const end = way.geometry[way.geometry.length - 1];

                    return (
                        <React.Fragment key={way.id}>
                            <Polyline
                                positions={way.geometry.map(g => [g.lat, g.lon])}
                                pathOptions={{ 
                                    color: mergeSelection.includes(way.id) ? '#f1c40f' : (selectedWayId === way.id ? '#e74c3c' : '#3498db'),
                                    weight: isSelected ? 6 : 4,
                                    dashArray: (isMergeMode || isReverseMode || isStationMode) ? '5, 10' : ''
                                }}
                                eventHandlers={{
                                    click: (e) => {
                                        L.DomEvent.stopPropagation(e);
                                        if (isMergeMode) setMergeSelection(prev => prev.includes(way.id) ? prev.filter(i => i !== way.id) : [...prev.slice(-1), way.id]);
                                        else if (isReverseMode) reverseWay(way.id);
                                        else if (!isStationMode) setSelectedWayId(way.id);
                                    },
                                    contextmenu: () => deleteWay(way.id)
                                }}
                            />
                            
                            {/* Direction/Station indicators */}
                            {(isMergeMode || isReverseMode || (isMoveMode && isSelected) || isStationMode) && (
                                <>
                                    <CircleMarker center={[start.lat, start.lon]} radius={7} pathOptions={{ color: 'green', fillOpacity: 1 }} />
                                    <CircleMarker center={[end.lat, end.lon]} radius={7} pathOptions={{ color: 'red', fillOpacity: 1 }} />
                                </>
                            )}

                            {/* Node markers for Station Selection or Moving */}
                            {(selectedWayId === way.id || isMoveMode || isStationMode) && way.geometry.map((p, i) => {
                                const isNodeSelected = isStationWay && stationSelection.indices.includes(i);
                                return (
                                    <CircleMarker 
                                        key={`${way.id}-${i}`} 
                                        center={[p.lat, p.lon]}
                                        radius={isNodeSelected ? 10 : 5}
                                        pathOptions={{ color: isNodeSelected ? '#1abc9c' : '#34495e', fillOpacity: 1 }}
                                        eventHandlers={{
                                            click: (e) => {
                                                if (!isStationMode) return;
                                                L.DomEvent.stopPropagation(e);
                                                setStationSelection(prev => {
                                                    if (prev.wayId !== way.id) return { wayId: way.id, indices: [i] };
                                                    if (prev.indices.includes(i)) return { ...prev, indices: prev.indices.filter(idx => idx !== i) };
                                                    if (prev.indices.length >= 2) return { ...prev, indices: [prev.indices[1], i] };
                                                    return { ...prev, indices: [...prev.indices, i] };
                                                });
                                            }
                                        }}
                                    >
                                        {isMoveMode && (
                                            <Marker 
                                                position={[p.lat, p.lon]} 
                                                draggable={true}
                                                eventHandlers={{ dragend: (e) => updateNodePosition(way.id, i, e.target.getLatLng()) }}
                                            />
                                        )}
                                    </CircleMarker>
                                );
                            })}
                        </React.Fragment>
                    );
                })}
            </MapContainer>
        </div>
    );
};

export default PipelineEditor;