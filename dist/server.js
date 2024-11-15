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
const constants_1 = require("./constants");
const server_utils_1 = require("./server_utils");
const app = (0, express_1.default)();
const decorations = [];
const sands = [];
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
// Update createEnemy to ensure enemies spawn in their correct zones
function createEnemy() {
    // First, decide the x position
    const x = Math.random() * constants_1.WORLD_WIDTH;
    // Determine tier based on x position
    let tier = 'common';
    for (const [t, zone] of Object.entries(constants_1.ZONE_BOUNDARIES)) {
        if (x >= zone.start && x < zone.end) {
            tier = t;
            break;
        }
    }
    const tierData = constants_1.ENEMY_TIERS[tier];
    return {
        id: Math.random().toString(36).substr(2, 9),
        type: Math.random() < 0.5 ? 'octopus' : 'fish',
        tier,
        x: x, // Use the determined x position
        y: Math.random() * constants_1.WORLD_HEIGHT,
        angle: Math.random() * Math.PI * 2,
        health: tierData.health,
        speed: tierData.speed,
        damage: tierData.damage,
        knockbackX: 0,
        knockbackY: 0
    };
}
// Update the moveEnemies function
function moveEnemies() {
    constants_1.enemies.forEach(enemy => {
        // Apply knockback if it exists
        if (enemy.knockbackX) {
            enemy.knockbackX *= constants_1.KNOCKBACK_RECOVERY_SPEED;
            enemy.x += enemy.knockbackX;
            if (Math.abs(enemy.knockbackX) < 0.1)
                enemy.knockbackX = 0;
        }
        if (enemy.knockbackY) {
            enemy.knockbackY *= constants_1.KNOCKBACK_RECOVERY_SPEED;
            enemy.y += enemy.knockbackY;
            if (Math.abs(enemy.knockbackY) < 0.1)
                enemy.knockbackY = 0;
        }
        // Find nearest player for fish behavior
        let nearestPlayer;
        let nearestDistance = Infinity;
        const playerArray = Object.values(constants_1.players);
        playerArray.forEach(player => {
            const dx = player.x - enemy.x;
            const dy = player.y - enemy.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            nearestDistance = distance;
            nearestPlayer = player;
        });
        // Different movement patterns based on enemy type
        if (enemy.type === 'octopus') {
            // Random movement for octopus
            enemy.x += (Math.random() * 4 - 2) * (enemy.speed || 1);
            enemy.y += (Math.random() * 4 - 2) * (enemy.speed || 1);
        }
        else {
            // Fish behavior
            if (nearestPlayer) {
                if (nearestDistance < constants_1.FISH_DETECTION_RADIUS) {
                    // Fish detected player - match player speed
                    const dx = nearestPlayer.x - enemy.x;
                    const dy = nearestPlayer.y - enemy.y;
                    const angle = Math.atan2(dy, dx);
                    // Update enemy angle for proper facing direction
                    enemy.angle = angle;
                    // Calculate chase speed based on player's current speed
                    const playerSpeed = 16;
                    // Match player speed but consider enemy tier for slight variations
                    const tierSpeedMultiplier = constants_1.ENEMY_TIERS[enemy.tier].speed;
                    const chaseSpeed = playerSpeed * tierSpeedMultiplier;
                    // Move towards player matching their speed
                    enemy.x += Math.cos(angle) * chaseSpeed;
                    enemy.y += Math.sin(angle) * chaseSpeed;
                    // Mark fish as hostile
                    enemy.isHostile = true;
                }
                else {
                    // Normal fish behavior
                    enemy.isHostile = false;
                    // Return to normal speed gradually
                    const normalSpeed = constants_1.ENEMY_TIERS[enemy.tier].speed * 2;
                    enemy.x += Math.cos(enemy.angle || 0) * normalSpeed;
                    enemy.y += Math.sin(enemy.angle || 0) * normalSpeed;
                    // Randomly change direction occasionally
                    if (Math.random() < 0.02) {
                        enemy.angle = Math.random() * Math.PI * 2;
                    }
                }
            }
        }
        // Keep enemies in their respective zones
        const zone = constants_1.ZONE_BOUNDARIES[enemy.tier];
        if (enemy.x < zone.start || enemy.x >= zone.end) {
            // Reverse direction if exiting zone
            if (enemy.type === 'fish') {
                enemy.angle = Math.PI - enemy.angle; // Reverse direction
            }
            enemy.x = Math.max(zone.start, Math.min(zone.end - 1, enemy.x));
        }
        // Wrap around only for Y axis
        enemy.y = (enemy.y + constants_1.WORLD_HEIGHT) % constants_1.WORLD_HEIGHT;
    });
    io.emit('enemiesUpdate', constants_1.enemies);
}
function createObstacle() {
    const isEnemy = Math.random() < constants_1.ENEMY_CORAL_PROBABILITY;
    return {
        id: Math.random().toString(36).substr(2, 9),
        x: Math.random() * constants_1.WORLD_WIDTH,
        y: Math.random() * constants_1.WORLD_HEIGHT,
        width: 50 + Math.random() * 50, // Random width between 50 and 100
        height: 50 + Math.random() * 50, // Random height between 50 and 100
        type: 'coral',
        isEnemy: isEnemy,
        health: isEnemy ? constants_1.ENEMY_CORAL_HEALTH : undefined
    };
}
function createItem() {
    return {
        id: Math.random().toString(36).substr(2, 9),
        type: ['health_potion', 'speed_boost', 'shield'][Math.floor(Math.random() * 3)],
        x: Math.random() * constants_1.WORLD_WIDTH,
        y: Math.random() * constants_1.WORLD_HEIGHT
    };
}
// Initialize enemies
for (let i = 0; i < constants_1.ENEMY_COUNT; i++) {
    constants_1.enemies.push(createEnemy());
}
// Initialize obstacles
for (let i = 0; i < constants_1.OBSTACLE_COUNT; i++) {
    constants_1.obstacles.push(createObstacle());
}
// Initialize decorations
for (let i = 0; i < constants_1.DECORATION_COUNT; i++) {
    decorations.push((0, server_utils_1.createDecoration)());
}
// Initialize sands
for (let i = 0; i < constants_1.SAND_COUNT; i++) {
    sands.push((0, server_utils_1.createSand)());
}
function respawnPlayer(player) {
    // Determine spawn zone based on player level
    let spawnX;
    if (player.level <= 5) {
        spawnX = Math.random() * constants_1.ZONE_BOUNDARIES.common.end;
    }
    else if (player.level <= 10) {
        spawnX = constants_1.ZONE_BOUNDARIES.uncommon.start + Math.random() * (constants_1.ZONE_BOUNDARIES.uncommon.end - constants_1.ZONE_BOUNDARIES.uncommon.start);
    }
    else if (player.level <= 15) {
        spawnX = constants_1.ZONE_BOUNDARIES.rare.start + Math.random() * (constants_1.ZONE_BOUNDARIES.rare.end - constants_1.ZONE_BOUNDARIES.rare.start);
    }
    else if (player.level <= 25) {
        spawnX = constants_1.ZONE_BOUNDARIES.epic.start + Math.random() * (constants_1.ZONE_BOUNDARIES.epic.end - constants_1.ZONE_BOUNDARIES.epic.start);
    }
    else if (player.level <= 40) {
        spawnX = constants_1.ZONE_BOUNDARIES.legendary.start + Math.random() * (constants_1.ZONE_BOUNDARIES.legendary.end - constants_1.ZONE_BOUNDARIES.legendary.start);
    }
    else {
        spawnX = constants_1.ZONE_BOUNDARIES.mythic.start + Math.random() * (constants_1.ZONE_BOUNDARIES.mythic.end - constants_1.ZONE_BOUNDARIES.mythic.start);
    }
    player.health = player.maxHealth;
    player.x = spawnX;
    player.y = Math.random() * constants_1.WORLD_HEIGHT;
    player.score = Math.max(0, player.score - 10);
    player.inventory = [];
    player.isInvulnerable = true;
    player.lastDamageTime = 0; // Reset damage timer on respawn
    setTimeout(() => {
        player.isInvulnerable = false;
    }, constants_1.RESPAWN_INVULNERABILITY_TIME);
}
io.on('connection', (socket) => {
    console.log('A user connected');
    // Handle authentication
    socket.on('authenticate', (credentials) => __awaiter(void 0, void 0, void 0, function* () {
        const user = database_1.database.getUser(credentials.username, credentials.password);
        if (user) {
            socket.userId = user.id;
            socket.username = user.username;
            console.log('User authenticated, loading saved progress for userId:', user.id);
            const savedProgress = database_1.database.getPlayerByUserId(user.id);
            console.log('Loaded saved progress:', savedProgress);
            constants_1.players[socket.id] = {
                id: socket.id,
                name: credentials.playerName || 'Anonymous',
                x: 200,
                y: constants_1.WORLD_HEIGHT / 2,
                angle: 0,
                score: 0,
                velocityX: 0,
                velocityY: 0,
                health: (savedProgress === null || savedProgress === void 0 ? void 0 : savedProgress.maxHealth) || constants_1.PLAYER_MAX_HEALTH,
                maxHealth: (savedProgress === null || savedProgress === void 0 ? void 0 : savedProgress.maxHealth) || constants_1.PLAYER_MAX_HEALTH,
                damage: (savedProgress === null || savedProgress === void 0 ? void 0 : savedProgress.damage) || constants_1.PLAYER_DAMAGE,
                inventory: (savedProgress === null || savedProgress === void 0 ? void 0 : savedProgress.inventory) || [],
                loadout: (savedProgress === null || savedProgress === void 0 ? void 0 : savedProgress.loadout) || Array(10).fill(null),
                isInvulnerable: true,
                level: (savedProgress === null || savedProgress === void 0 ? void 0 : savedProgress.level) || 1,
                xp: (savedProgress === null || savedProgress === void 0 ? void 0 : savedProgress.xp) || 0,
                xpToNextLevel: calculateXPRequirement((savedProgress === null || savedProgress === void 0 ? void 0 : savedProgress.level) || 1)
            };
            // Save initial state and log the result
            console.log('Saving initial player state');
            savePlayerProgress(constants_1.players[socket.id], user.id);
            // Remove initial invulnerability after the specified time
            setTimeout(() => {
                if (constants_1.players[socket.id]) {
                    constants_1.players[socket.id].isInvulnerable = false;
                }
            }, constants_1.RESPAWN_INVULNERABILITY_TIME);
            // Send success response and game state
            socket.emit('authenticated', {
                success: true,
                player: constants_1.players[socket.id]
            });
            // Send current game state
            socket.emit('currentPlayers', constants_1.players);
            socket.emit('enemiesUpdate', constants_1.enemies);
            socket.emit('obstaclesUpdate', constants_1.obstacles);
            socket.emit('itemsUpdate', constants_1.items);
            socket.emit('decorationsUpdate', decorations);
            socket.emit('sandsUpdate', sands);
            // Notify other players
            socket.broadcast.emit('newPlayer', constants_1.players[socket.id]);
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
        if (constants_1.players[socket.id] && socket.userId) {
            // Save progress with user ID
            savePlayerProgress(constants_1.players[socket.id], socket.userId);
        }
        delete constants_1.players[socket.id];
        io.emit('playerDisconnected', socket.id);
    });
    socket.on('playerMovement', (movementData) => {
        const player = constants_1.players[socket.id];
        if (player) {
            let newX = movementData.x;
            let newY = movementData.y;
            // Apply knockback to player position if it exists
            if (player.knockbackX) {
                player.knockbackX *= constants_1.KNOCKBACK_RECOVERY_SPEED;
                newX += player.knockbackX;
                if (Math.abs(player.knockbackX) < 0.1)
                    player.knockbackX = 0;
            }
            if (player.knockbackY) {
                player.knockbackY *= constants_1.KNOCKBACK_RECOVERY_SPEED;
                newY += player.knockbackY;
                if (Math.abs(player.knockbackY) < 0.1)
                    player.knockbackY = 0;
            }
            // Check for item collisions
            const ITEM_PICKUP_RADIUS = 40; // Radius for item pickup
            for (let i = constants_1.items.length - 1; i >= 0; i--) {
                const item = constants_1.items[i];
                const dx = newX - item.x;
                const dy = newY - item.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                if (distance < ITEM_PICKUP_RADIUS) {
                    // Add item to player's inventory without size limit
                    player.inventory.push(item);
                    // Remove item from world
                    constants_1.items.splice(i, 1);
                    // Notify clients
                    socket.emit('inventoryUpdate', player.inventory);
                    io.emit('itemCollected', {
                        playerId: socket.id,
                        itemId: item.id
                    });
                    io.emit('itemsUpdate', constants_1.items);
                }
            }
            let collision = false;
            // Check collision with enemies first
            for (const enemy of constants_1.enemies) {
                const enemySize = constants_1.ENEMY_SIZE * constants_1.ENEMY_SIZE_MULTIPLIERS[enemy.tier];
                if (newX < enemy.x + enemySize &&
                    newX + constants_1.PLAYER_SIZE > enemy.x &&
                    newY < enemy.y + enemySize &&
                    newY + constants_1.PLAYER_SIZE > enemy.y) {
                    collision = true;
                    if (!player.isInvulnerable) {
                        // Enemy damages player
                        player.health -= enemy.damage;
                        player.lastDamageTime = Date.now(); // Add this line
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
                        newX -= normalizedDx * constants_1.KNOCKBACK_FORCE;
                        newY -= normalizedDy * constants_1.KNOCKBACK_FORCE;
                        // Store knockback for gradual recovery
                        player.knockbackX = -normalizedDx * constants_1.KNOCKBACK_FORCE;
                        player.knockbackY = -normalizedDy * constants_1.KNOCKBACK_FORCE;
                        // Check if enemy dies
                        if (enemy.health <= 0) {
                            const index = constants_1.enemies.findIndex(e => e.id === enemy.id);
                            if (index !== -1) {
                                // Award XP before removing the enemy
                                const xpGained = getXPFromEnemy(enemy);
                                addXPToPlayer(player, xpGained);
                                // Check for item drop
                                const dropChance = constants_1.DROP_CHANCES[enemy.tier];
                                if (Math.random() < dropChance) {
                                    const newItem = {
                                        id: Math.random().toString(36).substr(2, 9),
                                        type: ['health_potion', 'speed_boost', 'shield'][Math.floor(Math.random() * 3)],
                                        x: enemy.x,
                                        y: enemy.y
                                    };
                                    // Add item to the world instead of player's inventory
                                    constants_1.items.push(newItem);
                                    // Notify all clients about the new item
                                    io.emit('itemsUpdate', constants_1.items);
                                }
                                constants_1.enemies.splice(index, 1);
                                io.emit('enemyDestroyed', enemy.id);
                                constants_1.enemies.push(createEnemy());
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
            player.x = Math.max(0, Math.min(constants_1.WORLD_WIDTH - constants_1.PLAYER_SIZE, newX));
            player.y = Math.max(0, Math.min(constants_1.WORLD_HEIGHT - constants_1.PLAYER_SIZE, newY));
            player.angle = movementData.angle;
            player.velocityX = movementData.velocityX;
            player.velocityY = movementData.velocityY;
            // Always emit the updated position
            io.emit('playerMoved', player);
        }
    });
    socket.on('collectDot', (dotIndex) => {
        if (dotIndex >= 0 && dotIndex < constants_1.dots.length) {
            constants_1.dots.splice(dotIndex, 1);
            constants_1.players[socket.id].score++;
            io.emit('dotCollected', { playerId: socket.id, dotIndex });
            // Generate a new dot
            constants_1.dots.push({
                x: Math.random() * 800,
                y: Math.random() * 600
            });
        }
    });
    socket.on('useItem', (itemId) => {
        const player = constants_1.players[socket.id];
        const itemIndex = player.inventory.findIndex(item => item.id === itemId);
        console.log('someone used an item:', itemId);
        if (itemIndex !== -1) {
            const item = player.inventory[itemIndex];
            player.inventory.splice(itemIndex, 1);
            switch (item.type) {
                case 'health_potion':
                    player.health = constants_1.PLAYER_MAX_HEALTH;
                    player.isInvulnerable = false;
                    player.speed_boost = false;
                    break;
                case 'speed_boost':
                    player.speed_boost = true;
                    io.emit('speedBoostActive', player.id);
                    console.log('Speed boost active:', player.id);
                    break;
                case 'shield':
                    player.speed_boost = false;
                    player.isInvulnerable = true;
                    break;
            }
            socket.emit('inventoryUpdate', player.inventory);
            io.emit('playerUpdated', player);
        }
    });
    // Add save handler for when players gain XP or level up
    // Update the addXPToPlayer function to save progress
    function addXPToPlayer(player, xp) {
        player.xp += xp;
        while (player.xp >= player.xpToNextLevel) {
            player.xp -= player.xpToNextLevel;
            player.level++;
            player.xpToNextLevel = calculateXPRequirement(player.level);
            handleLevelUp(player);
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
    // Add a name update handler
    socket.on('updateName', (newName) => {
        const player = constants_1.players[socket.id];
        if (player) {
            player.name = newName;
            io.emit('playerUpdated', player);
        }
    });
    socket.on('updateLoadout', (data) => {
        const player = constants_1.players[socket.id];
        if (player) {
            player.loadout = data.loadout;
            player.inventory = data.inventory;
            io.emit('playerUpdated', player);
        }
    });
});
// Move enemies every 100ms
setInterval(() => {
    moveEnemies();
    io.emit('enemiesUpdate', constants_1.enemies);
}, 100);
httpsServer.listen(PORT, () => {
    console.log(`Server is running on https://localhost:${PORT}`);
});
// Add XP calculation functions
function calculateXPRequirement(level) {
    return Math.floor(constants_1.BASE_XP_REQUIREMENT * Math.pow(constants_1.XP_MULTIPLIER, level - 1));
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
    player.maxHealth += constants_1.HEALTH_PER_LEVEL;
    player.health = player.maxHealth; // Heal to full when leveling up
    player.damage += constants_1.DAMAGE_PER_LEVEL;
    io.emit('levelUp', {
        playerId: player.id,
        level: player.level,
        maxHealth: player.maxHealth,
        damage: player.damage
    });
}
// Add these constants at the top with other constants
const HEALTH_REGEN_RATE = 5; // Health points recovered per tick
const HEALTH_REGEN_INTERVAL = 1000; // Milliseconds between health regeneration ticks
const HEALTH_REGEN_COMBAT_DELAY = 0; // Delay before health starts regenerating after taking damage
// Add health regeneration interval
setInterval(() => {
    Object.values(constants_1.players).forEach(player => {
        // Check if enough time has passed since last damage
        const now = Date.now();
        if (player.lastDamageTime && now - player.lastDamageTime < HEALTH_REGEN_COMBAT_DELAY) {
            return; // Skip regeneration if player was recently damaged
        }
        // Regenerate health if not at max
        if (player.health < player.maxHealth) {
            player.health = Math.min(player.maxHealth, player.health + HEALTH_REGEN_RATE);
            io.emit('playerUpdated', player);
        }
    });
}, HEALTH_REGEN_INTERVAL);
// Move savePlayerProgress outside the socket connection handler
function savePlayerProgress(player, userId) {
    if (userId) {
        console.log('Saving player progress for userId:', userId);
        const saveResult = database_1.database.savePlayer(player.id, userId, {
            level: player.level,
            xp: player.xp,
            maxHealth: player.maxHealth,
            damage: player.damage,
            inventory: player.inventory,
            loadout: player.loadout
        });
        if (saveResult) {
            console.log('Successfully saved player progress');
        }
        else {
            console.error('Failed to save player progress');
        }
    }
    else {
        console.warn('Attempted to save player progress without userId');
    }
}
// Add periodic saving
const SAVE_INTERVAL = 60000; // Save every minute
setInterval(() => {
    Object.entries(constants_1.players).forEach(([socketId, player]) => {
        const socket = io.sockets.sockets.get(socketId);
        if (socket && socket.userId) {
            socket.emit('savePlayerProgress', player);
            savePlayerProgress(player, socket.userId);
        }
    });
}, SAVE_INTERVAL);
