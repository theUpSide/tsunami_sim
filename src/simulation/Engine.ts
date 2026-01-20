import type { SimulationPhase } from '../data/tsunamiFacts';
import { getRandomFactForPhase } from '../data/tsunamiFacts';
import { randomRange, randomInt, lerp, easeOut } from '../utils/math';
import type {
  SimulationState,
  WorldConfig,
  Building,
  Vehicle,
  Person,
  WaterLevel,
  Debris,
  Particle,
} from './types';
import { DEFAULT_WORLD_CONFIG } from './types';

const PHASE_DURATIONS: Record<SimulationPhase, number> = {
  idle: Infinity,
  earthquake: 8000,
  waveFormation: 6000,
  waveTravel: 12000,
  waveShoaling: 8000,
  waveBreaking: 6000,
  inundation: 15000,
  aftermath: Infinity,
};

export function createInitialState(magnitude: number = 7.0): SimulationState {
  const config = DEFAULT_WORLD_CONFIG;

  return {
    phase: 'idle',
    time: 0,
    phaseTime: 0,
    speed: 1,
    paused: false,
    magnitude,
    camera: {
      x: 200,
      y: 100,
      zoom: 0.55,
    },
    earthquake: {
      magnitude,
      epicenterX: 800,
      active: false,
      shakeIntensity: 0,
      plateOffset: 0,
    },
    wave: {
      position: 800,
      height: 0,
      speed: 0,
      energy: 0,
    },
    waterLevels: createWaterLevels(config),
    buildings: createBuildings(config),
    vehicles: createVehicles(config),
    people: createPeople(config),
    debris: [],
    particles: [],
    currentFact: null,
    stats: {
      casualties: 0,
      survivors: 0,
      buildingsDestroyed: 0,
      vehiclesDestroyed: 0,
    },
  };
}

function createWaterLevels(config: WorldConfig): WaterLevel[] {
  const levels: WaterLevel[] = [];
  const step = 20;
  for (let x = config.oceanStartX; x <= config.townEndX; x += step) {
    levels.push({
      x,
      baseLevel: config.seaLevel,
      currentLevel: config.seaLevel,
      velocity: 0,
    });
  }
  return levels;
}

function createBuildings(config: WorldConfig): Building[] {
  const buildings: Building[] = [];
  let x = config.townStartX + 50;
  let id = 0;

  while (x < config.townEndX - 100) {
    const isCommercial = Math.random() > 0.7;
    const width = isCommercial ? randomRange(80, 120) : randomRange(40, 70);
    const height = isCommercial ? randomRange(100, 180) : randomRange(60, 100);
    const health = (width * height) / 50;

    buildings.push({
      id: `building-${id++}`,
      x,
      y: config.groundLevel - height,
      width,
      height,
      type: isCommercial ? 'commercial' : 'residential',
      colorIndex: randomInt(0, 3),
      roofColorIndex: randomInt(0, 3),
      health,
      maxHealth: health,
      destroyed: false,
      debris: [],
    });

    x += width + randomRange(30, 80);
  }

  return buildings;
}

function createVehicles(config: WorldConfig): Vehicle[] {
  const vehicles: Vehicle[] = [];
  const roadY = config.groundLevel;

  for (let i = 0; i < 15; i++) {
    vehicles.push({
      id: `vehicle-${i}`,
      x: randomRange(config.townStartX + 50, config.townEndX - 100),
      y: roadY - 20,
      width: 40,
      height: 20,
      colorIndex: randomInt(0, 5),
      speed: 0,
      fleeing: false,
      destroyed: false,
      occupants: randomInt(1, 4),
      evacuated: false,
    });
  }

  return vehicles;
}

function createPeople(config: WorldConfig): Person[] {
  const people: Person[] = [];

  // Guarantee at least one victim - someone too close to coast and too slow to escape
  people.push({
    id: `person-doomed`,
    x: config.townStartX + randomRange(20, 80), // Very close to coast
    y: config.groundLevel - 15,
    speed: randomRange(25, 40), // Very slow - elderly or injured
    fleeing: false,
    runFrame: 0,
    skinColorIndex: randomInt(0, 3),
    clothesColorIndex: randomInt(0, 5),
    survived: false,
    caught: false,
  });

  // Create remaining pedestrians (not in cars)
  for (let i = 0; i < 11; i++) {
    // Mix of speeds - some elderly/children who move slower
    const isSlow = Math.random() < 0.3;
    people.push({
      id: `person-${i}`,
      x: randomRange(config.townStartX + 100, config.townEndX - 50),
      y: config.groundLevel - 15,
      speed: isSlow ? randomRange(40, 70) : randomRange(90, 140),
      fleeing: false,
      runFrame: 0,
      skinColorIndex: randomInt(0, 3),
      clothesColorIndex: randomInt(0, 5),
      survived: false,
      caught: false,
    });
  }

  return people;
}

