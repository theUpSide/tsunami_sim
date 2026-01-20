import { useEffect, useState } from 'react';
import styles from './FactDisplay.module.css';

interface FactDisplayProps {
  fact: string | null;
}

export function FactDisplay({ fact }: FactDisplayProps) {
  const [visible, setVisible] = useState(false);
  const [displayedFact, setDisplayedFact] = useState<string | null>(null);

  useEffect(() => {
    if (fact && fact !== displayedFact) {
      setVisible(false);

      const showTimeout = setTimeout(() => {
        setDisplayedFact(fact);
        setVisible(true);
      }, 300);

      return () => clearTimeout(showTimeout);
    }
  }, [fact, displayedFact]);

  if (!displayedFact) return null;

  return (
    <div className={`${styles.container} ${visible ? styles.visible : ''}`}>
      <div className={styles.icon}>💡</div>
      <div className={styles.content}>
        <span className={styles.label}>Did you know?</span>
        <p className={styles.fact}>{displayedFact}</p>
      </div>
    </div>
  );
}
