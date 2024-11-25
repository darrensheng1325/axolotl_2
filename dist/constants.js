"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WORLD_MAP = exports.MAZE_WALL_THICKNESS = exports.MAZE_CELL_SIZE = exports.DROP_CHANCES = exports.ENEMY_SIZE_MULTIPLIERS = exports.ZONE_BOUNDARIES = exports.ENEMY_SIZE = exports.PLAYER_SIZE = exports.DAMAGE_PER_LEVEL = exports.HEALTH_PER_LEVEL = exports.XP_MULTIPLIER = exports.BASE_XP_REQUIREMENT = exports.KNOCKBACK_RECOVERY_SPEED = exports.KNOCKBACK_FORCE = exports.RESPAWN_INVULNERABILITY_TIME = exports.MAX_INVENTORY_SIZE = exports.ENEMY_TIERS = exports.MAX_SAND_RADIUS = exports.MIN_SAND_RADIUS = exports.SAND_COUNT = exports.DECORATION_COUNT = exports.ENEMY_DAMAGE = exports.PLAYER_DAMAGE = exports.ENEMY_MAX_HEALTH = exports.PLAYER_MAX_HEALTH = exports.ENEMY_CORAL_DAMAGE = exports.ENEMY_CORAL_HEALTH = exports.ENEMY_CORAL_PROBABILITY = exports.OBSTACLE_COUNT = exports.SCALE_FACTOR = exports.ACTUAL_WORLD_HEIGHT = exports.ACTUAL_WORLD_WIDTH = exports.WORLD_HEIGHT = exports.WORLD_WIDTH = exports.items = exports.obstacles = exports.enemies = exports.dots = exports.players = exports.FISH_RETURN_SPEED = exports.PLAYER_BASE_SPEED = exports.FISH_DETECTION_RADIUS = void 0;
exports.validateWorldMap = validateWorldMap;
exports.isWall = isWall;
exports.isSpawn = isSpawn;
exports.isTeleporter = isTeleporter;
exports.isSafeZone = isSafeZone;
// Add these constants at the top with the others
exports.FISH_DETECTION_RADIUS = 500; // How far fish can detect players
exports.PLAYER_BASE_SPEED = 5; // Base player speed to match
exports.FISH_RETURN_SPEED = 0.5; // Speed at which fish return to their normal behavior
exports.players = {};
exports.dots = [];
exports.enemies = [];
exports.obstacles = [];
exports.items = [];
exports.WORLD_WIDTH = 20000;
exports.WORLD_HEIGHT = 20000;
exports.ACTUAL_WORLD_WIDTH = 20000;
exports.ACTUAL_WORLD_HEIGHT = 20000;
exports.SCALE_FACTOR = 1;
//export let ENEMY_COUNT = 200;
exports.OBSTACLE_COUNT = 20;
exports.ENEMY_CORAL_PROBABILITY = 0.3;
exports.ENEMY_CORAL_HEALTH = 50;
exports.ENEMY_CORAL_DAMAGE = 5;
exports.PLAYER_MAX_HEALTH = 100;
exports.ENEMY_MAX_HEALTH = 50;
exports.PLAYER_DAMAGE = 5;
exports.ENEMY_DAMAGE = 20;
exports.DECORATION_COUNT = 100;
exports.SAND_COUNT = 50; // Reduced from 200 to 50
exports.MIN_SAND_RADIUS = 50; // Increased from 30 to 50
exports.MAX_SAND_RADIUS = 120; // Increased from 80 to 120
exports.ENEMY_TIERS = {
    common: { health: 5, speed: 0.5, damage: 5, probability: 0.4, color: '#808080' },
    uncommon: { health: 40, speed: 0.75, damage: 10, probability: 0.3, color: '#008000' },
    rare: { health: 60, speed: 1, damage: 15, probability: 0.15, color: '#0000FF' },
    epic: { health: 80, speed: 1.25, damage: 20, probability: 0.1, color: '#800080' },
    legendary: { health: 100, speed: 1.5, damage: 25, probability: 0.04, color: '#FFA500' },
    mythic: { health: 150, speed: 2, damage: 30, probability: 0.01, color: '#FF0000' }
};
exports.MAX_INVENTORY_SIZE = 5;
exports.RESPAWN_INVULNERABILITY_TIME = 3000; // 3 seconds of invulnerability after respawn
// Add knockback constants at the top with other constants
exports.KNOCKBACK_FORCE = 20; // Increased from 20 to 100
exports.KNOCKBACK_RECOVERY_SPEED = 0.9; // How quickly the knockback effect diminishes
// Add XP-related constants
exports.BASE_XP_REQUIREMENT = 100;
exports.XP_MULTIPLIER = 1.5;
exports.HEALTH_PER_LEVEL = 10;
exports.DAMAGE_PER_LEVEL = 2;
exports.PLAYER_SIZE = 40;
exports.ENEMY_SIZE = 40;
// Define zone boundaries for different tiers
exports.ZONE_BOUNDARIES = {
    common: { start: 0, end: 4000 },
    uncommon: { start: 4000, end: 8000 },
    rare: { start: 8000, end: 12000 },
    epic: { start: 12000, end: 16000 },
    legendary: { start: 16000, end: 18000 },
    mythic: { start: 18000, end: exports.WORLD_WIDTH }
};
// Add enemy size multipliers like in singleplayer
exports.ENEMY_SIZE_MULTIPLIERS = {
    common: 1.0,
    uncommon: 1.2,
    rare: 1.4,
    epic: 1.6,
    legendary: 1.8,
    mythic: 2.0
};
// Add drop chances like in singleplayer
exports.DROP_CHANCES = {
    common: 1, // 10% chance
    uncommon: 1, // 20% chance
    rare: 1, // 30% chance
    epic: 1, // 40% chance
    legendary: 1, // 50% chance
    mythic: 1 // 75% chance
};
// Add maze configuration
exports.MAZE_CELL_SIZE = 1000; // Size of each maze cell
exports.MAZE_WALL_THICKNESS = 100; // Thickness of maze walls
// Define the permanent map layout
exports.WORLD_MAP = [
    // Border walls
    {
        type: 'wall',
        x: 0,
        y: 0,
        width: exports.WORLD_WIDTH,
        height: 100
    }, // Top wall
    {
        type: 'wall',
        x: 0,
        y: exports.WORLD_HEIGHT - 100,
        width: exports.WORLD_WIDTH,
        height: 100
    }, // Bottom wall
    {
        type: 'wall',
        x: 0,
        y: 0,
        width: 100,
        height: exports.WORLD_HEIGHT
    }, // Left wall
    {
        type: 'wall',
        x: exports.WORLD_WIDTH - 100,
        y: 0,
        width: 100,
        height: exports.WORLD_HEIGHT
    }, // Right wall
    // ... (rest of your map elements)
    {
        "type": "spawn",
        "x": 4756.5625,
        "y": 3430,
        "width": 1870,
        "height": 1780,
        "properties": {
            "spawnType": "common"
        }
    },
    {
        "type": "wall",
        "x": 4536.5625,
        "y": 2510,
        "width": 2230,
        "height": 910,
        "properties": {}
    },
    {
        "type": "wall",
        "x": 4096.5625,
        "y": 3080,
        "width": 660,
        "height": 2210,
        "properties": {}
    },
    {
        "type": "wall",
        "x": 4656.5625,
        "y": 5250,
        "width": 2000,
        "height": 850,
        "properties": {}
    },
    {
        "type": "wall",
        "x": 6776.5625,
        "y": 3060,
        "width": 1350,
        "height": 1460,
        "properties": {}
    },
    {
        "type": "wall",
        "x": 7746.5625,
        "y": 4480,
        "width": 970,
        "height": 2730,
        "properties": {}
    },
    {
        "type": "wall",
        "x": 5236.5625,
        "y": 6090,
        "width": 890,
        "height": 2360,
        "properties": {}
    },
    {
        "type": "wall",
        "x": 1576.5625,
        "y": 2510,
        "width": 1100,
        "height": 6360,
        "properties": {}
    },
    {
        "type": "wall",
        "x": 1766.5625,
        "y": 8810,
        "width": 1970,
        "height": 2850,
        "properties": {}
    },
    {
        "type": "wall",
        "x": 5996.5625,
        "y": 8350,
        "width": 1610,
        "height": 2490,
        "properties": {}
    },
    {
        "type": "teleporter",
        "x": -3.4375,
        "y": 7960,
        "width": 1580,
        "height": 1320,
        "properties": {
            "teleportTo": {
                "x": 0,
                "y": 0
            }
        }
    },
    {
        "type": "wall",
        "x": 16.5625,
        "y": 8930,
        "width": 1870,
        "height": 3240,
        "properties": {}
    },
    {
        "type": "wall",
        "x": 4686.5625,
        "y": 10,
        "width": 1590,
        "height": 2490,
        "properties": {}
    },
    {
        "type": "wall",
        "x": 4716.5625,
        "y": 2440,
        "width": 1570,
        "height": 400,
        "properties": {}
    },
    {
        "type": "wall",
        "x": 4856.5625,
        "y": 12180,
        "width": 3780,
        "height": 2480,
        "properties": {}
    },
    {
        "type": "wall",
        "x": 2486.5625,
        "y": 14000,
        "width": 3810,
        "height": 1790,
        "properties": {}
    },
    {
        "type": "wall",
        "x": 3676.5625,
        "y": 17400,
        "width": 3290,
        "height": 1260,
        "properties": {}
    },
    {
        "type": "wall",
        "x": 9076.5625,
        "y": 8620,
        "width": 3020,
        "height": 1820,
        "properties": {}
    },
    {
        "type": "wall",
        "x": 8306.5625,
        "y": 11640,
        "width": 5260,
        "height": 1570,
        "properties": {}
    },
    {
        "type": "wall",
        "x": 8546.5625,
        "y": 7000,
        "width": 1280,
        "height": 1800,
        "properties": {}
    },
    {
        "type": "wall",
        "x": 7586.5625,
        "y": 14180,
        "width": 5810,
        "height": 2080,
        "properties": {}
    },
    {
        "type": "wall",
        "x": 13016.5625,
        "y": 15890,
        "width": 2860,
        "height": 4100,
        "properties": {}
    },
    {
        "type": "wall",
        "x": 16956.5625,
        "y": 16900,
        "width": 20,
        "height": 0,
        "properties": {}
    },
    {
        "type": "safe_zone",
        "x": 12056.5625,
        "y": 10330,
        "width": 1560,
        "height": 1370,
        "properties": {}
    },
    {
        "type": "wall",
        "x": 11996.5625,
        "y": 9800,
        "width": 3150,
        "height": 770,
        "properties": {}
    },
    {
        "type": "wall",
        "x": 13466.5625,
        "y": 11600,
        "width": 2250,
        "height": 750,
        "properties": {}
    },
    {
        "type": "wall",
        "x": 15086.5625,
        "y": 10190,
        "width": 2610,
        "height": 580,
        "properties": {}
    },
    {
        "type": "wall",
        "x": 16026.5625,
        "y": 13080,
        "width": 2690,
        "height": 930,
        "properties": {}
    },
    {
        "type": "wall",
        "x": 17686.5625,
        "y": 6450,
        "width": 1280,
        "height": 3880,
        "properties": {}
    },
    {
        "type": "wall",
        "x": 13876.5625,
        "y": 2270,
        "width": 4550,
        "height": 2210,
        "properties": {}
    },
    {
        "type": "wall",
        "x": 12966.5625,
        "y": 4230,
        "width": 2480,
        "height": 3250,
        "properties": {}
    },
    {
        "type": "wall",
        "x": 8656.5625,
        "y": 750,
        "width": 3780,
        "height": 1890,
        "properties": {}
    },
    {
        "type": "wall",
        "x": 10066.5625,
        "y": 2640,
        "width": 1120,
        "height": 3780,
        "properties": {}
    },
    {
        "type": "wall",
        "x": 8986.5625,
        "y": 17640,
        "width": 2490,
        "height": 570,
        "properties": {}
    },
    {
        "type": "wall",
        "x": 11346.5625,
        "y": 17070,
        "width": 560,
        "height": 2220,
        "properties": {}
    }
];
// Add map validation function
function validateWorldMap(map) {
    // Check for required border walls
    const hasTopWall = map.some(el => el.type === 'wall' && el.y === 0 && el.width === exports.WORLD_WIDTH);
    const hasBottomWall = map.some(el => el.type === 'wall' && el.y === exports.WORLD_HEIGHT - 100);
    const hasLeftWall = map.some(el => el.type === 'wall' && el.x === 0);
    const hasRightWall = map.some(el => el.type === 'wall' && el.x === exports.WORLD_WIDTH - 100);
    if (!hasTopWall || !hasBottomWall || !hasLeftWall || !hasRightWall) {
        console.error('Map is missing border walls');
        return false;
    }
    // Check for at least one spawn point per tier
    const spawnTypes = map
        .filter(el => el.type === 'spawn')
        .map(el => el.properties?.spawnType)
        .filter((type) => type !== undefined);
    const requiredSpawnTypes = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'];
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
function elementsOverlap(a, b) {
    return !(a.x + a.width < b.x ||
        b.x + b.width < a.x ||
        a.y + a.height < b.y ||
        b.y + b.height < a.y);
}
// Add map element type guards
function isWall(element) {
    return element.type === 'wall';
}
function isSpawn(element) {
    return element.type === 'spawn';
}
function isTeleporter(element) {
    return element.type === 'teleporter';
}
function isSafeZone(element) {
    return element.type === 'safe_zone';
}