function evacuateVehicle(vehicle: Vehicle, state: SimulationState, config: WorldConfig) {
  if (vehicle.evacuated || vehicle.destroyed) return;

  vehicle.evacuated = true;

  // Spawn people from the vehicle
  for (let i = 0; i < vehicle.occupants; i++) {
    const isSlow = Math.random() < 0.25;
    const person: Person = {
      id: `evacuee-${vehicle.id}-${i}`,
      x: vehicle.x + randomRange(-10, 10),
      y: config.groundLevel - 15,
      speed: isSlow ? randomRange(35, 60) : randomRange(80, 130),
      fleeing: true,
      runFrame: Math.random() * Math.PI * 2,
      skinColorIndex: randomInt(0, 3),
      clothesColorIndex: randomInt(0, 5),
      survived: false,
      caught: false,
    };
    state.people.push(person);
  }
}

export function updateSimulation(
  state: SimulationState,
  deltaTime: number,
  config: WorldConfig = DEFAULT_WORLD_CONFIG
): SimulationState {
  if (state.paused) return state;

  const dt = deltaTime * state.speed;
  const newState = { ...state };
  newState.time += dt;
  newState.phaseTime += dt;

  // Check phase transitions
  const phaseDuration = PHASE_DURATIONS[state.phase];
  if (state.phaseTime >= phaseDuration && phaseDuration !== Infinity) {
    newState.phase = getNextPhase(state.phase);
    newState.phaseTime = 0;
    const fact = getRandomFactForPhase(newState.phase);
    newState.currentFact = fact?.text || null;
  }

  // Update based on current phase
  switch (newState.phase) {
    case 'earthquake':
      updateEarthquake(newState, dt, config);
      break;
    case 'waveFormation':
      updateWaveFormation(newState, dt, config);
      break;
    case 'waveTravel':
      updateWaveTravel(newState, dt, config);
      break;
    case 'waveShoaling':
      updateWaveShoaling(newState, dt, config);
      break;
    case 'waveBreaking':
      updateWaveBreaking(newState, dt, config);
      break;
    case 'inundation':
      updateInundation(newState, dt, config);
      break;
    case 'aftermath':
      updateAftermath(newState, dt, config);
      break;
  }

  // Always update particles
  updateParticles(newState, dt);

  return newState;
}

function getNextPhase(current: SimulationPhase): SimulationPhase {
  const phases: SimulationPhase[] = [
    'idle',
    'earthquake',
    'waveFormation',
    'waveTravel',
    'waveShoaling',
    'waveBreaking',
    'inundation',
    'aftermath',
  ];
  const index = phases.indexOf(current);
  return phases[Math.min(index + 1, phases.length - 1)];
}

function updateEarthquake(state: SimulationState, _dt: number, _config: WorldConfig) {
  const progress = state.phaseTime / PHASE_DURATIONS.earthquake;
  const intensity = Math.sin(progress * Math.PI) * state.magnitude / 10;

  state.earthquake.active = true;
  state.earthquake.shakeIntensity = intensity * 20;
  state.earthquake.plateOffset = Math.sin(progress * Math.PI * 2) * intensity * 30;

  // Start alerting people near the end of earthquake
  if (progress > 0.7) {
    state.people.forEach((person) => {
      if (Math.random() < 0.02) {
        person.fleeing = true;
      }
    });
  }
}

function updateWaveFormation(state: SimulationState, _dt: number, _config: WorldConfig) {
  state.earthquake.active = false;
  state.earthquake.shakeIntensity *= 0.95;

  const progress = state.phaseTime / PHASE_DURATIONS.waveFormation;
  const magnitudeScale = (state.magnitude - 5) / 4; // 5-9 scale normalized

  state.wave.height = easeOut(progress) * (50 + magnitudeScale * 100);
  state.wave.energy = state.magnitude * 1000;
  state.wave.speed = 50; // Start slow, will accelerate

  // Update water levels near epicenter
  state.waterLevels.forEach((level) => {
    const dist = Math.abs(level.x - state.earthquake.epicenterX);
    if (dist < 300) {
      const displacement = (1 - dist / 300) * state.wave.height * Math.sin(progress * Math.PI);
      level.currentLevel = level.baseLevel - displacement;
    }
  });
}

