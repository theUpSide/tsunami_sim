import type { SimulationPhase } from '../data/tsunamiFacts';
import styles from './ControlPanel.module.css';

interface ControlPanelProps {
  magnitude: number;
  speed: number;
  zoom: number;
  paused: boolean;
  phase: SimulationPhase;
  onMagnitudeChange: (magnitude: number) => void;
  onSpeedChange: (speed: number) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onTogglePause: () => void;
  onStart: () => void;
  onReset: () => void;
}

const phaseLabels: Record<SimulationPhase, string> = {
  idle: 'Ready',
  earthquake: 'Earthquake',
  waveFormation: 'Wave Forming',
  waveTravel: 'Wave Traveling',
  waveShoaling: 'Wave Shoaling',
  waveBreaking: 'Wave Breaking',
  inundation: 'Inundation',
  recession: 'Water Receding',
  aftermath: 'Aftermath',
};

export function ControlPanel({
  magnitude,
  speed,
  zoom,
  paused,
  phase,
  onMagnitudeChange,
  onSpeedChange,
  onZoomIn,
  onZoomOut,
  onTogglePause,
  onStart,
  onReset,
}: ControlPanelProps) {
  const isRunning = phase !== 'idle' && phase !== 'aftermath';
  const canStart = phase === 'idle';
  const canReset = phase !== 'idle';

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <h2>Tsunami Simulator</h2>
        <div className={styles.phase}>
          <span className={styles.phaseLabel}>Phase:</span>
          <span className={styles.phaseValue}>{phaseLabels[phase]}</span>
        </div>
      </div>

      <div className={styles.controls}>
        <div className={styles.control}>
          <label htmlFor="magnitude">
            Earthquake Magnitude: <strong>{magnitude.toFixed(1)}</strong>
          </label>
          <input
            id="magnitude"
            type="range"
            min="5.0"
            max="9.5"
            step="0.1"
            value={magnitude}
            onChange={(e) => onMagnitudeChange(parseFloat(e.target.value))}
            disabled={isRunning}
            className={styles.slider}
          />
          <div className={styles.sliderLabels}>
            <span>5.0</span>
            <span>7.0</span>
            <span>9.5</span>
          </div>
        </div>

        <div className={styles.control}>
          <label htmlFor="speed">
            Simulation Speed: <strong>{speed.toFixed(2)}x</strong>
          </label>
          <input
            id="speed"
            type="range"
            min="0.1"
            max="3"
            step="0.1"
            value={speed}
            onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
            className={styles.slider}
          />
          <div className={styles.sliderLabels}>
            <span>0.1x</span>
            <span>1x</span>
            <span>3x</span>
          </div>
        </div>

        <div className={styles.control}>
          <label>
            Zoom: <strong>{(zoom * 100).toFixed(0)}%</strong>
          </label>
          <div className={styles.zoomButtons}>
            <button onClick={onZoomOut} className={styles.zoomButton}>
              −
            </button>
            <button onClick={onZoomIn} className={styles.zoomButton}>
              +
            </button>
          </div>
        </div>

        <div className={styles.buttons}>
          {canStart && (
            <button onClick={onStart} className={styles.startButton}>
              Start Simulation
            </button>
          )}
          {isRunning && (
            <button onClick={onTogglePause} className={styles.pauseButton}>
              {paused ? 'Resume' : 'Pause'}
            </button>
          )}
          {canReset && (
            <button onClick={() => onReset()} className={styles.resetButton}>
              Reset
            </button>
          )}
        </div>
      </div>

      <div className={styles.instructions}>
        <p><strong>Controls:</strong></p>
        <ul>
          <li>Drag or touch to pan</li>
          <li>Scroll or use +/− to zoom</li>
        </ul>
      </div>
    </div>
  );
}
