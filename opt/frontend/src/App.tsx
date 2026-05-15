import { useState, useEffect } from 'react';
import { getPressurePrediction } from './api';
import { Thermometer, Sun, Wind, Clock, Map as MapIcon, ChevronLeft, ChevronRight, Sliders, ArrowRightLeft } from 'lucide-react';
import { PipelineMap } from './PipelineMap.tsx';
import 'leaflet/dist/leaflet.css';

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

function App() {
  const [inputs, setInputs] = useState({
    temperature: 15.0,
    solar_radiation: 200.0,
    flow_rate: 50.0,
    time_of_day: 12,
    day_of_year: new Date().getUTCFullYear() 
  });

  // New states for UI interactions and dynamic range selections
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [startPoint, setStartPoint] = useState<number>(0);
  const [endPoint, setEndPoint] = useState<number>(1);
  const [pipelinePoints, setPipelinePoints] = useState<PipelinePoint[]>([]);
  const [compressorStations, setCompressorStations] = useState<CompressorStation[]>([]); // New state

  const [prediction, setPrediction] = useState<number | null>(null);
  const [threshold] = useState(140);

  useEffect(() => {
  fetch('http://localhost:8000/api/pipeline-path')
    .then(res => res.json())
    .then((data: { points: PipelinePoint[]; stations: CompressorStation[] }) => {
      // Safely assign both parts of the payload to state
      const points = data.points || [];
      const stations = data.stations || [];
      
      setPipelinePoints(points);
      console.log(stations);
      setCompressorStations(stations);
      
      if (points.length > 1) {
        setEndPoint(points.length - 1);
      }
    })
    .catch(err => console.error("Failed to fetch pipeline data:", err));
}, []);



  useEffect(() => {
    const fetchData = async () => {
      const p = await getPressurePrediction(inputs);
      setPrediction(p);
    };
    fetchData();
  }, [inputs]);

  const getAlerts = () => {
    const alerts = [];
    if (prediction && prediction > threshold) alerts.push("🔴 Critical Pressure Predicted");
    if (inputs.temperature < 5 && prediction && prediction > 120) alerts.push("❄️ Hydrate Formation Risk");
    if (inputs.solar_radiation > 600 && inputs.temperature > 25) alerts.push("🌡️ Thermal Expansion Risk");
    if (inputs.flow_rate > 58) alerts.push("⚠️ High Flow Rate Detected");
    return alerts;
  };

  const activeAlerts = getAlerts();
  const maxPointIndex = pipelinePoints.length > 0 ? pipelinePoints.length - 1 : 0;

  return (
    <div className="dashboard-container" style={{ position: 'relative', width: '100vw', height: '100vh', backgroundColor: '#0f172a', color: 'white', fontFamily: 'sans-serif', overflow: 'hidden' }}>
      
      {/* BACKGROUND LEAFLET MAP VIEWPORT - Expanded full screen */}
      <div style={{ 
        position: 'absolute', 
        top: 0, 
        left: 0, 
        width: '100vw', 
        height: '100vh', 
        zIndex: 1 
      }}>
        <PipelineMap 
          points={pipelinePoints} 
          stations={compressorStations}
          pressure={prediction} 
          threshold={threshold} 
        />
      </div>

      {/* TOP HEADER STATUS OVERLAY */}
      <header style={{ position: 'absolute', top: '20px', left: '20px', right: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 10, pointerEvents: 'none' }}>
        <div style={{ pointerEvents: 'auto', background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(8px)', padding: '12px 20px', borderRadius: '12px', border: '1px solid #1e293b', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <MapIcon size={18} style={{ color: '#3b82f6' }} />
          <h1 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>AI-Powered Pipeline Intelligence System</h1>
        </div>
      </header>

      {/* ALERTS FLOATING DOCK */}
      <div style={{ position: 'absolute', bottom: '20px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '10px', zIndex: 10, maxWidth: '80%' }}>
        {activeAlerts.map((alert, i) => (
          <div key={i} style={{
            padding: '10px 16px',
            borderRadius: '8px',
            background: alert.includes('🔴') ? 'rgba(69, 10, 10, 0.9)' : 'rgba(30, 41, 59, 0.9)',
            backdropFilter: 'blur(6px)',
            border: `1px solid ${alert.includes('🔴') ? '#ef4444' : '#3b82f6'}`,
            fontSize: '0.85rem',
            color: alert.includes('🔴') ? '#fca5a5' : '#93c5fd',
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
          }}>
            {alert}
          </div>
        ))}
        {activeAlerts.length === 0 && (
          <div style={{ padding: '10px 16px', borderRadius: '8px', background: 'rgba(15, 23, 42, 0.9)', backdropFilter: 'blur(6px)', border: '1px solid #10b981', color: '#10b981', fontSize: '0.85rem', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>
            ✅ System Stable
          </div>
        )}
      </div>

      {/* QUADRATIC FLOATING PRESSURE BOX (Top-Right Metric Card) */}
      <div style={{ 
        position: 'absolute', 
        top: '90px', 
        right: '20px', 
        zIndex: 10, 
        width: '160px', 
        height: '160px', 
        background: 'rgba(15, 23, 42, 0.85)', 
        backdropFilter: 'blur(12px)', 
        border: '1px solid #334155', 
        borderRadius: '16px', 
        display: 'flex', 
        flexDirection: 'column', 
        justifyContent: 'center', 
        alignItems: 'center',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
        textAlign: 'center',
        padding: '15px',
        boxSizing: 'border-box'
      }}>
        <p style={{ color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', fontSize: '0.65rem', margin: '0 0 8px 0', fontWeight: 600 }}>
          PREDICTED PRESSURE
        </p>
        <h2 style={{ fontSize: '2.2rem', fontWeight: 700, margin: 0, color: prediction && prediction > threshold ? '#ef4444' : '#10b981', lineHeight: 1 }}>
          {prediction?.toFixed(1) ?? "---"}
        </h2>
        <span style={{ fontSize: '0.9rem', color: '#64748b', marginTop: '4px', fontWeight: 500 }}>bar</span>
      </div>

      {/* FLOATING COLLAPSABLE SIDEBAR CARD */}
      <aside style={{ 
        position: 'absolute', 
        top: '90px', 
        left: '20px', 
        bottom: '90px', 
        zIndex: 10, 
        width: '320px', 
        background: 'rgba(15, 23, 42, 0.85)', 
        backdropFilter: 'blur(12px)', 
        borderRadius: '16px', 
        border: '1px solid #1e293b', 
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.7)',
        padding: '25px',
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
        transform: isSidebarOpen ? 'translateX(0)' : 'translateX(-345px)',
        transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      }}>
        
        {/* Toggle Button for Collapse Hooked outside the container */}
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          style={{
            position: 'absolute',
            right: '-40px',
            top: '20px',
            width: '32px',
            height: '32px',
            borderRadius: '0 8px 8px 0',
            background: '#0f172a',
            border: '1px solid #1e293b',
            borderLeft: 'none',
            color: '#94a3b8',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '4px 0 10px rgba(0,0,0,0.3)'
          }}
        >
          {isSidebarOpen ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
        </button>

        <h2 style={{ fontSize: '1.1rem', margin: '0 0 20px 0', display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid #1e293b', paddingBottom: '12px' }}>
          <Sliders size={18} style={{color: '#3b82f6'}} /> Pipeline Controls
        </h2>

        {/* Scrollable controls section to prevent crop on small displays */}
        <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
          
          {/* NEW INPUT: SEGMENT POINT SELECTORS */}
          <div style={{ background: 'rgba(30, 41, 59, 0.5)', padding: '12px', borderRadius: '10px', border: '1px solid #1e293b', marginBottom: '20px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#94a3b8', fontSize: '0.8rem', marginBottom: '10px', fontWeight: 600 }}>
              <ArrowRightLeft size={14} /> Evaluation Segment
            </label>
            
            <div style={{ display: 'flex', gap: '10px', marginBottom: '8px' }}>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: '0.65rem', color: '#64748b', display: 'block' }}>START (Min: 0)</span>
                <input 
                  type="number" 
                  min="0" 
                  max={maxPointIndex}
                  value={startPoint}
                  onChange={(e) => setStartPoint(Math.max(0, Math.min(maxPointIndex, parseInt(e.target.value) || 0)))}
                  style={{ width: '100%', background: '#020617', border: '1px solid #334155', borderRadius: '6px', padding: '6px', color: 'white', fontSize: '0.85rem', marginTop: '4px' }} 
                />
              </div>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: '0.65rem', color: '#64748b', display: 'block' }}>END (Max: {maxPointIndex})</span>
                <input 
                  type="number" 
                  min="0" 
                  max={maxPointIndex}
                  value={endPoint}
                  onChange={(e) => setEndPoint(Math.max(0, Math.min(maxPointIndex, parseInt(e.target.value) || 0)))}
                  style={{ width: '100%', background: '#020617', border: '1px solid #334155', borderRadius: '6px', padding: '6px', color: 'white', fontSize: '0.85rem', marginTop: '4px' }} 
                />
              </div>
            </div>
          </div>

          {/* TELEMETRY SLIDERS */}
          <div className="input-group" style={{ marginBottom: '20px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#94a3b8', fontSize: '0.85rem', marginBottom: '8px' }}>
              <Thermometer size={16} /> Temperature ({inputs.temperature}°C)
            </label>
            <input type="range" min="-20" max="40" step="0.5" value={inputs.temperature}
              onChange={(e) => setInputs({ ...inputs, temperature: parseFloat(e.target.value) })}
              style={{ width: '100%', accentColor: '#3b82f6', cursor: 'pointer' }} />
          </div>

          <div className="input-group" style={{ marginBottom: '20px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#94a3b8', fontSize: '0.85rem', marginBottom: '8px' }}>
              <Sun size={16} /> Solar Radiation ({inputs.solar_radiation} W/m²)
            </label>
            <input type="range" min="0" max="800" step="10" value={inputs.solar_radiation}
              onChange={(e) => setInputs({ ...inputs, solar_radiation: parseFloat(e.target.value) })}
              style={{ width: '100%', accentColor: '#3b82f6', cursor: 'pointer' }} />
          </div>

          <div className="input-group" style={{ marginBottom: '20px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#94a3b8', fontSize: '0.85rem', marginBottom: '8px' }}>
              <Wind size={16} /> Flow Rate ({inputs.flow_rate} m³/s)
            </label>
            <input type="range" min="40" max="60" step="0.1" value={inputs.flow_rate}
              onChange={(e) => setInputs({ ...inputs, flow_rate: parseFloat(e.target.value) })}
              style={{ width: '100%', accentColor: '#3b82f6', cursor: 'pointer' }} />
          </div>

          <div className="input-group" style={{ marginBottom: '20px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#94a3b8', fontSize: '0.85rem', marginBottom: '8px' }}>
              <Clock size={16} /> Hour of Day ({inputs.time_of_day}:00)
            </label>
            <input type="range" min="0" max="23" step="1" value={inputs.time_of_day}
              onChange={(e) => setInputs({ ...inputs, time_of_day: parseInt(e.target.value) })}
              style={{ width: '100%', accentColor: '#3b82f6', cursor: 'pointer' }} />
          </div>

        </div>
      </aside>
    </div>
  );
}

export default App;