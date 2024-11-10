"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const https_1 = require("https");
const socket_io_1 = require("socket.io");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const database_1 = require("./database");
const app = (0, express_1.default)();
// Add body parser middleware for JSON
app.use(express_1.default.json());
// Add CORS middleware with specific origin
app.use((req, res, next) => {
    const origin = req.headers.origin || 'https://localhost:8080';
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    res.header('Access-Control-Allow-Credentials', 'true');
    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
    }
    else {
        next();
    }
});
// Authentication endpoints
app.post('/auth/register', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required' });
    }
    const user = database_1.database.createUser(username, password);
    if (user) {
        res.status(201).json({ message: 'User created successfully' });
    }
    else {
        res.status(400).json({ message: 'Username already exists' });
    }
});
app.post('/auth/login', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required' });
    }
    const user = database_1.database.getUser(username, password);
    if (user) {
        // You might want to set up a session here
        res.json({ message: 'Login successful', userId: user.id });
    }
    else {
        res.status(401).json({ message: 'Invalid credentials' });
    }
});
app.post('/auth/verify', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required' });
    }
    const user = database_1.database.getUser(username, password);
    if (user) {
        res.json({ valid: true });
    }
    else {
        res.status(401).json({ valid: false });
    }
});
app.post('/auth/logout', (req, res) => {
    // Handle any cleanup needed
    res.json({ message: 'Logged out successfully' });
});
// Serve static files from the dist directory
app.use(express_1.default.static(path_1.default.join(__dirname, '../dist')));
const httpsServer = (0, https_1.createServer)({
    key: fs_1.default.readFileSync('cert.key'),
    cert: fs_1.default.readFileSync('cert.crt')
}, app);
const io = new socket_io_1.Server(httpsServer, {
    cors: {
        origin: function (origin, callback) {
            // Allow requests with no origin (like mobile apps or curl requests)
            if (!origin)
                return callback(null, true);
            // Use the origin of the request
            callback(null, origin);
        },
        methods: ["GET", "POST"],
        credentials: true
    }
});
const PORT = process.env.PORT || 3000;
const players = {};
const dots = [];
const enemies = [];
const obstacles = [];
const items = [];
const WORLD_WIDTH = 10000;
const WORLD_HEIGHT = 2000;
const ENEMY_COUNT = 500;
const OBSTACLE_COUNT = 20;
const ENEMY_CORAL_PROBABILITY = 0.3;
const ENEMY_CORAL_HEALTH = 50;
const ENEMY_CORAL_DAMAGE = 5;
const PLAYER_MAX_HEALTH = 100;
const ENEMY_MAX_HEALTH = 50;
const PLAYER_DAMAGE = 10;
const ENEMY_DAMAGE = 5;
const ENEMY_TIERS = {
    common: { health: 20, speed: 0.5, damage: 5, probability: 0.4, color: '#808080' },
    uncommon: { health: 40, speed: 0.75, damage: 10, probability: 0.3, color: '#008000' },
    rare: { health: 60, speed: 1, damage: 15, probability: 0.15, color: '#0000FF' },
    epic: { health: 80, speed: 1.25, damage: 20, probability: 0.1, color: '#800080' },
    legendary: { health: 100, speed: 1.5, damage: 25, probability: 0.04, color: '#FFA500' },
    mythic: { health: 150, speed: 2, damage: 30, probability: 0.01, color: '#FF0000' }
};
const ITEM_COUNT = 10;
const MAX_INVENTORY_SIZE = 5;
const RESPAWN_INVULNERABILITY_TIME = 3000; // 3 seconds of invulnerability after respawn
// Add knockback constants at the top with other constants
const KNOCKBACK_FORCE = 20; // Increased from 20 to 100
const KNOCKBACK_RECOVERY_SPEED = 0.9; // How quickly the knockback effect diminishes
// Add XP-related constants
const BASE_XP_REQUIREMENT = 100;
const XP_MULTIPLIER = 1.5;
const MAX_LEVEL = 50;
const HEALTH_PER_LEVEL = 10;
const DAMAGE_PER_LEVEL = 2;
const PLAYER_SIZE = 40;
const ENEMY_SIZE = 40;
// Define zone boundaries for different tiers
const ZONE_BOUNDARIES = {
    common: { start: 0, end: 2000 },
    uncommon: { start: 2000, end: 4000 },
    rare: { start: 4000, end: 6000 },
    epic: { start: 6000, end: 8000 },
    legendary: { start: 8000, end: 9000 },
    mythic: { start: 9000, end: WORLD_WIDTH }
};
// Add enemy size multipliers like in singleplayer
const ENEMY_SIZE_MULTIPLIERS = {
    common: 1.0,
    uncommon: 1.2,
    rare: 1.4,
    epic: 1.6,
    legendary: 1.8,
    mythic: 2.0
};
// Add drop chances like in singleplayer
const DROP_CHANCES = {
    common: 0.1, // 10% chance
    uncommon: 0.2, // 20% chance
    rare: 0.3, // 30% chance
    epic: 0.4, // 40% chance
    legendary: 0.5, // 50% chance
    mythic: 0.75 // 75% chance
};
// Update createEnemy to ensure enemies spawn in their correct zones
function createEnemy() {
    // First, decide the x position
    const x = Math.random() * WORLD_WIDTH;
    // Determine tier based on x position
    let tier = 'common';
    for (const [t, zone] of Object.entries(ZONE_BOUNDARIES)) {
        if (x >= zone.start && x < zone.end) {
            tier = t;
            break;
        }
    }
    const tierData = ENEMY_TIERS[tier];
    return {
        id: Math.random().toString(36).substr(2, 9),
        type: Math.random() < 0.5 ? 'octopus' : 'fish',
        tier,
        x: x, // Use the determined x position
        y: Math.random() * WORLD_HEIGHT,
        angle: Math.random() * Math.PI * 2,
        health: tierData.health,
        speed: tierData.speed,
        damage: tierData.damage,
        knockbackX: 0,
        knockbackY: 0
    };
}
function moveEnemies() {
    enemies.forEach(enemy => {
        // Apply knockback recovery
        if (enemy.knockbackX) {
            enemy.knockbackX *= KNOCKBACK_RECOVERY_SPEED;
            enemy.x += enemy.knockbackX;
            if (Math.abs(enemy.knockbackX) < 0.1)
                enemy.knockbackX = 0;
        }
        if (enemy.knockbackY) {
            enemy.knockbackY *= KNOCKBACK_RECOVERY_SPEED;
            enemy.y += enemy.knockbackY;
            if (Math.abs(enemy.knockbackY) < 0.1)
                enemy.knockbackY = 0;
        }
        // Regular movement
        if (enemy.type === 'octopus') {
            enemy.x += (Math.random() * 4 - 2) * enemy.speed;
            enemy.y += (Math.random() * 4 - 2) * enemy.speed;
        }
        else {
            enemy.x += Math.cos(enemy.angle) * 2 * enemy.speed;
            enemy.y += Math.sin(enemy.angle) * 2 * enemy.speed;
        }
        // Keep enemy within its zone boundaries
        const zone = ZONE_BOUNDARIES[enemy.tier];
        if (enemy.x < zone.start || enemy.x >= zone.end) {
            // Reverse direction if exiting zone
            if (enemy.type === 'fish') {
                enemy.angle = Math.PI - enemy.angle; // Reverse direction
            }
            enemy.x = Math.max(zone.start, Math.min(zone.end - 1, enemy.x));
        }
        // Wrap around only for Y axis
        enemy.y = (enemy.y + WORLD_HEIGHT) % WORLD_HEIGHT;
        if (enemy.type === 'fish' && Math.random() < 0.02) {
            enemy.angle = Math.random() * Math.PI * 2;
        }
    });
}
function createObstacle() {
    const isEnemy = Math.random() < ENEMY_CORAL_PROBABILITY;
    return {
        id: Math.random().toString(36).substr(2, 9),
        x: Math.random() * WORLD_WIDTH,
        y: Math.random() * WORLD_HEIGHT,
        width: 50 + Math.random() * 50, // Random width between 50 and 100
        height: 50 + Math.random() * 50, // Random height between 50 and 100
        type: 'coral',
        isEnemy: isEnemy,
        health: isEnemy ? ENEMY_CORAL_HEALTH : undefined
    };
}
function createItem() {
    return {
        id: Math.random().toString(36).substr(2, 9),
        type: ['health_potion', 'speed_boost', 'shield'][Math.floor(Math.random() * 3)],
        x: Math.random() * WORLD_WIDTH,
        y: Math.random() * WORLD_HEIGHT
    };
}
// Initialize enemies
for (let i = 0; i < ENEMY_COUNT; i++) {
    enemies.push(createEnemy());
}
// Initialize obstacles
for (let i = 0; i < OBSTACLE_COUNT; i++) {
    obstacles.push(createObstacle());
}
// Initialize items
for (let i = 0; i < ITEM_COUNT; i++) {
    items.push(createItem());
}
function respawnPlayer(player) {
    // Determine spawn zone based on player level
    let spawnX;
    if (player.level <= 5) {
        spawnX = Math.random() * ZONE_BOUNDARIES.common.end;
    }
    else if (player.level <= 10) {
        spawnX = ZONE_BOUNDARIES.uncommon.start + Math.random() * (ZONE_BOUNDARIES.uncommon.end - ZONE_BOUNDARIES.uncommon.start);
    }
    else if (player.level <= 15) {
        spawnX = ZONE_BOUNDARIES.rare.start + Math.random() * (ZONE_BOUNDARIES.rare.end - ZONE_BOUNDARIES.rare.start);
    }
    else if (player.level <= 25) {
        spawnX = ZONE_BOUNDARIES.epic.start + Math.random() * (ZONE_BOUNDARIES.epic.end - ZONE_BOUNDARIES.epic.start);
    }
    else if (player.level <= 40) {
        spawnX = ZONE_BOUNDARIES.legendary.start + Math.random() * (ZONE_BOUNDARIES.legendary.end - ZONE_BOUNDARIES.legendary.start);
    }
    else {
        spawnX = ZONE_BOUNDARIES.mythic.start + Math.random() * (ZONE_BOUNDARIES.mythic.end - ZONE_BOUNDARIES.mythic.start);
    }
    player.health = player.maxHealth;
    player.x = spawnX;
    player.y = Math.random() * WORLD_HEIGHT;
    player.score = Math.max(0, player.score - 10);
    player.inventory = [];
    player.isInvulnerable = true;
    setTimeout(() => {
        player.isInvulnerable = false;
    }, RESPAWN_INVULNERABILITY_TIME);
}
io.on('connection', (socket) => {
    console.log('A user connected');
    // Handle authentication
    socket.on('authenticate', (credentials) => __awaiter(void 0, void 0, void 0, function* () {
        const user = database_1.database.getUser(credentials.username, credentials.password);
        if (user) {
            // Store user info in socket
            socket.userId = user.id;
            socket.username = user.username;
            // Load saved progress for the player
            const savedProgress = database_1.database.getPlayerByUserId(user.id);
            // Initialize new player with saved or default values
            players[socket.id] = {
                id: socket.id,
                x: 200,
                y: WORLD_HEIGHT / 2,
                angle: 0,
                score: 0,
                velocityX: 0,
                velocityY: 0,
                health: (savedProgress === null || savedProgress === void 0 ? void 0 : savedProgress.maxHealth) || PLAYER_MAX_HEALTH,
                maxHealth: (savedProgress === null || savedProgress === void 0 ? void 0 : savedProgress.maxHealth) || PLAYER_MAX_HEALTH,
                damage: (savedProgress === null || savedProgress === void 0 ? void 0 : savedProgress.damage) || PLAYER_DAMAGE,
                inventory: [],
                isInvulnerable: true,
                level: (savedProgress === null || savedProgress === void 0 ? void 0 : savedProgress.level) || 1,
                xp: (savedProgress === null || savedProgress === void 0 ? void 0 : savedProgress.xp) || 0,
                xpToNextLevel: calculateXPRequirement((savedProgress === null || savedProgress === void 0 ? void 0 : savedProgress.level) || 1)
            };
            // Remove initial invulnerability after the specified time
            setTimeout(() => {
                if (players[socket.id]) {
                    players[socket.id].isInvulnerable = false;
                }
            }, RESPAWN_INVULNERABILITY_TIME);
            // Send success response and game state
            socket.emit('authenticated', {
                success: true,
                player: players[socket.id]
            });
            // Send current game state
            socket.emit('currentPlayers', players);
            socket.emit('enemiesUpdate', enemies);
            socket.emit('obstaclesUpdate', obstacles);
            socket.emit('itemsUpdate', items);
            // Notify other players
            socket.broadcast.emit('newPlayer', players[socket.id]);
        }
        else {
            socket.emit('authenticated', {
                success: false,
                error: 'Invalid credentials'
            });
        }
    }));
    // Update disconnect handler
    socket.on('disconnect', () => {
        console.log('A user disconnected');
        if (players[socket.id] && socket.userId) {
            // Save progress with user ID
            savePlayerProgress(players[socket.id], socket.userId);
        }
        delete players[socket.id];
        io.emit('playerDisconnected', socket.id);
    });
    // Update the savePlayerProgress function
    function savePlayerProgress(player, userId) {
        if (userId) {
            database_1.database.savePlayer(player.id, userId, {
                level: player.level,
                xp: player.xp,
                maxHealth: player.maxHealth,
                damage: player.damage
            });
        }
        else {
            // Handle case where userId is not provided (legacy support)
            console.warn('Attempting to save player progress without userId');
        }
    }
    socket.on('playerMovement', (movementData) => {
        const player = players[socket.id];
        if (player) {
            let newX = movementData.x; // Don't clamp position yet
            let newY = movementData.y;
            // Apply knockback to player position if it exists
            if (player.knockbackX) {
                player.knockbackX *= KNOCKBACK_RECOVERY_SPEED;
                newX += player.knockbackX;
                if (Math.abs(player.knockbackX) < 0.1)
                    player.knockbackX = 0;
            }
            if (player.knockbackY) {
                player.knockbackY *= KNOCKBACK_RECOVERY_SPEED;
                newY += player.knockbackY;
                if (Math.abs(player.knockbackY) < 0.1)
                    player.knockbackY = 0;
            }
            let collision = false;
            // Check collision with enemies first
            for (const enemy of enemies) {
                const enemySize = ENEMY_SIZE * ENEMY_SIZE_MULTIPLIERS[enemy.tier];
                if (newX < enemy.x + enemySize &&
                    newX + PLAYER_SIZE > enemy.x &&
                    newY < enemy.y + enemySize &&
                    newY + PLAYER_SIZE > enemy.y) {
                    collision = true;
                    if (!player.isInvulnerable) {
                        // Enemy damages player
                        player.health -= enemy.damage;
                        io.emit('playerDamaged', { playerId: player.id, health: player.health });
                        // Player damages enemy
                        enemy.health -= player.damage;
                        io.emit('enemyDamaged', { enemyId: enemy.id, health: enemy.health });
                        // Calculate knockback direction
                        const dx = enemy.x - newX;
                        const dy = enemy.y - newY;
                        const distance = Math.sqrt(dx * dx + dy * dy);
                        const normalizedDx = dx / distance;
                        const normalizedDy = dy / distance;
                        // Apply knockback to player's position immediately
                        newX -= normalizedDx * KNOCKBACK_FORCE;
                        newY -= normalizedDy * KNOCKBACK_FORCE;
                        // Store knockback for gradual recovery
                        player.knockbackX = -normalizedDx * KNOCKBACK_FORCE;
                        player.knockbackY = -normalizedDy * KNOCKBACK_FORCE;
                        // Check if enemy dies
                        if (enemy.health <= 0) {
                            const index = enemies.findIndex(e => e.id === enemy.id);
                            if (index !== -1) {
                                // Award XP before removing the enemy
                                const xpGained = getXPFromEnemy(enemy);
                                addXPToPlayer(player, xpGained);
                                // Check for item drop
                                const dropChance = DROP_CHANCES[enemy.tier];
                                if (Math.random() < dropChance && player.inventory.length < MAX_INVENTORY_SIZE) {
                                    const newItem = {
                                        id: Math.random().toString(36).substr(2, 9),
                                        type: ['health_potion', 'speed_boost', 'shield'][Math.floor(Math.random() * 3)],
                                        x: enemy.x,
                                        y: enemy.y
                                    };
                                    player.inventory.push(newItem);
                                    socket.emit('inventoryUpdate', player.inventory);
                                    socket.emit('itemCollected', {
                                        playerId: player.id,
                                        itemId: newItem.id,
                                        itemType: newItem.type
                                    });
                                }
                                enemies.splice(index, 1);
                                io.emit('enemyDestroyed', enemy.id);
                                enemies.push(createEnemy());
                            }
                        }
                        // Check if player dies
                        if (player.health <= 0) {
                            respawnPlayer(player);
                            io.emit('playerDied', player.id);
                            io.emit('playerRespawned', player);
                            return;
                        }
                    }
                    break;
                }
            }
            // Update player position even if there was a collision (to apply knockback)
            player.x = Math.max(0, Math.min(WORLD_WIDTH - PLAYER_SIZE, newX));
            player.y = Math.max(0, Math.min(WORLD_HEIGHT - PLAYER_SIZE, newY));
            player.angle = movementData.angle;
            player.velocityX = movementData.velocityX;
            player.velocityY = movementData.velocityY;
            // Always emit the updated position
            io.emit('playerMoved', player);
        }
    });
    socket.on('collectDot', (dotIndex) => {
        if (dotIndex >= 0 && dotIndex < dots.length) {
            dots.splice(dotIndex, 1);
            players[socket.id].score++;
            io.emit('dotCollected', { playerId: socket.id, dotIndex });
            // Generate a new dot
            dots.push({
                x: Math.random() * 800,
                y: Math.random() * 600
            });
        }
    });
    socket.on('collectItem', (itemId) => {
        const player = players[socket.id];
        const itemIndex = items.findIndex(item => item.id === itemId);
        if (itemIndex !== -1 && player.inventory.length < MAX_INVENTORY_SIZE) {
            const item = items[itemIndex];
            player.inventory.push(item);
            items.splice(itemIndex, 1);
            socket.emit('inventoryUpdate', player.inventory);
            io.emit('itemCollected', { playerId: socket.id, itemId });
            items.push(createItem()); // Replace the collected item
            io.emit('itemsUpdate', items);
        }
    });
    socket.on('useItem', (itemId) => {
        const player = players[socket.id];
        const itemIndex = player.inventory.findIndex(item => item.id === itemId);
        if (itemIndex !== -1) {
            const item = player.inventory[itemIndex];
            player.inventory.splice(itemIndex, 1);
            switch (item.type) {
                case 'health_potion':
                    player.health = Math.min(player.health + 50, PLAYER_MAX_HEALTH);
                    break;
                case 'speed_boost':
                    // Implement speed boost logic
                    break;
                case 'shield':
                    // Implement shield logic
                    break;
            }
            socket.emit('inventoryUpdate', player.inventory);
            io.emit('playerUpdated', player);
        }
    });
    // Add save handler for when players gain XP or level up
    // Update the addXPToPlayer function to save progress
    function addXPToPlayer(player, xp) {
        if (player.level >= MAX_LEVEL)
            return;
        player.xp += xp;
        while (player.xp >= player.xpToNextLevel && player.level < MAX_LEVEL) {
            player.xp -= player.xpToNextLevel;
            player.level++;
            player.xpToNextLevel = calculateXPRequirement(player.level);
            handleLevelUp(player);
        }
        if (player.level >= MAX_LEVEL) {
            player.xp = 0;
            player.xpToNextLevel = 0;
        }
        // Save progress after XP gain using the socket's userId
        if (socket.userId) {
            savePlayerProgress(player, socket.userId);
        }
        io.emit('xpGained', {
            playerId: player.id,
            xp: xp,
            totalXp: player.xp,
            level: player.level,
            xpToNextLevel: player.xpToNextLevel,
            maxHealth: player.maxHealth,
            damage: player.damage
        });
    }
});
// Move enemies every 100ms
setInterval(() => {
    moveEnemies();
    io.emit('enemiesUpdate', enemies);
}, 100);
httpsServer.listen(PORT, () => {
    console.log(`Server is running on https://localhost:${PORT}`);
});
// Add XP calculation functions
function calculateXPRequirement(level) {
    return Math.floor(BASE_XP_REQUIREMENT * Math.pow(XP_MULTIPLIER, level - 1));
}
function getXPFromEnemy(enemy) {
    const tierMultipliers = {
        common: 10,
        uncommon: 20,
        rare: 40,
        epic: 80,
        legendary: 160,
        mythic: 320
    };
    return tierMultipliers[enemy.tier];
}
// Optional: Clean up old player data periodically
setInterval(() => {
    database_1.database.cleanupOldPlayers(30); // Clean up players not seen in 30 days
}, 24 * 60 * 60 * 1000); // Run once per day
// Add this function near the other helper functions
function handleLevelUp(player) {
    player.maxHealth += HEALTH_PER_LEVEL;
    player.health = player.maxHealth; // Heal to full when leveling up
    player.damage += DAMAGE_PER_LEVEL;
    io.emit('levelUp', {
        playerId: player.id,
        level: player.level,
        maxHealth: player.maxHealth,
        damage: player.damage
    });
}
