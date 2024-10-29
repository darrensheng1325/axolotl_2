import {Item} from './item';

export interface Player {
  id: string;
  x: number;
  y: number;
  angle: number;
  score: number;
  imageLoaded: boolean;
  image: HTMLImageElement;
  velocityX: number;
  velocityY: number;
  health: number; // Add health property
  inventory: Item[];
  level: number;
  xp: number;
  xpToNextLevel: number;
  maxHealth: number;
  damage: number;
}