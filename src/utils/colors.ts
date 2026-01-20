export const colors = {
  sky: {
    top: '#1a5276',
    bottom: '#74b9ff',
    horizon: '#87ceeb',
  },
  ocean: {
    surface: '#0077be',
    deep: '#003366',
    shallow: '#00a8cc',
    foam: '#ffffff',
    wave: '#00d2d3',
  },
  seafloor: {
    deep: '#4a3728',
    shallow: '#8b6914',
    sand: '#d4a574',
    rock: '#5c4033',
  },
  land: {
    grass: '#228b22',
    dirt: '#8b4513',
    road: '#3a3a3a',
    sidewalk: '#b0b0b0',
  },
  buildings: {
    residential: ['#e8d4b8', '#d4c4a8', '#c9b896', '#f5e6d3'],
    commercial: ['#607d8b', '#78909c', '#90a4ae', '#455a64'],
    roofs: ['#8b4513', '#654321', '#a0522d', '#6b4423'],
  },
  vehicles: {
    cars: ['#c0392b', '#2980b9', '#27ae60', '#f39c12', '#8e44ad', '#34495e'],
  },
  people: {
    skin: ['#fdbcb4', '#e0ac69', '#c68642', '#8d5524'],
    clothes: ['#e74c3c', '#3498db', '#2ecc71', '#f1c40f', '#9b59b6', '#1abc9c'],
  },
  effects: {
    debris: '#6b4423',
    splash: 'rgba(255, 255, 255, 0.7)',
    dust: 'rgba(139, 119, 101, 0.5)',
  },
};

export function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function lerpColor(color1: string, color2: string, t: number): string {
  const r1 = parseInt(color1.slice(1, 3), 16);
  const g1 = parseInt(color1.slice(3, 5), 16);
  const b1 = parseInt(color1.slice(5, 7), 16);
  const r2 = parseInt(color2.slice(1, 3), 16);
  const g2 = parseInt(color2.slice(3, 5), 16);
  const b2 = parseInt(color2.slice(5, 7), 16);
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}
