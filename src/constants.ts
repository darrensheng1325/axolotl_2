import { ServerPlayer } from "./player";
import { Dot } from "./enemy";
import { Obstacle } from "./enemy";
import { Enemy } from "./server_utils";
import { Item } from "./item";

// Add these constants at the top with the others
export const FISH_DETECTION_RADIUS = 500;  // How far fish can detect players
export const PLAYER_BASE_SPEED = 5;  // Base player speed to match
export const FISH_RETURN_SPEED = 0.5;  // Speed at which fish return to their normal behavior

export const players: Record<string, ServerPlayer> = {};
export const dots: Dot[] = [];
export const enemies: Enemy[] = [];
export const obstacles: Obstacle[] = [];
export const items: Item[] = [];

export const WORLD_WIDTH = 10000;
export const WORLD_HEIGHT = 2000;
//export let ENEMY_COUNT = 200;
export const OBSTACLE_COUNT = 20;
export const ENEMY_CORAL_PROBABILITY = 0.3;
export const ENEMY_CORAL_HEALTH = 50;
export const ENEMY_CORAL_DAMAGE = 5;

export const PLAYER_MAX_HEALTH = 100;
export const ENEMY_MAX_HEALTH = 50;
export const PLAYER_DAMAGE = 5;
export const ENEMY_DAMAGE = 20;
export const DECORATION_COUNT = 100;
export const SAND_COUNT = 50;  // Reduced from 200 to 50
export const MIN_SAND_RADIUS = 50;  // Increased from 30 to 50
export const MAX_SAND_RADIUS = 120; // Increased from 80 to 120

export const ENEMY_TIERS = {
  common: { health: 5, speed: 0.5, damage: 5, probability: 0.4, color: '#808080' },
  uncommon: { health: 40, speed: 0.75, damage: 10, probability: 0.3, color: '#008000' },
  rare: { health: 60, speed: 1, damage: 15, probability: 0.15, color: '#0000FF' },
  epic: { health: 80, speed: 1.25, damage: 20, probability: 0.1, color: '#800080' },
  legendary: { health: 100, speed: 1.5, damage: 25, probability: 0.04, color: '#FFA500' },
  mythic: { health: 150, speed: 2, damage: 30, probability: 0.01, color: '#FF0000' }
};

export const MAX_INVENTORY_SIZE = 5;

export const RESPAWN_INVULNERABILITY_TIME = 3000; // 3 seconds of invulnerability after respawn

// Add knockback constants at the top with other constants
export const KNOCKBACK_FORCE = 20; // Increased from 20 to 100
export const KNOCKBACK_RECOVERY_SPEED = 0.9; // How quickly the knockback effect diminishes

// Add XP-related constants
export const BASE_XP_REQUIREMENT = 100;
export const XP_MULTIPLIER = 1.5;
export const HEALTH_PER_LEVEL = 10;
export const DAMAGE_PER_LEVEL = 2;
export const PLAYER_SIZE = 40;
export const ENEMY_SIZE = 40;

// Define zone boundaries for different tiers
export const ZONE_BOUNDARIES = {
    common: { start: 0, end: 2000 },
    uncommon: { start: 2000, end: 4000 },
    rare: { start: 4000, end: 6000 },
    epic: { start: 6000, end: 8000 },
    legendary: { start: 8000, end: 9000 },
    mythic: { start: 9000, end: WORLD_WIDTH }
};

// Add enemy size multipliers like in singleplayer
export const ENEMY_SIZE_MULTIPLIERS = {
    common: 1.0,
    uncommon: 1.2,
    rare: 1.4,
    epic: 1.6,
    legendary: 1.8,
    mythic: 2.0
};

// Add drop chances like in singleplayer
export const DROP_CHANCES = {
    common: 1,      // 10% chance
    uncommon: 0.2,    // 20% chance
    rare: 0.3,        // 30% chance
    epic: 0.4,        // 40% chance
    legendary: 0.5,   // 50% chance
    mythic: 0.75      // 75% chance
};