function updateWaveTravel(state: SimulationState, dt: number, config: WorldConfig) {
  const progress = state.phaseTime / PHASE_DURATIONS.waveTravel;

  // Wave travels toward coast
  const targetX = config.coastStartX;
  state.wave.position = lerp(state.earthquake.epicenterX, targetX, easeOut(progress));
  state.wave.speed = 200 + (1 - progress) * 300; // Faster in deep water

  // Update water levels - wave propagation
  state.waterLevels.forEach((level) => {
    const dist = level.x - state.wave.position;
    if (dist > -100 && dist < 300) {
      const waveShape = Math.exp(-((dist - 100) ** 2) / 20000);
      level.currentLevel = level.baseLevel - waveShape * state.wave.height;
    } else {
      level.currentLevel = lerp(level.currentLevel, level.baseLevel, 0.02);
    }
  });

  // More people start fleeing and evacuating vehicles as they notice the wave
  if (progress > 0.3) {
    state.people.forEach((person) => {
      if (!person.fleeing && Math.random() < 0.015) {
        person.fleeing = true;
      }
    });
    // People start getting out of cars
    state.vehicles.forEach((vehicle) => {
      if (!vehicle.evacuated && Math.random() < 0.008) {
        evacuateVehicle(vehicle, state, config);
      }
    });
  }

  updateFleeingEntities(state, dt, config);
}

function updateWaveShoaling(state: SimulationState, dt: number, config: WorldConfig) {
  const progress = state.phaseTime / PHASE_DURATIONS.waveShoaling;

  // Wave slows and grows taller
  const targetX = config.coastEndX - 100;
  state.wave.position = lerp(config.coastStartX, targetX, easeOut(progress));
  state.wave.speed = 200 * (1 - progress * 0.8); // Slows significantly

  // Shoaling effect - wave height increases dramatically
  const depthFactor = 1 + progress * 3; // Height multiplier
  const magnitudeScale = (state.magnitude - 5) / 4;
  state.wave.height = (50 + magnitudeScale * 100) * depthFactor;

  // Update water levels with growing wave
  state.waterLevels.forEach((level) => {
    const dist = level.x - state.wave.position;
    if (dist > -50 && dist < 400) {
      const waveShape = Math.exp(-((dist - 50) ** 2) / 30000);
      level.currentLevel = level.baseLevel - waveShape * state.wave.height;
    }
  });

  // Everyone should be fleeing now - evacuate all remaining vehicles
  state.people.forEach((person) => (person.fleeing = true));
  state.vehicles.forEach((vehicle) => {
    if (!vehicle.evacuated) {
      evacuateVehicle(vehicle, state, config);
    }
  });

  updateFleeingEntities(state, dt, config);

  // Generate spray particles
  if (Math.random() < 0.3) {
    state.particles.push(createSprayParticle(state.wave.position, config.seaLevel - state.wave.height));
  }
}

function updateWaveBreaking(state: SimulationState, dt: number, config: WorldConfig) {
  const progress = state.phaseTime / PHASE_DURATIONS.waveBreaking;

  // Wave crests and begins breaking
  state.wave.position = lerp(config.coastEndX - 100, config.townStartX, progress);

  // Wave curls over
  const magnitudeScale = (state.magnitude - 5) / 4;
  state.wave.height = (50 + magnitudeScale * 100) * (3 + progress);

  // Update water levels - dramatic wave wall
  state.waterLevels.forEach((level) => {
    const dist = level.x - state.wave.position;
    if (dist > -100 && dist < 200) {
      const waveShape = Math.exp(-((dist) ** 2) / 10000);
      level.currentLevel = level.baseLevel - waveShape * state.wave.height;
    }
  });

  updateFleeingEntities(state, dt, config);

  // Lots of spray
  for (let i = 0; i < 3; i++) {
    state.particles.push(createSprayParticle(
      state.wave.position + randomRange(-30, 30),
      config.seaLevel - state.wave.height + randomRange(-20, 20)
    ));
  }
}

