import type { SimulationPhase } from '../data/tsunamiFacts';
import styles from './StatsDisplay.module.css';

interface StatsDisplayProps {
  phase: SimulationPhase;
  stats: {
    casualties: number;
    survivors: number;
    buildingsDestroyed: number;
    vehiclesDestroyed: number;
  };
}

export function StatsDisplay({ phase, stats }: StatsDisplayProps) {
  if (phase !== 'aftermath' && phase !== 'inundation') return null;

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>Impact Statistics</h3>
      <div className={styles.stats}>
        <div className={styles.stat}>
          <span className={styles.value}>{stats.survivors}</span>
          <span className={styles.label}>Evacuated</span>
        </div>
        <div className={`${styles.stat} ${styles.danger}`}>
          <span className={styles.value}>{stats.casualties}</span>
          <span className={styles.label}>Casualties</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.value}>{stats.buildingsDestroyed}</span>
          <span className={styles.label}>Buildings Lost</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.value}>{stats.vehiclesDestroyed}</span>
          <span className={styles.label}>Vehicles Lost</span>
        </div>
      </div>
    </div>
  );
}
