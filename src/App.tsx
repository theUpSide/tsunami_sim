import { useCallback } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { SimulationCanvas } from './components/SimulationCanvas';
import { ControlPanel } from './components/ControlPanel';
import { FactDisplay } from './components/FactDisplay';
import { StatsDisplay } from './components/StatsDisplay';
import { useSimulation } from './hooks/useSimulation';
import './App.css';

function App() {
  const {
    state,
    start,
    reset,
    setMagnitude,
    setSpeed,
    togglePause,
    setCamera,
  } = useSimulation(7.0);

  const handleReset = useCallback(() => {
    reset(state.magnitude);
  }, [reset, state.magnitude]);

  const handleZoomIn = useCallback(() => {
    const newZoom = Math.min(state.camera.zoom * 1.25, 2.0);
    setCamera({ ...state.camera, zoom: newZoom });
  }, [state.camera, setCamera]);

  const handleZoomOut = useCallback(() => {
    const newZoom = Math.max(state.camera.zoom / 1.25, 0.25);
    setCamera({ ...state.camera, zoom: newZoom });
  }, [state.camera, setCamera]);

  return (
    <div className="app">
      <SimulationCanvas state={state} onCameraChange={setCamera} />
      <ControlPanel
        magnitude={state.magnitude}
        speed={state.speed}
        zoom={state.camera.zoom}
        paused={state.paused}
        phase={state.phase}
        onMagnitudeChange={setMagnitude}
        onSpeedChange={setSpeed}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onTogglePause={togglePause}
        onStart={start}
        onReset={handleReset}
      />
      <FactDisplay fact={state.currentFact} phase={state.phase} />
      <StatsDisplay phase={state.phase} stats={state.stats} />
      <Analytics />
    </div>
  );
}

export default App;
