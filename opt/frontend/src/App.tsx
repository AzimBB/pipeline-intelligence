import { useState, useEffect, useRef } from 'react';
import { Thermometer, Sun, Wind, Clock, Map as MapIcon, Sliders, Play, Pause, Calendar } from 'lucide-react';
import { PipelineMap } from './PipelineMap.tsx';
import 'leaflet/dist/leaflet.css';

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

interface TimelineFrame {
  timestamp: string;
  solar_radiation: number;
  ambient_temperature: number;
  discharge_pressure: number;
  pressures_gradient: number[];
}

interface SimulationResponse {
  segment_id: string;
  total_frames: number;
  geometry: PipelinePoint[];
  timeline: TimelineFrame[];
}

function App() {
  const [startDate, setStartDate] = useState("2026-05-05");
  const [endDate, setEndDate] = useState("2026-05-06");
  const [selectedSegmentIdx, setSelectedSegmentIdx] = useState<number>(1); 

  const [masterStations, setMasterStations] = useState<CompressorStation[]>([]);
  const [simulationData, setSimulationData] = useState<SimulationResponse | null>(null);
  const [currentFrameIdx, setCurrentFrameIdx] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Hover Tooltip States for Video Scrub Bar
  const [hoverText, setHoverText] = useState<string>("");
  const [hoverLeft, setHoverLeft] = useState<number>(0);
  const [showTooltip, setShowTooltip] = useState<boolean>(false);
  const sliderRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/pipeline-path")
      .then((res) => res.json())
      .then((data) => {
        if (data.stations) setMasterStations(data.stations);
      })
      .catch((err) => console.error("Error connecting to backend mapping core:", err));
  }, []);

  useEffect(() => {
    setIsLoading(true);
    setIsPlaying(false);
    setCurrentFrameIdx(0);

    fetch("http://127.0.0.1:8000/api/pipeline/simulate-segment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        segment_id: `segment_${selectedSegmentIdx}`,
        start_date: startDate,
        end_date: endDate,
      }),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Simulation endpoint failure.");
        return res.json();
      })
      .then((data: SimulationResponse) => {
        setSimulationData(data);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setIsLoading(false);
      });
  }, [selectedSegmentIdx, startDate, endDate]);

  useEffect(() => {
    let interval: any = null;
    if (isPlaying && simulationData) {
      interval = setInterval(() => {
        setCurrentFrameIdx((prevIdx) => {
          if (prevIdx >= simulationData.timeline.length - 1) {
            return 0; 
          }
          return prevIdx + 1;
        });
      }, 300); // 300ms playback steps
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isPlaying, simulationData]);

  const activeFrame: TimelineFrame | null = simulationData ? simulationData.timeline[currentFrameIdx] : null;

  // Handle Video-style timeline hover calculations
  const handleSliderMouseMove = (e: React.MouseEvent<HTMLInputElement>) => {
    if (!simulationData || !sliderRef.current) return;
    
    const rect = sliderRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left; // pixel x relative to slider bounds
    const percentage = Math.max(0, Math.min(1, x / rect.width));
    
    const targetFrameIdx = Math.round(percentage * (simulationData.timeline.length - 1));
    const targetFrame = simulationData.timeline[targetFrameIdx];
    
    if (targetFrame) {
      const dateString = new Date(targetFrame.timestamp).toLocaleString([], {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
      });
      setHoverText(dateString);
      setHoverLeft(e.clientX - rect.left);
    }
  };

  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh', backgroundColor: '#0f172a', color: '#f8fafc', overflow: 'hidden', fontFamily: 'sans-serif' }}>
      
      {/* Sidebar Controls */}
      <div style={{ width: '360px', backgroundColor: '#1e293b', borderRight: '1px solid #334155', display: 'flex', flexDirection: 'column', padding: '24px', boxSizing: 'border-box', zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
          <MapIcon size={24} style={{ color: '#3b82f6' }} />
          <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 600 }}>CACGP Digital Twin</h2>
        </div>

        {/* Segment Routing Switcher */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#94a3b8', fontSize: '0.85rem', marginBottom: '8px' }}>
            <Sliders size={16} /> Analysis Boundary
          </label>
          <select 
            value={selectedSegmentIdx} 
            onChange={(e) => setSelectedSegmentIdx(parseInt(e.target.value))}
            style={{ width: '100%', padding: '10px', borderRadius: '6px', backgroundColor: '#0f172a', color: '#f8fafc', border: '1px solid #334155', outline: 'none', cursor: 'pointer' }}
          >
            {[1, 2, 3, 4, 5, 6].map((idx) => (
              <option key={idx} value={idx}>Segment {idx}: Station {idx} → Station {idx + 1}</option>
            ))}
          </select>
        </div>

        {/* Window Parameters */}
        <div style={{ marginBottom: '24px', display: 'flex', gap: '12px' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94a3b8', fontSize: '0.80rem', marginBottom: '6px' }}>
              <Calendar size={14} /> Start Window
            </label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', backgroundColor: '#0f172a', color: '#f8fafc', border: '1px solid #334155', fontSize: '0.85rem' }} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94a3b8', fontSize: '0.80rem', marginBottom: '6px' }}>
              <Calendar size={14} /> End Window
            </label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', backgroundColor: '#0f172a', color: '#f8fafc', border: '1px solid #334155', fontSize: '0.85rem' }} />
          </div>
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid #334155', margin: '0 0 20px 0' }} />

        {/* Live Monitoring Dashboard Metadata telemetry readings */}
        <h3 style={{ fontSize: '0.85rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 16px 0' }}>SCADA Video Analytics</h3>
        
        {isLoading ? (
          <div style={{ color: '#94a3b8', fontSize: '0.9rem', textAlign: 'center', margin: '20px 0' }}>Syncing telemetry record feeds...</div>
        ) : activeFrame ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', flexGrow: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', padding: '12px', backgroundColor: '#0f172a', borderRadius: '8px', gap: '12px' }}>
              <Clock style={{ color: '#a855f7' }} size={18} />
              <div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Video Frame Timestamp</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{new Date(activeFrame.timestamp).toLocaleString()}</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', padding: '12px', backgroundColor: '#0f172a', borderRadius: '8px', gap: '12px' }}>
              <Sun style={{ color: '#eab308' }} size={18} />
              <div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Solar Heating Load</div>
                <div style={{ fontSize: '1rem', fontWeight: 600, color: '#facc15' }}>{activeFrame.solar_radiation} W/m²</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', padding: '12px', backgroundColor: '#0f172a', borderRadius: '8px', gap: '12px' }}>
              <Thermometer style={{ color: '#ef4444' }} size={18} />
              <div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Environmental Temperature</div>
                <div style={{ fontSize: '1rem', fontWeight: 600 }}>{activeFrame.ambient_temperature} °C</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', padding: '12px', backgroundColor: '#0f172a', borderRadius: '8px', gap: '12px' }}>
              <Wind style={{ color: '#10b981' }} size={18} />
              <div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Discharge Injection Rate</div>
                <div style={{ fontSize: '1rem', fontWeight: 600, color: '#34d399' }}>{activeFrame.discharge_pressure} Bar</div>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ color: '#64748b', fontSize: '0.9rem', textAlign: 'center', margin: '20px 0' }}>Choose active window logs.</div>
        )}
      </div>

      {/* Main Map + Video Control Bar Structure Layout Area */}
      <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
        
        {/* Map Window Canvas */}
        <div style={{ flexGrow: 1, width: '100%', position: 'relative' }}>
          <PipelineMap 
            points={simulationData?.geometry || []} 
            stations={masterStations}
            activePressuresGradient={activeFrame?.pressures_gradient || []}
          />
        </div>

        {/* Video Player Control Toolbar Base Bar */}
        <div style={{ height: '72px', backgroundColor: '#1e293b', borderTop: '1px solid #334155', display: 'flex', alignItems: 'center', padding: '0 24px', gap: '20px', boxSizing: 'border-box', position: 'relative' }}>
          
          {/* Media Engine Play/Pause Trigger Toggle */}
          <button 
            disabled={!simulationData || isLoading}
            onClick={() => setIsPlaying(!isPlaying)}
            style={{ 
              backgroundColor: isPlaying ? '#ef4444' : '#10b981', 
              color: 'white', 
              border: 'none', 
              borderRadius: '50%', 
              width: '42px', 
              height: '42px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              cursor: (isLoading || !simulationData) ? 'not-allowed' : 'pointer',
              boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
              flexShrink: 0,
              opacity: (isLoading || !simulationData) ? 0.5 : 1
            }}
          >
            {isPlaying ? <Pause size={18} fill="white" /> : <Play size={18} fill="white" style={{ marginLeft: '2px' }} />}
          </button>

          {/* Timeline Video Player Scrub Track container slider box */}
          <div style={{ flexGrow: 1, position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            
            {/* Hover Tooltip Popup Overlay Box */}
            {showTooltip && simulationData && (
              <div style={{
                position: 'absolute',
                bottom: '48px',
                left: `${hoverLeft}px`,
                transform: 'translateX(-50%)',
                backgroundColor: '#3b82f6',
                color: '#ffffff',
                padding: '5px 10px',
                borderRadius: '4px',
                fontSize: '0.75rem',
                fontWeight: 'bold',
                whiteSpace: 'nowrap',
                pointerEvents: 'none',
                boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
                zIndex: 9999
              }}>
                {hoverText}
              </div>
            )}

            {/* Range Track Slider input object element mapping */}
            <input 
              ref={sliderRef}
              type="range" 
              min="0" 
              max={(simulationData?.timeline.length || 1) - 1} 
              value={currentFrameIdx}
              disabled={!simulationData || isLoading}
              onChange={(e) => setCurrentFrameIdx(parseInt(e.target.value))}
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
              onMouseMove={handleSliderMouseMove}
              style={{ 
                width: '100%', 
                accentColor: '#3b82f6', 
                cursor: 'pointer',
                margin: 0
              }}
            />
            
            {/* Bottom timestamp track counter metadata label overlay elements */}
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '0.7rem', marginTop: '4px' }}>
              <span>FRAME: {currentFrameIdx + 1} / {simulationData?.timeline.length || 0}</span>
              {activeFrame && <span style={{ color: '#94a3b8', fontWeight: 'bold' }}>{new Date(activeFrame.timestamp).toLocaleTimeString()}</span>}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}

export default App;