import type { SimulationState, WorldConfig, Camera } from '../simulation/types';
import { DEFAULT_WORLD_CONFIG } from '../simulation/types';
import { colors, hexToRgba, lerpColor } from '../utils/colors';

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;
  private config: WorldConfig;

  constructor(ctx: CanvasRenderingContext2D, width: number, height: number) {
    this.ctx = ctx;
    this.width = width;
    this.height = height;
    this.config = DEFAULT_WORLD_CONFIG;
  }

  resize(width: number, height: number) {
    this.width = width;
    this.height = height;
  }

  render(state: SimulationState) {
    const ctx = this.ctx;
    ctx.save();

    // Apply camera transform
    this.applyCamera(state.camera, state.earthquake.shakeIntensity);

    // Draw layers in order
    this.drawSky();
    this.drawSeafloor(state);
    this.drawOcean(state);
    this.drawLand();
    this.drawBuildings(state);
    this.drawVehicles(state);
    this.drawPeople(state);
    this.drawDebris(state);
    this.drawParticles(state);
    this.drawWave(state);
    // Draw inundation water LAST so it appears on top of everything
    this.drawInundationWater(state);

    ctx.restore();
  }

  private applyCamera(camera: Camera, shake: number) {
    const ctx = this.ctx;
    const centerX = this.width / 2;
    const centerY = this.height / 2;

    // Apply shake
    const shakeX = shake * (Math.random() - 0.5) * 2;
    const shakeY = shake * (Math.random() - 0.5) * 2;

    ctx.translate(centerX + shakeX, centerY + shakeY);
    ctx.scale(camera.zoom, camera.zoom);
    ctx.translate(-camera.x - centerX / camera.zoom, -camera.y - centerY / camera.zoom);
  }

  private drawSky() {
    const ctx = this.ctx;
    const gradient = ctx.createLinearGradient(0, 0, 0, this.config.seaLevel);
    gradient.addColorStop(0, colors.sky.top);
    gradient.addColorStop(0.6, colors.sky.bottom);
    gradient.addColorStop(1, colors.sky.horizon);

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.config.width, this.config.seaLevel);

    // Draw some clouds
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    this.drawCloud(200, 100, 80);
    this.drawCloud(600, 150, 100);
    this.drawCloud(1200, 80, 120);
    this.drawCloud(1800, 130, 90);
    this.drawCloud(2500, 100, 110);
    this.drawCloud(3200, 140, 85);
  }

  private drawCloud(x: number, y: number, size: number) {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.arc(x, y, size * 0.5, 0, Math.PI * 2);
    ctx.arc(x + size * 0.4, y - size * 0.1, size * 0.4, 0, Math.PI * 2);
    ctx.arc(x + size * 0.8, y, size * 0.35, 0, Math.PI * 2);
    ctx.arc(x + size * 0.3, y + size * 0.2, size * 0.3, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawSeafloor(state: SimulationState) {
    const ctx = this.ctx;
    const config = this.config;

    // Deep ocean floor gradient
    const gradient = ctx.createLinearGradient(0, config.seaLevel, 0, config.seaLevel + config.oceanDepth);
    gradient.addColorStop(0, colors.seafloor.shallow);
    gradient.addColorStop(1, colors.seafloor.deep);

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(0, config.seaLevel + config.oceanDepth);

    // Create ocean floor terrain
    for (let x = 0; x <= config.oceanEndX; x += 50) {
      let depth = config.oceanDepth;

      // Continental shelf - gradually rising near coast
      if (x > config.coastStartX) {
        const coastProgress = (x - config.coastStartX) / (config.coastEndX - config.coastStartX);
        depth = config.oceanDepth * (1 - coastProgress);
      }

      // Add some terrain variation
      const variation = Math.sin(x * 0.01) * 30 + Math.sin(x * 0.03) * 15;
      ctx.lineTo(x, config.seaLevel + depth + variation);
    }

    ctx.lineTo(config.coastEndX, config.groundLevel);
    ctx.lineTo(0, config.seaLevel + config.oceanDepth);
    ctx.closePath();
    ctx.fill();

    // Draw tectonic plates
    this.drawTectonicPlates(state);
  }

  private drawTectonicPlates(state: SimulationState) {
    const ctx = this.ctx;
    const epicenter = state.earthquake.epicenterX;
    const plateY = this.config.seaLevel + this.config.oceanDepth - 50;
    const offset = state.earthquake.plateOffset;

    // Horizontal collision offset - plates push against each other
    const collisionOffset = state.earthquake.active ? Math.abs(offset) * 0.5 : 0;

    ctx.strokeStyle = colors.seafloor.rock;
    ctx.lineWidth = 3;

    // Left plate (oceanic plate) - subducts under the continental plate
    // Moves right during collision
    ctx.fillStyle = '#5c4033';
    ctx.beginPath();
    ctx.moveTo(epicenter - 550, plateY + 20);
    ctx.lineTo(epicenter - 20 + collisionOffset, plateY + 20);
    // Subduction zone - plate dips down under the other
    ctx.lineTo(epicenter + 30 + collisionOffset, plateY + 80 - offset);
    ctx.lineTo(epicenter + 50 + collisionOffset, plateY + 140);
    ctx.lineTo(epicenter - 550, plateY + 120);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Right plate (continental plate) - rides over the oceanic plate
    // Moves left during collision and rises up
    ctx.fillStyle = '#6b5344';
    ctx.beginPath();
    ctx.moveTo(epicenter - 10 - collisionOffset, plateY - offset * 0.3);
    ctx.lineTo(epicenter + 550, plateY);
    ctx.lineTo(epicenter + 550, plateY + 100);
    ctx.lineTo(epicenter + 20 - collisionOffset, plateY + 100 + offset * 0.5);
    // Overlap zone
    ctx.lineTo(epicenter - 10 - collisionOffset, plateY + 60 + offset * 0.3);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Friction sparks during earthquake
    if (state.earthquake.active && Math.random() > 0.5) {
      ctx.fillStyle = '#ffaa00';
      for (let i = 0; i < 3; i++) {
        const sparkX = epicenter + (Math.random() - 0.5) * 40;
        const sparkY = plateY + 40 + Math.random() * 40;
        ctx.beginPath();
        ctx.arc(sparkX, sparkY, 2 + Math.random() * 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Fault line (subduction zone)
    ctx.strokeStyle = '#ff4444';
    ctx.lineWidth = 4;
    ctx.setLineDash([10, 6]);
    ctx.beginPath();
    ctx.moveTo(epicenter, plateY - 40);
    ctx.lineTo(epicenter + 40, plateY + 150);
    ctx.stroke();
    ctx.setLineDash([]);

    // Epicenter marker
    const markerY = this.config.seaLevel + 80;
    ctx.fillStyle = '#ff4444';
    ctx.beginPath();
    ctx.arc(epicenter, markerY, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Pulsing effect during earthquake
    if (state.earthquake.active) {
      ctx.strokeStyle = 'rgba(255, 68, 68, 0.5)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(epicenter, markerY, 20 + Math.abs(offset), 0, Math.PI * 2);
      ctx.stroke();
    }

    // Epicenter label - BIGGER FONT
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.lineWidth = 4;
    ctx.strokeText('EPICENTER', epicenter, markerY - 35);
    ctx.fillText('EPICENTER', epicenter, markerY - 35);

    // Plate labels - BIGGER FONT
    ctx.font = 'bold 18px Arial, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.lineWidth = 3;
    ctx.strokeText('Oceanic Plate', epicenter - 280, plateY + 75);
    ctx.fillText('Oceanic Plate', epicenter - 280, plateY + 75);
    ctx.strokeText('Continental Plate', epicenter + 280, plateY + 55);
    ctx.fillText('Continental Plate', epicenter + 280, plateY + 55);

    // Subduction label during earthquake
    if (state.earthquake.active) {
      ctx.font = 'bold 14px Arial, sans-serif';
      ctx.fillStyle = '#ffaa00';
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
      ctx.lineWidth = 3;
      ctx.strokeText('SUBDUCTION ZONE', epicenter + 20, plateY + 130);
      ctx.fillText('SUBDUCTION ZONE', epicenter + 20, plateY + 130);
    }
  }

  private drawOcean(state: SimulationState) {
    const ctx = this.ctx;
    const config = this.config;

    // Ocean water - semi-transparent to show seafloor beneath
    const gradient = ctx.createLinearGradient(0, config.seaLevel - 100, 0, config.seaLevel + 200);
    gradient.addColorStop(0, hexToRgba(colors.ocean.surface, 0.5));
    gradient.addColorStop(0.3, hexToRgba(colors.ocean.shallow, 0.55));
    gradient.addColorStop(1, hexToRgba(colors.ocean.deep, 0.6));

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(0, config.seaLevel - 100);

    // Draw water surface based on water levels
    let lastX = 0;
    state.waterLevels.forEach((level) => {
      if (level.x <= config.oceanEndX + 200) {
        ctx.lineTo(level.x, level.currentLevel);
        lastX = level.x;
      }
    });

    ctx.lineTo(lastX, config.seaLevel + config.oceanDepth);
    ctx.lineTo(0, config.seaLevel + config.oceanDepth);
    ctx.closePath();
    ctx.fill();

    // Surface shine
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    state.waterLevels.forEach((level, i) => {
      if (level.x <= config.oceanEndX && i % 3 === 0) {
        if (i === 0) ctx.moveTo(level.x, level.currentLevel);
        else ctx.lineTo(level.x, level.currentLevel);
      }
    });
    ctx.stroke();
  }

  private drawWave(state: SimulationState) {
    if (state.wave.height < 5) return;

    const ctx = this.ctx;
    const waveX = state.wave.position;
    const waveH = state.wave.height;
    const seaLevel = this.config.seaLevel;

    // Main wave body
    const gradient = ctx.createLinearGradient(waveX - 100, seaLevel, waveX + 50, seaLevel - waveH);
    gradient.addColorStop(0, colors.ocean.deep);
    gradient.addColorStop(0.5, colors.ocean.wave);
    gradient.addColorStop(1, colors.ocean.surface);

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(waveX - 150, seaLevel);

    // Wave shape - curves up and over
    ctx.bezierCurveTo(
      waveX - 100, seaLevel,
      waveX - 80, seaLevel - waveH * 0.3,
      waveX - 30, seaLevel - waveH * 0.8
    );
    ctx.bezierCurveTo(
      waveX, seaLevel - waveH,
      waveX + 30, seaLevel - waveH * 0.9,
      waveX + 60, seaLevel - waveH * 0.5
    );
    ctx.bezierCurveTo(
      waveX + 80, seaLevel - waveH * 0.2,
      waveX + 100, seaLevel,
      waveX + 150, seaLevel
    );

    ctx.lineTo(waveX + 150, seaLevel + 50);
    ctx.lineTo(waveX - 150, seaLevel + 50);
    ctx.closePath();
    ctx.fill();

    // Foam/crest
    ctx.fillStyle = colors.ocean.foam;
    ctx.beginPath();
    ctx.moveTo(waveX - 30, seaLevel - waveH * 0.8);
    ctx.bezierCurveTo(
      waveX - 10, seaLevel - waveH * 0.95,
      waveX + 20, seaLevel - waveH,
      waveX + 50, seaLevel - waveH * 0.7
    );
    ctx.bezierCurveTo(
      waveX + 30, seaLevel - waveH * 0.85,
      waveX + 10, seaLevel - waveH * 0.9,
      waveX - 30, seaLevel - waveH * 0.8
    );
    ctx.fill();
  }

  private drawLand() {
    const ctx = this.ctx;
    const config = this.config;

    // Beach/coast transition
    const beachGradient = ctx.createLinearGradient(config.coastStartX, 0, config.townStartX, 0);
    beachGradient.addColorStop(0, colors.seafloor.sand);
    beachGradient.addColorStop(1, colors.land.grass);

    ctx.fillStyle = beachGradient;
    ctx.fillRect(config.coastEndX, config.groundLevel, config.townStartX - config.coastEndX, 400);

    // Main land
    ctx.fillStyle = colors.land.grass;
    ctx.fillRect(config.townStartX, config.groundLevel, config.townEndX - config.townStartX, 400);

    // Road
    ctx.fillStyle = colors.land.road;
    ctx.fillRect(config.townStartX, config.groundLevel - 5, config.townEndX - config.townStartX, 10);

    // Road markings
    ctx.strokeStyle = '#ffff00';
    ctx.lineWidth = 2;
    ctx.setLineDash([20, 20]);
    ctx.beginPath();
    ctx.moveTo(config.townStartX, config.groundLevel);
    ctx.lineTo(config.townEndX, config.groundLevel);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  private drawBuildings(state: SimulationState) {
    const ctx = this.ctx;

    state.buildings.forEach((building) => {
      if (building.destroyed) {
        this.drawDestroyedBuilding(building);
        return;
      }

      const buildingColors =
        building.type === 'commercial' ? colors.buildings.commercial : colors.buildings.residential;
      const baseColor = buildingColors[building.colorIndex];
      const roofColor = colors.buildings.roofs[building.roofColorIndex];

      // Building damage visualization
      const healthRatio = building.health / building.maxHealth;
      const damageColor = lerpColor(baseColor, '#4a4a4a', 1 - healthRatio);

      // Main structure
      ctx.fillStyle = damageColor;
      ctx.fillRect(building.x, building.y, building.width, building.height);

      // Roof
      ctx.fillStyle = roofColor;
      ctx.beginPath();
      ctx.moveTo(building.x - 5, building.y);
      ctx.lineTo(building.x + building.width / 2, building.y - 20);
      ctx.lineTo(building.x + building.width + 5, building.y);
      ctx.closePath();
      ctx.fill();

      // Windows
      ctx.fillStyle = healthRatio > 0.5 ? '#87ceeb' : '#4a4a4a';
      const windowSize = 12;
      const windowGap = 20;
      for (let wy = building.y + 15; wy < building.y + building.height - 20; wy += windowGap) {
        for (let wx = building.x + 10; wx < building.x + building.width - 15; wx += windowGap) {
          ctx.fillRect(wx, wy, windowSize, windowSize);
        }
      }

      // Door
      ctx.fillStyle = '#654321';
      ctx.fillRect(
        building.x + building.width / 2 - 8,
        building.y + building.height - 30,
        16,
        30
      );
    });
  }

  private drawDestroyedBuilding(building: any) {
    const ctx = this.ctx;

    // Rubble pile
    ctx.fillStyle = '#5d4037';
    ctx.beginPath();
    ctx.moveTo(building.x, this.config.groundLevel);
    ctx.lineTo(building.x + 10, this.config.groundLevel - 20);
    ctx.lineTo(building.x + building.width / 2, this.config.groundLevel - 30);
    ctx.lineTo(building.x + building.width - 10, this.config.groundLevel - 15);
    ctx.lineTo(building.x + building.width, this.config.groundLevel);
    ctx.closePath();
    ctx.fill();

    // Some standing walls
    ctx.fillStyle = '#7a6555';
    ctx.fillRect(building.x + 5, this.config.groundLevel - 40, 10, 40);
    if (building.width > 50) {
      ctx.fillRect(building.x + building.width - 20, this.config.groundLevel - 25, 8, 25);
    }
  }

  private drawVehicles(state: SimulationState) {
    const ctx = this.ctx;

    state.vehicles.forEach((vehicle) => {
      if (vehicle.destroyed) {
        // Draw wrecked vehicle
        ctx.fillStyle = '#4a4a4a';
        ctx.fillRect(vehicle.x, vehicle.y + 5, vehicle.width * 0.8, vehicle.height * 0.6);
        return;
      }

      const color = colors.vehicles.cars[vehicle.colorIndex];

      // Car body
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.roundRect(vehicle.x, vehicle.y, vehicle.width, vehicle.height, 3);
      ctx.fill();

      // Car roof
      ctx.fillStyle = lerpColor(color, '#000000', 0.2);
      ctx.fillRect(vehicle.x + 8, vehicle.y - 8, vehicle.width - 16, 10);

      // Windows
      ctx.fillStyle = '#87ceeb';
      ctx.fillRect(vehicle.x + 10, vehicle.y - 6, vehicle.width - 20, 6);

      // Wheels
      ctx.fillStyle = '#1a1a1a';
      ctx.beginPath();
      ctx.arc(vehicle.x + 8, vehicle.y + vehicle.height, 5, 0, Math.PI * 2);
      ctx.arc(vehicle.x + vehicle.width - 8, vehicle.y + vehicle.height, 5, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  private drawPeople(state: SimulationState) {
    const ctx = this.ctx;

    state.people.forEach((person) => {
      if (person.caught) {
        return; // Don't draw caught people
      }

      const skinColor = colors.people.skin[person.skinColorIndex];
      const clothesColor = colors.people.clothes[person.clothesColorIndex];

      const x = person.x;
      const y = person.y;

      // Running animation
      const runOffset = person.fleeing ? Math.sin(person.runFrame) * 3 : 0;
      const legOffset = person.fleeing ? Math.sin(person.runFrame * 2) * 5 : 0;

      // Head
      ctx.fillStyle = skinColor;
      ctx.beginPath();
      ctx.arc(x, y - 10 + runOffset, 5, 0, Math.PI * 2);
      ctx.fill();

      // Body
      ctx.fillStyle = clothesColor;
      ctx.fillRect(x - 3, y - 5 + runOffset, 6, 10);

      // Legs
      ctx.strokeStyle = clothesColor;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x - 2, y + 5 + runOffset);
      ctx.lineTo(x - 2 - legOffset, y + 15);
      ctx.moveTo(x + 2, y + 5 + runOffset);
      ctx.lineTo(x + 2 + legOffset, y + 15);
      ctx.stroke();

      // Arms (extended when running)
      if (person.fleeing) {
        ctx.beginPath();
        ctx.moveTo(x - 3, y - 3 + runOffset);
        ctx.lineTo(x - 8 - legOffset, y - 5);
        ctx.moveTo(x + 3, y - 3 + runOffset);
        ctx.lineTo(x + 8 + legOffset, y);
        ctx.stroke();
      }
    });
  }

  private drawDebris(state: SimulationState) {
    const ctx = this.ctx;

    state.debris.forEach((d) => {
      ctx.save();
      ctx.translate(d.x, d.y);
      ctx.rotate(d.rotation);

      ctx.fillStyle = d.type === 'wood' ? '#8b4513' : '#808080';
      ctx.fillRect(-d.size / 2, -d.size / 2, d.size, d.size);

      ctx.restore();
    });
  }

  private drawParticles(state: SimulationState) {
    const ctx = this.ctx;

    state.particles.forEach((p) => {
      const alpha = p.life / p.maxLife;

      if (p.type === 'spray' || p.type === 'splash') {
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.8})`;
      } else {
        ctx.fillStyle = `rgba(139, 119, 101, ${alpha * 0.5})`;
      }

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  private drawInundationWater(state: SimulationState) {
    // Only draw during inundation and aftermath phases
    if (state.phase !== 'inundation' && state.phase !== 'aftermath' && state.phase !== 'waveBreaking') {
      return;
    }

    const ctx = this.ctx;
    const config = this.config;

    // Find water levels that are in the town area
    const townWaterLevels = state.waterLevels.filter(
      (level) => level.x >= config.coastEndX && level.currentLevel < level.baseLevel
    );

    if (townWaterLevels.length === 0) return;

    // Create gradient for inundation water
    const gradient = ctx.createLinearGradient(
      config.coastEndX,
      config.groundLevel,
      config.townEndX,
      config.groundLevel - 100
    );
    gradient.addColorStop(0, 'rgba(0, 100, 150, 0.75)');
    gradient.addColorStop(0.5, 'rgba(0, 77, 120, 0.7)');
    gradient.addColorStop(1, 'rgba(0, 60, 100, 0.6)');

    ctx.fillStyle = gradient;
    ctx.beginPath();

    // Start from the coast
    let started = false;
    let lastX = config.coastEndX;

    state.waterLevels.forEach((level) => {
      if (level.x >= config.coastEndX - 50) {
        const waterHeight = level.baseLevel - level.currentLevel;
        if (waterHeight > 2) {
          if (!started) {
            ctx.moveTo(level.x, config.groundLevel);
            started = true;
          }
          ctx.lineTo(level.x, level.currentLevel);
          lastX = level.x;
        }
      }
    });

    if (started) {
      // Close the shape along the ground
      ctx.lineTo(lastX, config.groundLevel);
      ctx.lineTo(config.coastEndX - 50, config.groundLevel);
      ctx.closePath();
      ctx.fill();

      // Draw foam/turbulence at the water front
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      state.waterLevels.forEach((level) => {
        if (level.x >= config.townStartX) {
          const waterHeight = level.baseLevel - level.currentLevel;
          if (waterHeight > 5) {
            // Foam bubbles
            for (let i = 0; i < 3; i++) {
              const foamX = level.x + (Math.random() - 0.5) * 20;
              const foamY = level.currentLevel + Math.random() * 10;
              const foamSize = 2 + Math.random() * 4;
              ctx.beginPath();
              ctx.arc(foamX, foamY, foamSize, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        }
      });

      // Draw wave crest at the leading edge of inundation
      if (state.phase === 'inundation') {
        const frontLevel = townWaterLevels[townWaterLevels.length - 1];
        if (frontLevel) {
          const waterHeight = frontLevel.baseLevel - frontLevel.currentLevel;
          if (waterHeight > 10) {
            // Curling wave at front
            ctx.fillStyle = 'rgba(0, 150, 200, 0.8)';
            ctx.beginPath();
            ctx.arc(frontLevel.x + 20, frontLevel.currentLevel + 5, waterHeight * 0.3, 0, Math.PI * 2);
            ctx.fill();

            // White foam cap
            ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.beginPath();
            ctx.arc(frontLevel.x + 25, frontLevel.currentLevel, waterHeight * 0.2, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
    }
  }
}
