import type { SimulationPhase } from '../data/tsunamiFacts';

export interface Point {
  x: number;
  y: number;
}

export interface Camera {
  x: number;
  y: number;
  zoom: number;
}

export interface WaveState {
  position: number;
  height: number;
  speed: number;
  energy: number;
}

export interface EarthquakeState {
  magnitude: number;
  epicenterX: number;
  active: boolean;
  shakeIntensity: number;
  plateOffset: number;
}

export interface Building {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'residential' | 'commercial';
  colorIndex: number;
  roofColorIndex: number;
  health: number;
  maxHealth: number;
  destroyed: boolean;
  debris: Debris[];
}

export interface Vehicle {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  colorIndex: number;
  speed: number;
  fleeing: boolean;
  destroyed: boolean;
  occupants: number;
  evacuated: boolean;
}

export interface Person {
  id: string;
  x: number;
  y: number;
  speed: number;
  fleeing: boolean;
  runFrame: number;
  skinColorIndex: number;
  clothesColorIndex: number;
  survived: boolean;
  caught: boolean;
}

export interface Debris {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  rotationSpeed: number;
  size: number;
  type: 'wood' | 'concrete' | 'metal';
}

export interface Town {
  id: string;
  name: string;
  x: number;
  width: number;
  population: number;
  type: 'village' | 'town' | 'city';
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  type: 'splash' | 'spray' | 'dust';
}

export interface WaterLevel {
  x: number;
  baseLevel: number;
  currentLevel: number;
  velocity: number;
}

export interface SimulationState {
  phase: SimulationPhase;
  time: number;
  phaseTime: number;
  speed: number;
  paused: boolean;
  magnitude: number;
  camera: Camera;
  earthquake: EarthquakeState;
  wave: WaveState;
  waterLevels: WaterLevel[];
  towns: Town[];
  buildings: Building[];
  vehicles: Vehicle[];
  people: Person[];
  debris: Debris[];
  particles: Particle[];
  currentFact: string | null;
  stats: {
    casualties: number;
    survivors: number;
    buildingsDestroyed: number;
    vehiclesDestroyed: number;
  };
}

export interface WorldConfig {
  width: number;
  height: number;
  oceanStartX: number;
  oceanEndX: number;
  oceanDepth: number;
  coastStartX: number;
  coastEndX: number;
  townStartX: number;
  townEndX: number;
  groundLevel: number;
  seaLevel: number;
}

export const DEFAULT_WORLD_CONFIG: WorldConfig = {
  width: 4000,
  height: 1200,
  oceanStartX: 0,
  oceanEndX: 2800,
  oceanDepth: 600,
  coastStartX: 2400,
  coastEndX: 2800,
  townStartX: 2800,
  townEndX: 4000,
  groundLevel: 600,
  seaLevel: 600,
};
