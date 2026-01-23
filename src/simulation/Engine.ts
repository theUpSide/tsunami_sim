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
  Town,
} from './types';
import { DEFAULT_WORLD_CONFIG } from './types';

// Town and city names for random selection
const TOWN_NAMES = {
  village: [
    'Seaside Cove', 'Fisherman\'s Rest', 'Coral Bay', 'Sandy Point', 'Shell Harbor',
    'Driftwood', 'Pelican Beach', 'Tide Pool', 'Anchor Point', 'Surf Village',
    'Mist Haven', 'Kelp Shores', 'Starfish Landing', 'Gull\'s Nest', 'Breaker\'s Edge',
  ],
  town: [
    'Ocean View', 'Port Haven', 'Bayside', 'Harbortown', 'Wavecrest',
    'Marina Bay', 'Coastline', 'Seabrook', 'Tidewaters', 'Saltwater Springs',
    'Crescent Beach', 'Palm Shore', 'Sunset Harbor', 'Blue Lagoon', 'Sailors Rest',
  ],
  city: [
    'Pacific City', 'New Atlantis', 'Oceanport', 'Bay Metropolis', 'Coastal Heights',
    'Seagate City', 'Maritime Center', 'Harbor City', 'Aqua Vista', 'Tidewater City',
    'Newport Grand', 'Eastshore', 'Westport', 'Bayshore City', 'Ocean Heights',
  ],
};

const PHASE_DURATIONS: Record<SimulationPhase, number> = {
  idle: Infinity,
  earthquake: 8000,
  waveFormation: 6000,
  waveTravel: 12000,
  waveShoaling: 8000,
  waveBreaking: 6000,
  inundation: 15000,
  recession: 12000,
  aftermath: Infinity,
};

