import { useState, useEffect } from 'react';
import { getPressurePrediction } from './api';
import { Thermometer, Sun, Wind, Clock } from 'lucide-react';
import { Canvas } from '@react-three/fiber';
import { Pipeline3D } from './Pipeline3D.tsx';

function App() {
  const [inputs, setInputs] = useState({
    temperature: 15.0,
    solar_radiation: 200.0,
    flow_rate: 50.0,
    time_of_day: 12,
    day_of_year: new Date().getUTCFullYear() // Keep this automated as in your original logic
  });

  const [prediction, setPrediction] = useState<number | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const p = await getPressurePrediction(inputs);
      setPrediction(p);
    };
    fetchData();
  }, [inputs]);

  return (
    <div className="dashboard-container" style={{ display: 'flex', height: '100vh', backgroundColor: '#0f172a', color: 'white' }}>

      {/* SIDEBAR: INPUT PARAMETERS */}
      <aside style={{ width: '320px', padding: '25px', borderRight: '1px solid #1e293b', background: '#0f172a' }}>
        <h2 style={{ fontSize: '1.2rem', marginBottom: '20px' }}>Pipeline Controls 🎛️</h2>

        {/* TEMPERATURE */}
        <div className="input-group" style={{ marginBottom: '20px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#94a3b8', marginBottom: '8px' }}>
            <Thermometer size={16} /> Temperature ({inputs.temperature}°C)
          </label>
          <input type="range" min="-20" max="40" step="0.5" value={inputs.temperature}
            onChange={(e) => setInputs({ ...inputs, temperature: parseFloat(e.target.value) })}
            style={{ width: '100%', accentColor: '#3b82f6' }} />
        </div>

        {/* SOLAR RADIATION */}
        <div className="input-group" style={{ marginBottom: '20px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#94a3b8', marginBottom: '8px' }}>
            <Sun size={16} /> Solar Radiation ({inputs.solar_radiation} W/m²)
          </label>
          <input type="range" min="0" max="800" step="10" value={inputs.solar_radiation}
            onChange={(e) => setInputs({ ...inputs, solar_radiation: parseFloat(e.target.value) })}
            style={{ width: '100%', accentColor: '#3b82f6' }} />
        </div>

        {/* FLOW RATE */}
        <div className="input-group" style={{ marginBottom: '20px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#94a3b8', marginBottom: '8px' }}>
            <Wind size={16} /> Flow Rate ({inputs.flow_rate} m³/s)
          </label>
          <input type="range" min="40" max="60" step="0.1" value={inputs.flow_rate}
            onChange={(e) => setInputs({ ...inputs, flow_rate: parseFloat(e.target.value) })}
            style={{ width: '100%', accentColor: '#3b82f6' }} />
        </div>

        {/* TIME OF DAY */}
        <div className="input-group" style={{ marginBottom: '20px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#94a3b8', marginBottom: '8px' }}>
            <Clock size={16} /> Hour of Day ({inputs.time_of_day}:00)
          </label>
          <input type="range" min="0" max="23" step="1" value={inputs.time_of_day}
            onChange={(e) => setInputs({ ...inputs, time_of_day: parseInt(e.target.value) })}
            style={{ width: '100%', accentColor: '#3b82f6' }} />
        </div>
      </aside>

      {/* MAIN VIEWPORT */}
      <main style={{ flex: 1, padding: '30px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ margin: 0, fontSize: '1.5rem' }}>Network Intelligence Dashboard</h1>
          <div style={{ padding: '8px 16px', background: '#1e293b', borderRadius: '20px', fontSize: '0.8rem', color: '#60a5fa', border: '1px solid #3b82f6' }}>
            System Status: Operational
          </div>
        </div>

        {/* PRIMARY METRIC */}
        <div style={{ background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', padding: '30px', borderRadius: '16px', border: '1px solid #334155' }}>
          <p style={{ color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', fontSize: '0.75rem', marginBottom: '10px' }}>Real-time Pressure Prediction</p>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
            <h2 style={{ fontSize: '3rem', margin: 0, color: prediction && prediction > 140 ? '#ef4444' : '#10b981' }}>
              {prediction?.toFixed(2) ?? "---"}
            </h2>
            <span style={{ fontSize: '1.2rem', color: '#64748b' }}>bar</span>
          </div>
        </div>

        {/* 3D VIEWPORT PLACEHOLDER */}
        <div id="canvas-container" style={{ flex: 1, background: '#020617', borderRadius: '16px', border: '1px solid #1e293b', overflow: 'hidden', position: 'relative' }}>
          {/* We will initialize Three.js here */}
          <div style={{ position: 'absolute', top: '20px', left: '20px', color: '#475569', fontSize: '0.8rem' }}>
            <div id="canvas-container" style={{ flex: 1, background: '#020617', borderRadius: '16px', border: '1px solid #1e293b', overflow: 'hidden', position: 'relative' }}>
              <Canvas>
                <Pipeline3D pressure={prediction} />
              </Canvas>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;