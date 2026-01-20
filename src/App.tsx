import { useCallback } from 'react';
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

  return (
    <div className="app">
      <SimulationCanvas state={state} onCameraChange={setCamera} />
      <ControlPanel
        magnitude={state.magnitude}
        speed={state.speed}
        paused={state.paused}
        phase={state.phase}
        onMagnitudeChange={setMagnitude}
        onSpeedChange={setSpeed}
        onTogglePause={togglePause}
        onStart={start}
        onReset={handleReset}
      />
      <FactDisplay fact={state.currentFact} />
      <StatsDisplay phase={state.phase} stats={state.stats} />
    </div>
  );
}

export default App;