export function createInitialState(magnitude: number = 7.0): SimulationState {
  const config = DEFAULT_WORLD_CONFIG;
  const towns = createTowns(config);

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
    towns,
    buildings: createBuildings(config, towns),
    vehicles: createVehicles(config, towns),
    people: createPeople(config, towns),
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

function createTowns(config: WorldConfig): Town[] {
  const towns: Town[] = [];
  const totalWidth = config.townEndX - config.townStartX;

  // Randomly decide how many settlements (1-4)
  const numSettlements = randomInt(1, 4);

  // Shuffle and pick random names
  const usedNames: Set<string> = new Set();

  const getRandomName = (type: 'village' | 'town' | 'city'): string => {
    const names = TOWN_NAMES[type].filter(n => !usedNames.has(n));
    if (names.length === 0) return `${type.charAt(0).toUpperCase() + type.slice(1)} ${randomInt(1, 99)}`;
    const name = names[randomInt(0, names.length - 1)];
    usedNames.add(name);
    return name;
  };

  // Distribute settlements across the coastal area
  let currentX = config.townStartX + 30;

  for (let i = 0; i < numSettlements; i++) {
    // Determine settlement type based on position and randomness
    // Closer to coast = more likely to be smaller
    const distanceRatio = (currentX - config.townStartX) / totalWidth;
    const roll = Math.random() + distanceRatio * 0.3;

    let type: 'village' | 'town' | 'city';
    let width: number;
    let population: number;

    if (roll < 0.35) {
      type = 'village';
      width = randomRange(150, 250);
      population = randomInt(50, 200);
    } else if (roll < 0.7) {
      type = 'town';
      width = randomRange(250, 400);
      population = randomInt(200, 800);
    } else {
      type = 'city';
      width = randomRange(350, 550);
      population = randomInt(800, 3000);
    }

    // Ensure we don't exceed bounds
    width = Math.min(width, config.townEndX - currentX - 50);
    if (width < 100) break;

    towns.push({
      id: `town-${i}`,
      name: getRandomName(type),
      x: currentX,
      width,
      population,
      type,
    });

    currentX += width + randomRange(40, 100);

    if (currentX >= config.townEndX - 100) break;
  }

  return towns;
}

function createBuildings(config: WorldConfig, towns: Town[]): Building[] {
  const buildings: Building[] = [];
  let id = 0;

  towns.forEach((town) => {
    // Building density based on town type
    const density = town.type === 'city' ? 0.7 : town.type === 'town' ? 0.5 : 0.35;
    let x = town.x + 20;

    while (x < town.x + town.width - 30) {
      // Cities have more commercial buildings
      const commercialChance = town.type === 'city' ? 0.5 : town.type === 'town' ? 0.3 : 0.15;
      const isCommercial = Math.random() < commercialChance;

      // Building sizes based on town type
      let width: number;
      let height: number;

      if (town.type === 'city') {
        width = isCommercial ? randomRange(70, 110) : randomRange(40, 65);
        height = isCommercial ? randomRange(120, 200) : randomRange(70, 120);
      } else if (town.type === 'town') {
        width = isCommercial ? randomRange(60, 90) : randomRange(35, 55);
        height = isCommercial ? randomRange(80, 140) : randomRange(55, 95);
      } else {
        width = isCommercial ? randomRange(45, 70) : randomRange(30, 50);
        height = isCommercial ? randomRange(50, 90) : randomRange(40, 70);
      }

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

      // Gap between buildings based on density
      const gap = randomRange(25 / density, 60 / density);
      x += width + gap;
    }
  });

  return buildings;
}

function createVehicles(config: WorldConfig, towns: Town[]): Vehicle[] {
  const vehicles: Vehicle[] = [];
  const roadY = config.groundLevel;
  let id = 0;

  towns.forEach((town) => {
    // Number of vehicles based on town type and population
    const numVehicles = town.type === 'city' ? randomInt(6, 12) :
                        town.type === 'town' ? randomInt(3, 7) : randomInt(1, 4);

    for (let i = 0; i < numVehicles; i++) {
      vehicles.push({
        id: `vehicle-${id++}`,
        x: randomRange(town.x + 20, town.x + town.width - 50),
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
  });

  return vehicles;
}

function createPeople(config: WorldConfig, towns: Town[]): Person[] {
  const people: Person[] = [];
  let personId = 0;

  towns.forEach((town, townIndex) => {
    // Scale population representation (we show a fraction of the actual population)
    const scaleFactor = town.type === 'city' ? 0.008 : town.type === 'town' ? 0.015 : 0.025;
    const numPeople = Math.max(3, Math.floor(town.population * scaleFactor));

    // Add guaranteed victims for the first/closest town (near coast)
    if (townIndex === 0) {
      // Number of doomed people varies by town size
      const numDoomed = town.type === 'city' ? randomInt(3, 6) :
                        town.type === 'town' ? randomInt(2, 4) : randomInt(1, 2);

      for (let i = 0; i < numDoomed; i++) {
        people.push({
          id: `person-doomed-${personId++}`,
          x: town.x + randomRange(10, 80), // Close to coast edge of town
          y: config.groundLevel - 15,
          speed: randomRange(12, 28), // Very slow - cannot outrun wave
          fleeing: false,
          runFrame: 0,
          skinColorIndex: randomInt(0, 3),
          clothesColorIndex: randomInt(0, 5),
          survived: false,
          caught: false,
        });
      }
    }

    // Add regular citizens for this town
    for (let i = 0; i < numPeople; i++) {
      // Mix of speeds - some elderly/children who move slower
      const isSlow = Math.random() < 0.25;
      const isVeryFast = Math.random() < 0.15;

      // Position within the town
      const personX = randomRange(town.x + 30, town.x + town.width - 30);

      // People closer to coast are more at risk
      const distanceFromCoast = personX - config.townStartX;
      const atRisk = distanceFromCoast < 150 && Math.random() < 0.3;

      people.push({
        id: atRisk ? `person-atrisk-${personId++}` : `person-${personId++}`,
        x: personX,
        y: config.groundLevel - 15,
        speed: atRisk ? randomRange(25, 50) :
               isSlow ? randomRange(40, 70) :
               isVeryFast ? randomRange(130, 170) : randomRange(85, 130),
        fleeing: false,
        runFrame: Math.random() * Math.PI,
        skinColorIndex: randomInt(0, 3),
        clothesColorIndex: randomInt(0, 5),
        survived: false,
        caught: false,
      });
    }
  });

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
    case 'recession':
      updateRecession(newState, dt, config);
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
    'recession',
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
  // Doomed and at-risk people are slower to react
  if (progress > 0.7) {
    state.people.forEach((person) => {
      if (person.id.startsWith('person-doomed')) {
        // Doomed people don't react to earthquake
        return;
      }
      if (person.id.startsWith('person-atrisk')) {
        // At-risk people have lower chance of reacting
        if (Math.random() < 0.008) {
          person.fleeing = true;
        }
      } else if (Math.random() < 0.02) {
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
  // Doomed and at-risk people are slower to notice
  if (progress > 0.3) {
    state.people.forEach((person) => {
      if (person.fleeing) return;
      if (person.id.startsWith('person-doomed')) {
        // Doomed people still don't notice
        return;
      }
      if (person.id.startsWith('person-atrisk')) {
        // At-risk people are slower to react
        if (Math.random() < 0.006) {
          person.fleeing = true;
        }
      } else if (Math.random() < 0.015) {
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

  // Most people should be fleeing now - evacuate all remaining vehicles
  // Doomed and at-risk people finally notice but it may be too late
  state.people.forEach((person) => {
    if (person.id.startsWith('person-doomed')) {
      // Doomed people finally start running at 70% - way too late
      if (progress > 0.7) {
        person.fleeing = true;
      }
    } else if (person.id.startsWith('person-atrisk')) {
      // At-risk people start fleeing at 30% - may or may not make it
      if (progress > 0.3) {
        person.fleeing = true;
      }
    } else {
      person.fleeing = true;
    }
  });
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

function updateRecession(state: SimulationState, dt: number, config: WorldConfig) {
  const progress = state.phaseTime / PHASE_DURATIONS.recession;
  const magnitudeScale = (state.magnitude - 5) / 4;

  // Water recedes back toward the ocean
  // Use easeOut for a natural look - fast at first, then slowing
  const recessionProgress = easeOut(progress);

  // Calculate the furthest inland the water reached
  const maxInlandDistance = config.townEndX - config.townStartX;
  const currentWaterFront = config.townStartX + maxInlandDistance * (1 - recessionProgress * 0.9);

  // Water depth decreases as it recedes
  const baseDepth = (30 + magnitudeScale * 70) * 0.5; // Half of peak inundation depth
  const currentDepth = baseDepth * (1 - recessionProgress);

  // Update water levels - water recedes from inland toward coast
  state.waterLevels.forEach((level) => {
    if (level.x >= config.townStartX) {
      if (level.x < currentWaterFront) {
        // Still has water - gradually lowering
        const distFromFront = currentWaterFront - level.x;
        const depth = Math.min(currentDepth, distFromFront * 0.2) * (1 - recessionProgress * 0.8);
        level.currentLevel = lerp(level.currentLevel, level.baseLevel - depth, 0.05);
      } else {
        // Water has receded past this point
        level.currentLevel = lerp(level.currentLevel, level.baseLevel, 0.1);
      }
    } else if (level.x >= config.coastEndX) {
      // Coast area - water rises slightly as it flows back
      const coastProgress = 1 - (level.x - config.coastEndX) / (config.townStartX - config.coastEndX);
      const returnDepth = currentDepth * coastProgress * 0.5;
      level.currentLevel = lerp(level.currentLevel, level.baseLevel - returnDepth, 0.03);
    } else {
      // Ocean area - gradually return to normal
      level.currentLevel = lerp(level.currentLevel, level.baseLevel, 0.02);
    }
  });

  // Wave position moves back toward ocean
  state.wave.position = lerp(config.townStartX, config.coastStartX, recessionProgress);
  state.wave.height = Math.max(0, state.wave.height * (1 - progress * 0.1));

  // People caught in backwash (additional danger during recession)
  state.people.forEach((person) => {
    if (!person.caught && !person.survived) {
      // People in the receding water area can still be caught
      if (person.x < currentWaterFront && person.x > config.townStartX && Math.random() < 0.002) {
        // Small chance of being caught in backwash
        person.caught = true;
        state.stats.casualties++;
      } else if (person.x > config.townEndX - 100) {
        person.survived = true;
        state.stats.survivors++;
      }
    }
  });

  // Continue updating fleeing entities
  updateFleeingEntities(state, dt, config);

  // Debris gets pulled back toward ocean
  state.debris.forEach((d) => {
    if (d.x > config.townStartX && d.x < currentWaterFront) {
      d.vx -= 0.3; // Pull toward ocean
    }
  });

  // Water splash particles as water recedes
  if (Math.random() < 0.3 && currentWaterFront > config.townStartX + 50) {
    state.particles.push(createSplashParticle(
      currentWaterFront - randomRange(10, 50),
      config.groundLevel - currentDepth * 0.5
    ));
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
