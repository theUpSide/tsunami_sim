import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  SimulationState,
  Camera,
} from '../simulation/types';
import {
  createInitialState,
  updateSimulation,
  startSimulation,
  resetSimulation,
} from '../simulation/Engine';

export function useSimulation(initialMagnitude: number = 7.0) {
  const [state, setState] = useState<SimulationState>(() =>
    createInitialState(initialMagnitude)
  );
  const animationRef = useRef<number | undefined>(undefined);
  const lastTimeRef = useRef<number>(0);

  const update = useCallback((timestamp: number) => {
    if (lastTimeRef.current === 0) {
      lastTimeRef.current = timestamp;
    }

    const deltaTime = timestamp - lastTimeRef.current;
    lastTimeRef.current = timestamp;

    setState((prev) => updateSimulation(prev, deltaTime));
    animationRef.current = requestAnimationFrame(update);
  }, []);

  useEffect(() => {
    animationRef.current = requestAnimationFrame(update);
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [update]);

  const start = useCallback(() => {
    setState((prev) => startSimulation(prev));
  }, []);

  const reset = useCallback((magnitude: number) => {
    lastTimeRef.current = 0;
    setState(resetSimulation(magnitude));
  }, []);

  const setMagnitude = useCallback((magnitude: number) => {
    setState((prev) => ({
      ...prev,
      magnitude,
      earthquake: { ...prev.earthquake, magnitude },
    }));
  }, []);

  const setSpeed = useCallback((speed: number) => {
    setState((prev) => ({ ...prev, speed }));
  }, []);

  const togglePause = useCallback(() => {
    setState((prev) => ({ ...prev, paused: !prev.paused }));
  }, []);

  const setCamera = useCallback((camera: Camera) => {
    setState((prev) => ({ ...prev, camera }));
  }, []);

  return {
    state,
    start,
    reset,
    setMagnitude,
    setSpeed,
    togglePause,
    setCamera,
  };
}