function updateInundation(state: SimulationState, dt: number, config: WorldConfig) {
  const progress = state.phaseTime / PHASE_DURATIONS.inundation;

  // Water rushes inland
  const inundationDistance = progress * (config.townEndX - config.townStartX);
  const waterFront = config.townStartX + inundationDistance;
  const magnitudeScale = (state.magnitude - 5) / 4;
  const waterDepth = (30 + magnitudeScale * 70) * (1 - progress * 0.5);

  // Update water levels across town
  state.waterLevels.forEach((level) => {
    if (level.x < waterFront) {
      const distFromFront = waterFront - level.x;
      const depth = Math.min(waterDepth, distFromFront * 0.3);
      level.currentLevel = level.baseLevel - depth;
    }
  });

  // Check building damage
  state.buildings.forEach((building) => {
    if (!building.destroyed && building.x < waterFront) {
      const damage = waterDepth * (dt / 1000) * (magnitudeScale + 0.5);
      building.health -= damage;

      if (building.health <= 0) {
        building.destroyed = true;
        state.stats.buildingsDestroyed++;
        // Create debris
        for (let i = 0; i < 5; i++) {
          state.debris.push(createDebris(building));
        }
      }
    }
  });

  // Check vehicle damage
  state.vehicles.forEach((vehicle) => {
    if (!vehicle.destroyed && vehicle.x < waterFront) {
      vehicle.destroyed = true;
      state.stats.vehiclesDestroyed++;
    }
  });

  // Check people
  state.people.forEach((person) => {
    if (!person.caught && !person.survived) {
      if (person.x < waterFront) {
        person.caught = true;
        state.stats.casualties++;
      } else if (person.x > config.townEndX - 100) {
        person.survived = true;
        state.stats.survivors++;
      }
    }
  });

  updateFleeingEntities(state, dt, config);

  // Splash particles at water front
  if (Math.random() < 0.5) {
    state.particles.push(createSplashParticle(waterFront, config.groundLevel - waterDepth));
  }
}

function updateAftermath(state: SimulationState, dt: number, config: WorldConfig) {
  // Water slowly recedes
  state.waterLevels.forEach((level) => {
    level.currentLevel = lerp(level.currentLevel, level.baseLevel, 0.001 * dt);
  });

  // Count remaining survivors
  state.people.forEach((person) => {
    if (!person.caught && !person.survived) {
      person.survived = true;
      state.stats.survivors++;
    }
  });

  // Update debris falling
  state.debris.forEach((d) => {
    d.vy += 0.5;
    d.x += d.vx * (dt / 16);
    d.y += d.vy * (dt / 16);
    d.rotation += d.rotationSpeed;

    if (d.y > config.groundLevel) {
      d.y = config.groundLevel;
      d.vy *= -0.3;
      d.vx *= 0.8;
    }
  });
}

function updateFleeingEntities(state: SimulationState, dt: number, _config: WorldConfig) {
  // People running away from the coast
  state.people.forEach((person) => {
    if (person.fleeing && !person.caught) {
      person.x += person.speed * (dt / 1000);
      person.runFrame += dt / 100;
    }
  });

  // Vehicles stay in place - people have abandoned them
  // They will be destroyed when the water reaches them
}

function updateParticles(state: SimulationState, dt: number) {
  state.particles = state.particles.filter((p) => {
    p.x += p.vx * (dt / 16);
    p.y += p.vy * (dt / 16);
    p.vy += 0.2; // gravity
    p.life -= dt;
    return p.life > 0;
  });
}

function createSprayParticle(x: number, y: number): Particle {
  return {
    x,
    y,
    vx: randomRange(-3, 3),
    vy: randomRange(-8, -2),
    life: 1000,
    maxLife: 1000,
    size: randomRange(2, 6),
    type: 'spray',
  };
}

function createSplashParticle(x: number, y: number): Particle {
  return {
    x,
    y,
    vx: randomRange(-5, 5),
    vy: randomRange(-10, -3),
    life: 800,
    maxLife: 800,
    size: randomRange(3, 8),
    type: 'splash',
  };
}

function createDebris(building: Building): Debris {
  return {
    x: building.x + randomRange(0, building.width),
    y: building.y + randomRange(0, building.height),
    vx: randomRange(-5, 5),
    vy: randomRange(-10, 0),
    rotation: randomRange(0, Math.PI * 2),
    rotationSpeed: randomRange(-0.2, 0.2),
    size: randomRange(5, 15),
    type: Math.random() > 0.5 ? 'wood' : 'concrete',
  };
}

export function startSimulation(state: SimulationState): SimulationState {
  const newState = createInitialState(state.magnitude);
  newState.phase = 'earthquake';
  newState.camera = state.camera;
  const fact = getRandomFactForPhase('earthquake');
  newState.currentFact = fact?.text || null;
  return newState;
}

export function resetSimulation(magnitude: number): SimulationState {
  return createInitialState(magnitude);
}
