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