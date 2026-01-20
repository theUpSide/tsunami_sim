import { useEffect, useState, useRef } from 'react';
import type { SimulationPhase } from '../data/tsunamiFacts';
import styles from './FactDisplay.module.css';

interface FactDisplayProps {
  fact: string | null;
  phase: SimulationPhase;
}

const phaseLabels: Record<SimulationPhase, string> = {
  idle: '',
  earthquake: 'Earthquake',
  waveFormation: 'Wave Formation',
  waveTravel: 'Deep Ocean',
  waveShoaling: 'Approaching Coast',
  waveBreaking: 'Wave Breaking',
  inundation: 'Coastal Impact',
  aftermath: 'Aftermath',
};

export function FactDisplay({ fact, phase }: FactDisplayProps) {
  const [visible, setVisible] = useState(false);
  const [displayedFact, setDisplayedFact] = useState<string | null>(null);
  const [displayedPhase, setDisplayedPhase] = useState<SimulationPhase>('idle');
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (fact && fact !== displayedFact) {
      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Fade out then fade in with new fact
      setVisible(false);

      timeoutRef.current = window.setTimeout(() => {
        setDisplayedFact(fact);
        setDisplayedPhase(phase);
        setVisible(true);
      }, 400);

      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      };
    }
  }, [fact, displayedFact, phase]);

  if (!displayedFact || phase === 'idle') return null;

  return (
    <div className={`${styles.container} ${visible ? styles.visible : ''}`}>
      <div className={styles.header}>
        <span className={styles.phaseTag}>{phaseLabels[displayedPhase]}</span>
      </div>
      <div className={styles.body}>
        <div className={styles.icon}>💡</div>
        <div className={styles.content}>
          <span className={styles.label}>Did you know?</span>
          <p className={styles.fact}>{displayedFact}</p>
        </div>
      </div>
    </div>
  );
}
