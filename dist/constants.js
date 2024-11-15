"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DROP_CHANCES = exports.ENEMY_SIZE_MULTIPLIERS = exports.ZONE_BOUNDARIES = exports.ENEMY_SIZE = exports.PLAYER_SIZE = exports.DAMAGE_PER_LEVEL = exports.HEALTH_PER_LEVEL = exports.XP_MULTIPLIER = exports.BASE_XP_REQUIREMENT = exports.KNOCKBACK_RECOVERY_SPEED = exports.KNOCKBACK_FORCE = exports.RESPAWN_INVULNERABILITY_TIME = exports.MAX_INVENTORY_SIZE = exports.ENEMY_TIERS = exports.ENEMY_DAMAGE = exports.PLAYER_DAMAGE = exports.ENEMY_MAX_HEALTH = exports.PLAYER_MAX_HEALTH = exports.ENEMY_CORAL_DAMAGE = exports.ENEMY_CORAL_HEALTH = exports.ENEMY_CORAL_PROBABILITY = exports.OBSTACLE_COUNT = exports.ENEMY_COUNT = exports.WORLD_HEIGHT = exports.WORLD_WIDTH = exports.items = exports.obstacles = exports.enemies = exports.dots = exports.players = exports.FISH_RETURN_SPEED = exports.PLAYER_BASE_SPEED = exports.FISH_DETECTION_RADIUS = void 0;
// Add these constants at the top with the others
exports.FISH_DETECTION_RADIUS = 500; // How far fish can detect players
exports.PLAYER_BASE_SPEED = 5; // Base player speed to match
exports.FISH_RETURN_SPEED = 0.5; // Speed at which fish return to their normal behavior
exports.players = {};
exports.dots = [];
exports.enemies = [];
exports.obstacles = [];
exports.items = [];
exports.WORLD_WIDTH = 10000;
exports.WORLD_HEIGHT = 2000;
exports.ENEMY_COUNT = 200;
exports.OBSTACLE_COUNT = 20;
exports.ENEMY_CORAL_PROBABILITY = 0.3;
exports.ENEMY_CORAL_HEALTH = 50;
exports.ENEMY_CORAL_DAMAGE = 5;
exports.PLAYER_MAX_HEALTH = 100;
exports.ENEMY_MAX_HEALTH = 50;
exports.PLAYER_DAMAGE = 5;
exports.ENEMY_DAMAGE = 20;
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
    common: { start: 0, end: 2000 },
    uncommon: { start: 2000, end: 4000 },
    rare: { start: 4000, end: 6000 },
    epic: { start: 6000, end: 8000 },
    legendary: { start: 8000, end: 9000 },
    mythic: { start: 9000, end: exports.WORLD_WIDTH }
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
    uncommon: 0.2, // 20% chance
    rare: 0.3, // 30% chance
    epic: 0.4, // 40% chance
    legendary: 0.5, // 50% chance
    mythic: 0.75 // 75% chance
};
