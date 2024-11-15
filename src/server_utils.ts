import { WORLD_WIDTH, WORLD_HEIGHT, SAND_COUNT, MIN_SAND_RADIUS, MAX_SAND_RADIUS } from "./constants";

const sands: Sand[] = [];

export interface Dot {
  x: number;
  y: number;
}

export interface Enemy {
  id: string;
  type: 'octopus' | 'fish';
  tier: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic';
  x: number;
  y: number;
  angle: number;
  health: number;
  speed: number;
  damage: number;
  knockbackX?: number;
  knockbackY?: number;
  isHostile?: boolean;
}

export interface Obstacle {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'coral';
  isEnemy: boolean;
  health?: number;
}

export interface Item {
  id: string;
  type: 'health_potion' | 'speed_boost' | 'shield';
  x: number;
  y: number;
}

export interface Sand {
  x: number;
  y: number;
  radius: number;  // Random size for each sand blob
  rotation: number;  // For slight variation in shape
}

export interface Decoration {
  x: number;
  y: number;
  scale: number;  // For random sizes
}

export function getRandomPositionInZone(zoneIndex: number) {
  const zoneWidth = WORLD_WIDTH / 6;  // 6 zones
  const startX = zoneIndex * zoneWidth;
  
  // For legendary and mythic zones, ensure they're in the rightmost areas
  if (zoneIndex >= 4) {  // Legendary and Mythic zones
      const adjustedStartX = WORLD_WIDTH - (6 - zoneIndex) * (zoneWidth / 2);  // Start from right side
      return {
          x: adjustedStartX + Math.random() * (WORLD_WIDTH - adjustedStartX),
          y: Math.random() * WORLD_HEIGHT
      };
  }
  
  return {
      x: startX + Math.random() * zoneWidth,
      y: Math.random() * WORLD_HEIGHT
  };
}


export function createDecoration() {
  const zoneIndex = Math.floor(Math.random() * 6);  // 6 zones
  const pos = getRandomPositionInZone(zoneIndex);
  return {
      x: pos.x,
      y: pos.y,
      scale: 0.5 + Math.random() * 1.5
  };
}

export function createSand(): Sand {
  // Create sand patches with more spacing
  const sectionWidth = WORLD_WIDTH  // Divide world into sections
  const sectionIndex = sands.length;
  
  return {
      x: (sectionIndex * sectionWidth) + Math.random() * sectionWidth,  // Spread out along x-axis
      y: Math.random() * WORLD_HEIGHT,
      radius: MIN_SAND_RADIUS + Math.random() * (MAX_SAND_RADIUS - MIN_SAND_RADIUS),
      rotation: Math.random() * Math.PI * 2
  };
}
