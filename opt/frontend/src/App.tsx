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

  // UI state for collapse panels
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  // Track selected active compressor station segment (e.g., 0 for Source -> CS1)
  const [selectedSegmentIdx, setSelectedSegmentIdx] = useState<number>(0); 

  // Network infrastructure states
  const [pipelinePoints, setPipelinePoints] = useState<PipelinePoint[]>([]);
  const [compressorStations, setCompressorStations] = useState<CompressorStation[]>([]);

  // Simulation prediction metrics
  const [prediction, setPrediction] = useState<number | null>(null);
  const [threshold] = useState(140);

  // Fetch pipeline structure from backend
  useEffect(() => {
    fetch('http://localhost:8000/api/pipeline-path')
      .then(res => res.json())
      .then((data: { points: PipelinePoint[]; stations: CompressorStation[] }) => {
        setPipelinePoints(data.points || []);
        setCompressorStations(data.stations || []);
      })
      .catch(err => console.error("Failed to fetch pipeline data:", err));
  }, []);

  // Run predictive dynamic ML evaluation engine
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

  return (
    <div className="dashboard-container" style={{ position: 'relative', width: '100vw', height: '100vh', backgroundColor: '#0f172a', color: 'white', fontFamily: 'sans-serif', overflow: 'hidden' }}>
      
      {/* BACKGROUND LEAFLET MAP VIEWPORT */}
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
          activeSegmentIndex={selectedSegmentIdx}
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
            ✅ Selected Segment Stable
          </div>
        )}
      </div>

      {/* QUADRATIC FLOATING PRESSURE BOX */}
      <div style={{ 
        position: 'absolute', 
        top: '90px', 
        right: '20px', 
        zIndex: 10, 
        width: '180px', 
        height: '160px', 
        background: 'rgba(15, 23, 42, 0.85)', 
        backdropFilter: 'blur(12px)', 
        border: '1px solid #334155', 
        borderRadius: '16px', 
        display: 'flex', 
        flexDirection: 'column', 
        justifyContent: 'center', // 💎 Fixed: Changed from justify-content to justifyContent
        alignItems: 'center',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
        textAlign: 'center',
        padding: '15px',
        boxSizing: 'border-box'
      }}>
        <p style={{ color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', fontSize: '0.62rem', margin: '0 0 8px 0', fontWeight: 600 }}>
          SEGMENT PRESSURE
        </p>
        <h2 style={{ fontSize: '2.2rem', fontWeight: 700, margin: 0, color: prediction && prediction > threshold ? '#ef4444' : '#10b981', lineHeight: 1 }}>
          {prediction?.toFixed(1) ?? "---"}
        </h2>
        <span style={{ fontSize: '0.9rem', color: '#64748b', marginTop: '4px', fontWeight: 500 }}>bar</span>
      </div>

      {/* CONTROL SIDEBAR CONTROL OVERLAY */}
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

        <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
          
          {/* SEGMENT SELECTION SYSTEM */}
          <div style={{ background: 'rgba(30, 41, 59, 0.5)', padding: '12px', borderRadius: '10px', border: '1px solid #1e293b', marginBottom: '20px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#94a3b8', fontSize: '0.8rem', marginBottom: '10px', fontWeight: 600 }}>
              <ArrowRightLeft size={14} /> Active Simulation Segment
            </label>
            
            <select
              value={selectedSegmentIdx}
              onChange={(e) => setSelectedSegmentIdx(parseInt(e.target.value))}
              style={{
                width: '100%',
                background: '#020617',
                border: '1px solid #334155',
                borderRadius: '6px',
                padding: '8px',
                color: 'white',
                fontSize: '0.85rem',
                cursor: 'pointer',
                outline: 'none'
              }}
            >
              {compressorStations.length > 0 ? (
                Array.from({ length: compressorStations.length + 1 }).map((_, idx) => {
                  let segmentLabel = "";
                  if (idx === 0) {
                    segmentLabel = `Source to Station #1`;
                  } else if (idx === compressorStations.length) {
                    segmentLabel = `Station #${idx} to Destination Terminal`;
                  } else {
                    segmentLabel = `Station #${idx} to Station #${idx + 1}`;
                  }
                  return (
                    <option key={`seg-opt-${idx}`} value={idx}>
                      {segmentLabel}
                    </option>
                  );
                })
              ) : (
                <option value={0}>Loading infrastructure paths...</option>
              )}
            </select>
          </div>

          {/* TELEMETRY ENGINE CONTROL FIELDS */}
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