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

export const WORLD_WIDTH = 20000;
export const WORLD_HEIGHT = 20000;
export const ACTUAL_WORLD_WIDTH = 20000;
export const ACTUAL_WORLD_HEIGHT = 20000;
export const SCALE_FACTOR = 1;
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
    common: { start: 0, end: 4000 },
    uncommon: { start: 4000, end: 8000 },
    rare: { start: 8000, end: 12000 },
    epic: { start: 12000, end: 16000 },
    legendary: { start: 16000, end: 18000 },
    mythic: { start: 18000, end: WORLD_WIDTH }
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
    uncommon: 1,    // 20% chance
    rare: 1,        // 30% chance
    epic: 1,        // 40% chance
    legendary: 1,   // 50% chance
    mythic: 1      // 75% chance
};

// Add maze configuration
export const MAZE_CELL_SIZE = 1000;  // Size of each maze cell
export const MAZE_WALL_THICKNESS = 100;  // Thickness of maze walls

// Add map configuration
export interface MapElement {
    type: 'wall' | 'spawn' | 'teleporter' | 'safe_zone';
    x: number;
    y: number;
    width: number;
    height: number;
    properties?: {
        teleportTo?: { x: number; y: number };
        spawnType?: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic';
        isNoCombat?: boolean;
        isSafeZone?: boolean;
    };
}

// Define the permanent map layout
export const WORLD_MAP: MapElement[] = [
    // Border walls
    { 
        type: 'wall', 
        x: 0, 
        y: 0, 
        width: WORLD_WIDTH, 
        height: 100 
    },  // Top wall
    { 
        type: 'wall', 
        x: 0, 
        y: WORLD_HEIGHT - 100, 
        width: WORLD_WIDTH, 
        height: 100 
    },  // Bottom wall
    { 
        type: 'wall', 
        x: 0, 
        y: 0, 
        width: 100, 
        height: WORLD_HEIGHT 
    },  // Left wall
    { 
        type: 'wall', 
        x: WORLD_WIDTH - 100, 
        y: 0, 
        width: 100, 
        height: WORLD_HEIGHT 
    },  // Right wall

    // ... (rest of your map elements)
];

// Add map validation function
export function validateWorldMap(map: MapElement[]): boolean {
    // Check for required border walls
    const hasTopWall = map.some(el => el.type === 'wall' && el.y === 0 && el.width === WORLD_WIDTH);
    const hasBottomWall = map.some(el => el.type === 'wall' && el.y === WORLD_HEIGHT - 100);
    const hasLeftWall = map.some(el => el.type === 'wall' && el.x === 0);
    const hasRightWall = map.some(el => el.type === 'wall' && el.x === WORLD_WIDTH - 100);

    if (!hasTopWall || !hasBottomWall || !hasLeftWall || !hasRightWall) {
        console.error('Map is missing border walls');
        return false;
    }

    // Check for at least one spawn point per tier
    const spawnTypes = map
        .filter(el => el.type === 'spawn')
        .map(el => el.properties?.spawnType)
        .filter((type): type is ('common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic') => type !== undefined);
    
    const requiredSpawnTypes: ('common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic')[] = 
        ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'];
    const hasAllSpawnTypes = requiredSpawnTypes.every(type => spawnTypes.includes(type));

    if (!hasAllSpawnTypes) {
        console.error('Map is missing spawn points for some tiers');
        return false;
    }

    // Check for overlapping elements
    for (let i = 0; i < map.length; i++) {
        for (let j = i + 1; j < map.length; j++) {
            if (elementsOverlap(map[i], map[j])) {
                console.error('Map has overlapping elements:', map[i], map[j]);
                return false;
            }
        }
    }

    return true;
}

function elementsOverlap(a: MapElement, b: MapElement): boolean {
    return !(
        a.x + a.width < b.x ||
        b.x + b.width < a.x ||
        a.y + a.height < b.y ||
        b.y + b.height < a.y
    );
}

// Add map element type guards
export function isWall(element: MapElement): boolean {
    return element.type === 'wall';
}

export function isSpawn(element: MapElement): boolean {
    return element.type === 'spawn';
}

export function isTeleporter(element: MapElement): boolean {
    return element.type === 'teleporter';
}

export function isSafeZone(element: MapElement): boolean {
    return element.type === 'safe_zone';
}