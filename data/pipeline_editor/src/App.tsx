import './App.css';
import PipelineEditor from './components/Map.tsx';
// 1. Direct import
import pipeLineData from "../../pipeline_ready.json"; 
// 2. Import the interface for type safety
import type { MapData } from './components/MapData'; 
import 'leaflet/dist/leaflet.css';

function App() {
  // Cast the imported JSON to your MapData interface
  const data = pipeLineData as MapData;

  return (
    <div className="App">
      <header style={{ padding: '10px', background: '#2c3e50', color: 'white' }}>
        <h1>Pipeline Infrastructure Editor</h1>
      </header>

      <main style={{ padding: '20px' }}>
        {/* Pass the imported data directly */}
        <PipelineEditor initialData={data} />
      </main>
    </div>
  );
}

export default App;