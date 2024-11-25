import express from 'express';
import { createServer } from 'https';
import { Server, Socket } from 'socket.io';
import path from 'path';
import fs from 'fs';
import { database } from './database';
import { ServerPlayer } from './player';
import { PLAYER_DAMAGE, WORLD_WIDTH, WORLD_HEIGHT, ZONE_BOUNDARIES, ENEMY_TIERS, KNOCKBACK_RECOVERY_SPEED, FISH_DETECTION_RADIUS, ENEMY_SIZE, ENEMY_SIZE_MULTIPLIERS, PLAYER_SIZE, KNOCKBACK_FORCE, DROP_CHANCES, PLAYER_MAX_HEALTH, HEALTH_PER_LEVEL, DAMAGE_PER_LEVEL, BASE_XP_REQUIREMENT, XP_MULTIPLIER, RESPAWN_INVULNERABILITY_TIME, enemies, players, items, dots, obstacles, OBSTACLE_COUNT, ENEMY_CORAL_PROBABILITY, ENEMY_CORAL_HEALTH, SAND_COUNT, DECORATION_COUNT, WORLD_MAP, MapElement, isWall, ACTUAL_WORLD_HEIGHT, ACTUAL_WORLD_WIDTH, SCALE_FACTOR } from './constants';
import { Enemy, Obstacle, createDecoration, getRandomPositionInZone, Decoration, Sand, createSand } from './server_utils';
import { Item, ItemWithRarity } from './item';
const app = express();

const decorations: Decoration[] = [];
const sands: Sand[] = [];
let ENEMY_COUNT = 200;
// Add body parser middleware for JSON
app.use(express.json());

// Add CORS middleware with specific origin
app.use((req, res, next) => {
    const origin = req.headers.origin || 'https://localhost:8080';
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    res.header('Access-Control-Allow-Credentials', 'true');
    
    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
    } else {
        next();
    }
});

// Authentication endpoints
app.post('/auth/register', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required' });
    }

    const user = database.createUser(username, password);
    if (user) {
        res.status(201).json({ message: 'User created successfully' });
    } else {
        res.status(400).json({ message: 'Username already exists' });
    }
});

app.post('/auth/login', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required' });
    }

    const user = database.getUser(username, password);
    if (user) {
        // You might want to set up a session here
        res.json({ message: 'Login successful', userId: user.id });
    } else {
        res.status(401).json({ message: 'Invalid credentials' });
    }
});

app.post('/auth/verify', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required' });
    }

    const user = database.getUser(username, password);
    if (user) {
        res.json({ valid: true });
    } else {
        res.status(401).json({ valid: false });
    }
});

app.post('/auth/logout', (req, res) => {
    // Handle any cleanup needed
    res.json({ message: 'Logged out successfully' });
});

// Serve static files from the dist directory
app.use(express.static(path.join(__dirname, '../dist')));

const httpsServer = createServer({
    key: fs.readFileSync('cert.key'),
    cert: fs.readFileSync('cert.crt')
}, app);

const io = new Server(httpsServer, {
    cors: {
        origin: function(origin, callback) {
            // Allow requests with no origin (like mobile apps or curl requests)
            if (!origin) return callback(null, true);
            
            // Use the origin of the request
            callback(null, origin);
        },
        methods: ["GET", "POST"],
        credentials: true
    }
});

const PORT = process.env.PORT || 3000;

// Remove or comment out these lines since we're not using grid generation anymore
// const MAZE_CELL_SIZE = 1000;
// const MAZE_WALL_THICKNESS = 100;

// Replace the initializeObstacles function with this:
function initializeMapObstacles(): Obstacle[] {
    const mapObstacles: Obstacle[] = [];
    
    // Convert wall elements from WORLD_MAP to obstacles
    WORLD_MAP.filter(isWall).forEach(wall => {
        mapObstacles.push({
            id: Math.random().toString(36).substr(2, 9),
            x: wall.x * SCALE_FACTOR,
            y: wall.y * SCALE_FACTOR,
            width: wall.width * SCALE_FACTOR,
            height: wall.height * SCALE_FACTOR,
            type: 'coral',
            isEnemy: false
        });
    });

    return mapObstacles;
}

// Update the server initialization code
// Replace the old obstacle initialization with:
obstacles.push(...initializeMapObstacles());

// Update the createEnemy function to respect safe zones
function createEnemy(): Enemy {
    let validPosition = false;
    let x = 0, y = 0;

    while (!validPosition) {
        x = Math.random() * ACTUAL_WORLD_WIDTH;
        y = Math.random() * ACTUAL_WORLD_HEIGHT;

        // Check if position is in a safe zone
        const inSafeZone = WORLD_MAP.some(element => 
            element.type === 'safe_zone' &&
            x >= element.x * SCALE_FACTOR && 
            x <= (element.x + element.width) * SCALE_FACTOR &&
            y >= element.y * SCALE_FACTOR && 
            y <= (element.y + element.height) * SCALE_FACTOR
        );

        // Check if position collides with walls
        const collidesWithWall = WORLD_MAP.some(element => 
            element.type === 'wall' &&
            x >= element.x * SCALE_FACTOR && 
            x <= (element.x + element.width) * SCALE_FACTOR &&
            y >= element.y * SCALE_FACTOR && 
            y <= (element.y + element.height) * SCALE_FACTOR
        );

        if (!inSafeZone && !collidesWithWall) {
            validPosition = true;
        }
    }

    // Rest of createEnemy function remains the same
    const tierRoll = Math.random();
    let tier: Enemy['tier'] = 'common';
    let cumulativeProbability = 0;
    
    for (const [t, data] of Object.entries(ENEMY_TIERS)) {
        cumulativeProbability += data.probability;
        if (tierRoll < cumulativeProbability) {
            tier = t as Enemy['tier'];
            break;
        }
    }

    return {
        id: Math.random().toString(36).substr(2, 9),
        type: Math.random() < 0.5 ? 'octopus' : 'fish',
        tier,
        x,
        y,
        angle: Math.random() * Math.PI * 2,
        health: ENEMY_TIERS[tier].health,
        speed: ENEMY_TIERS[tier].speed,
        damage: ENEMY_TIERS[tier].damage,
        knockbackX: 0,
        knockbackY: 0
    };
}

// Update respawnPlayer to use spawn points from the map
function respawnPlayer(player: ServerPlayer) {
    // Find valid spawn points for player's level
    const validSpawnPoints = WORLD_MAP.filter(element => 
        element.type === 'spawn' &&
        element.properties?.spawnType === getSpawnTypeForLevel(player.level)
    );

    if (validSpawnPoints.length > 0) {
        // Choose random spawn point
        const spawn = validSpawnPoints[Math.floor(Math.random() * validSpawnPoints.length)];
        player.x = (spawn.x + Math.random() * spawn.width) * SCALE_FACTOR;
        player.y = (spawn.y + Math.random() * spawn.height) * SCALE_FACTOR;
    } else {
        // Fallback to old spawn logic if no valid spawn points
        console.warn('No valid spawn points found for level', player.level);
        player.x = Math.random() * ACTUAL_WORLD_WIDTH;
        player.y = Math.random() * ACTUAL_WORLD_HEIGHT;
    }

    // Rest of respawnPlayer remains the same
    player.health = player.maxHealth;
    player.score = Math.max(0, player.score - 10);
    player.isInvulnerable = true;
    player.lastDamageTime = 0;

    setTimeout(() => {
        player.isInvulnerable = false;
    }, RESPAWN_INVULNERABILITY_TIME);
}

// Helper function to determine spawn type based on level
function getSpawnTypeForLevel(level: number): NonNullable<MapElement['properties']>['spawnType'] {
    if (level <= 5) return 'common';
    if (level <= 10) return 'uncommon';
    if (level <= 15) return 'rare';
    if (level <= 25) return 'epic';
    if (level <= 40) return 'legendary';
    return 'mythic';
}

// Initialize enemies
for (let i = 0; i < ENEMY_COUNT; i++) {
  enemies.push(createEnemy());
}

// Initialize decorations
for (let i = 0; i < DECORATION_COUNT; i++) {
  decorations.push(createDecoration());
}

// Initialize sands
for (let i = 0; i < SAND_COUNT; i++) {
  sands.push(createSand());
}

interface AuthenticatedSocket extends Socket {
    userId?: string;
    username?: string;
}

io.on('connection', (socket: AuthenticatedSocket) => {
    console.log('A user connected');

    // Handle authentication
    socket.on('authenticate', async (credentials: { username: string, password: string, playerName: string }) => {
        const user = database.getUser(credentials.username, credentials.password);
        
        if (user) {
            socket.userId = user.id;
            socket.username = user.username;
            
            console.log('User authenticated, loading saved progress for userId:', user.id);
            const savedProgress = database.getPlayerByUserId(user.id);
            console.log('Loaded saved progress:', savedProgress);

            players[socket.id] = {
                id: socket.id,
                name: credentials.playerName || 'Anonymous',
                x: 200,
                y: WORLD_HEIGHT / 2,
                angle: 0,
                score: 0,
                velocityX: 0,
                velocityY: 0,
                health: savedProgress?.maxHealth || PLAYER_MAX_HEALTH,
                maxHealth: savedProgress?.maxHealth || PLAYER_MAX_HEALTH,
                damage: savedProgress?.damage || PLAYER_DAMAGE,
                inventory: savedProgress?.inventory || [],
                loadout: savedProgress?.loadout || Array(10).fill(null),
                isInvulnerable: true,
                level: savedProgress?.level || 1,
                xp: savedProgress?.xp || 0,
                xpToNextLevel: calculateXPRequirement(savedProgress?.level || 1)
            };

            // Save initial state and log the result
            console.log('Saving initial player state');
            savePlayerProgress(players[socket.id], user.id);

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
            socket.emit('decorationsUpdate', decorations);
            socket.emit('sandsUpdate', sands);

            // Notify other players
            socket.broadcast.emit('newPlayer', players[socket.id]);
        } else {
            socket.emit('authenticated', {
                success: false,
                error: 'Invalid credentials'
            });
        }
    });

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

    socket.on('playerMovement', (movementData) => {
        const player = players[socket.id];
        if (player) {
            let newX = movementData.x;
            let newY = movementData.y;

            // Apply knockback to player position if it exists
            if (player.knockbackX) {
                player.knockbackX *= KNOCKBACK_RECOVERY_SPEED;
                newX += player.knockbackX;
                if (Math.abs(player.knockbackX) < 0.1) player.knockbackX = 0;
            }
            if (player.knockbackY) {
                player.knockbackY *= KNOCKBACK_RECOVERY_SPEED;
                newY += player.knockbackY;
                if (Math.abs(player.knockbackY) < 0.1) player.knockbackY = 0;
            }

            // Check for item collisions
            const ITEM_PICKUP_RADIUS = 40;  // Radius for item pickup
            for (let i = items.length - 1; i >= 0; i--) {
                const item = items[i] as ItemWithRarity;  // Cast to ItemWithRarity
                const dx = newX - item.x;
                const dy = newY - item.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < ITEM_PICKUP_RADIUS) {
                    // Create a copy of the current inventory
                    const newInventory = [...player.inventory];
                    
                    // Add item to player's inventory copy
                    newInventory.push({
                        id: item.id,
                        type: item.type,
                        x: item.x,
                        y: item.y,
                        rarity: item.rarity  // Ensure rarity is included
                    });
                    
                    // Update player's inventory with the new copy
                    player.inventory = newInventory;
                    
                    // Remove item from world
                    items.splice(i, 1);
                    
                    // Notify clients
                    socket.emit('inventoryUpdate', newInventory);  // Send the new inventory
                    io.emit('itemCollected', { 
                        playerId: socket.id, 
                        itemId: item.id,
                        inventory: newInventory  // Include complete inventory in update
                    });
                    io.emit('itemsUpdate', items);
                    
                    // Log inventory state
                    console.log('Updated inventory:', {
                        playerId: socket.id,
                        inventorySize: newInventory.length,
                        newItem: item,
                        inventory: newInventory
                    });
                }
            }

            let collision = false;

            // Check collision with enemies first
            for (const enemy of enemies) {
                const enemySize = ENEMY_SIZE * ENEMY_SIZE_MULTIPLIERS[enemy.tier as keyof typeof ENEMY_SIZE_MULTIPLIERS];
                
                if (
                    newX < enemy.x + enemySize &&
                    newX + PLAYER_SIZE > enemy.x &&
                    newY < enemy.y + enemySize &&
                    newY + PLAYER_SIZE > enemy.y
                ) {
                    collision = true;
                    if (!player.isInvulnerable) {
                        // Enemy damages player
                        player.health -= enemy.damage;
                        player.lastDamageTime = Date.now();  // Add this line
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
                                const dropChance = DROP_CHANCES[enemy.tier as keyof typeof DROP_CHANCES];
                                if (Math.random() < dropChance) {
                                    const newItem: ItemWithRarity = {
                                        id: Math.random().toString(36).substr(2, 9),
                                        type: ['health_potion', 'speed_boost', 'shield'][Math.floor(Math.random() * 3)] as Item['type'],
                                        x: enemy.x,
                                        y: enemy.y,
                                        rarity: enemy.tier // Match the enemy's tier for the item rarity
                                    };
                                    // Add item to the world
                                    items.push(newItem);
                                    // Notify all clients about the new item
                                    io.emit('itemsUpdate', items);
                                }

                                enemies.splice(index, 1);
                                io.emit('enemyDestroyed', enemy.id);
                                // Only spawn new enemy if below ENEMY_COUNT
                                if (enemies.length < ENEMY_COUNT) {
                                    enemies.push(createEnemy());
                                }
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
            player.x = Math.max(0, Math.min(ACTUAL_WORLD_WIDTH, newX));
            player.y = Math.max(0, Math.min(ACTUAL_WORLD_HEIGHT, newY));
            player.angle = movementData.angle;
            player.velocityX = movementData.velocityX;
            player.velocityY = movementData.velocityY;

            // Always emit the updated position
            io.emit('playerMoved', player);
        }
    });

    socket.on('collectDot', (dotIndex: number) => {
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

    socket.on('useItem', (itemId: string) => {
        console.log('useItem event received:', itemId); // Add debug log
        
        const player = players[socket.id];
        if (!player) {
            console.log('Player not found:', socket.id);
            return;
        }

        // Find the item in the loadout
        const loadoutSlot = player.loadout.findIndex(item => item?.id === itemId);
        console.log('Found item in loadout slot:', loadoutSlot); // Add debug log
        
        if (loadoutSlot === -1) {
            console.log('Item not found in loadout:', itemId);
            return;  // Item not found in loadout
        }

        const item = player.loadout[loadoutSlot] as ItemWithRarity;  // Cast to ItemWithRarity
        if (!item) {
            console.log('Item is null');
            return;
        }
        
        if (item.onCooldown) {
            console.log('Item is on cooldown:', itemId);
            return;
        }

        console.log('Using item:', {  // Add detailed item debug log
            itemId,
            type: item.type,
            rarity: item.rarity,
            loadoutSlot
        });

        // Rest of the code remains the same...
        const rarityMultipliers: Record<string, number> = {
            common: 1,
            uncommon: 1.5,
            rare: 2,
            epic: 2.5,
            legendary: 3,
            mythic: 4
        };

        const multiplier = item.rarity ? rarityMultipliers[item.rarity] : 1;

        switch (item.type) {
            case 'health_potion':
                player.health = Math.min(player.maxHealth, player.health + (50 * multiplier));
                console.log('Applied health potion effect:', player.health);
                break;
            case 'speed_boost':
                player.speed_boost = true;
                io.emit('speedBoostActive', player.id);
                console.log('Applied speed boost effect');
                setTimeout(() => {
                    if (players[socket.id]) {
                        players[socket.id].speed_boost = false;
                        console.log('Speed boost wore off');
                    }
                }, 5000 * multiplier);
                break;
            case 'shield':
                player.isInvulnerable = true;
                console.log('Applied shield effect');
                setTimeout(() => {
                    if (players[socket.id]) {
                        players[socket.id].isInvulnerable = false;
                        console.log('Shield wore off');
                    }
                }, 3000 * multiplier);
                break;
        }

        // Notify clients about the item use without removing it
        io.emit('itemUsed', { 
            playerId: socket.id, 
            itemId: itemId,
            type: item.type,
            rarity: item.rarity
        });
        console.log('Emitted itemUsed event');

        // Add cooldown to the item
        const cooldownTime = 10000;  // 10 seconds base cooldown
        item.onCooldown = true;
        console.log('Added cooldown to item');
        
        setTimeout(() => {
            if (player.loadout[loadoutSlot] === item) {
                item.onCooldown = false;
                io.emit('itemCooldownComplete', { 
                    playerId: socket.id, 
                    itemId: itemId 
                });
                console.log('Cooldown complete for item:', itemId);
            }
        }, cooldownTime * (1 / multiplier));

        // Update the player state
        io.emit('playerUpdated', player);
        console.log('Updated player state');
    });

    // Add save handler for when players gain XP or level up


    // Update the addXPToPlayer function to save progress
    function addXPToPlayer(player: ServerPlayer, xp: number): void {
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
    socket.on('updateName', (newName: string) => {
        const player = players[socket.id];
        if (player) {
            player.name = newName;
            io.emit('playerUpdated', player);
        }
    });

    socket.on('updateLoadout', (data: { loadout: (Item | null)[]; inventory: Item[] }) => {
        const player = players[socket.id];
        if (player) {
            player.loadout = data.loadout;
            player.inventory = data.inventory;
            io.emit('playerUpdated', player);
        }
    });

    // Add after other imports
    interface ChatMessage {
        sender: string;
        content: string;
        timestamp: number;
    }

    // Add to class-level variables after other declarations
    const chatHistory: ChatMessage[] = [];
    const MAX_CHAT_HISTORY = 100;  // Keep last 100 messages

    // Add this inside the socket.io connection handler (after other socket handlers)
    socket.on('chatMessage', (message: string) => {
        if (!socket.username) return;  // Ensure user is authenticated
        
        const chatMessage: ChatMessage = {
            sender: socket.username,
            content: message,
            timestamp: Date.now()
        };

        // Add to history and trim if needed
        chatHistory.push(chatMessage);
        if (chatHistory.length > MAX_CHAT_HISTORY) {
            chatHistory.shift();
        }

        // Broadcast to all connected clients
        io.emit('chatMessage', chatMessage);
    });

    // Add this after socket handlers but before socket.on('authenticate'...)
    socket.on('requestChatHistory', () => {
        socket.emit('chatHistory', chatHistory);
    });

    // Add near other interfaces at the top
    interface CraftingRequest {
        items: Item[];
    }

    // Add to socket connection handler after other socket events
    io.on('connection', (socket: AuthenticatedSocket) => {
        // ... existing connection code ...

        socket.on('craftItems', (data: CraftingRequest) => {
            const player = players[socket.id];
            if (!player) return;

            // Verify all items exist in player's inventory
            const validItems = data.items.every(craftItem => 
                player.inventory.some(invItem => invItem.id === craftItem.id)
            );

            if (!validItems) {
                socket.emit('craftingFailed', 'Invalid items selected for crafting');
                return;
            }

            // Verify all items are same type and rarity
            const firstItem = data.items[0];
            const validCraft = data.items.every(item => 
                item.type === firstItem.type && 
                item.rarity === firstItem.rarity
            );

            if (!validCraft) {
                socket.emit('craftingFailed', 'Items must be of same type and rarity');
                return;
            }

            // Define rarity upgrade path
            const rarityUpgrades: Record<string, string> = {
                common: 'uncommon',
                uncommon: 'rare',
                rare: 'epic',
                epic: 'legendary',
                legendary: 'mythic'
            };

            const currentRarity = firstItem.rarity || 'common';
            if (!rarityUpgrades[currentRarity]) {
                socket.emit('craftingFailed', 'Cannot upgrade mythic items');
                return;
            }

            // Remove crafting items from inventory
            player.inventory = player.inventory.filter(invItem => 
                !data.items.some(craftItem => craftItem.id === invItem.id)
            );

            // Create new upgraded item
            const newItem: Item = {
                id: Math.random().toString(36).substr(2, 9),
                type: firstItem.type,
                x: player.x,
                y: player.y,
                rarity: rarityUpgrades[currentRarity] as Item['rarity']
            };

            // Add new item to inventory
            player.inventory.push(newItem);

            // Notify clients
            socket.emit('craftingSuccess', {
                newItem,
                inventory: player.inventory
            });

            // Save player progress
            if (socket.userId) {
                savePlayerProgress(player, socket.userId);
            }
        });
    });
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
function calculateXPRequirement(level: number): number {
    return Math.floor(BASE_XP_REQUIREMENT * Math.pow(XP_MULTIPLIER, level - 1));
}

function getXPFromEnemy(enemy: Enemy): number {
    const tierMultipliers: Record<Enemy['tier'], number> = {
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
    database.cleanupOldPlayers(30); // Clean up players not seen in 30 days
}, 24 * 60 * 60 * 1000); // Run once per day

// Add this function near the other helper functions
function handleLevelUp(player: ServerPlayer): void {
    player.maxHealth += HEALTH_PER_LEVEL;
    player.health = player.maxHealth;  // Heal to full when leveling up
    player.damage += DAMAGE_PER_LEVEL;

    io.emit('levelUp', {
        playerId: player.id,
        level: player.level,
        maxHealth: player.maxHealth,
        damage: player.damage
    });
}

// Add these constants at the top with other constants
const HEALTH_REGEN_RATE = 5;  // Health points recovered per tick
const HEALTH_REGEN_INTERVAL = 1000;  // Milliseconds between health regeneration ticks
const HEALTH_REGEN_COMBAT_DELAY = 0;  // Delay before health starts regenerating after taking damage

// Add health regeneration interval
setInterval(() => {
    Object.values(players).forEach(player => {
        // Check if enough time has passed since last damage
        const now = Date.now();
        if (player.lastDamageTime && now - player.lastDamageTime < HEALTH_REGEN_COMBAT_DELAY) {
            return;  // Skip regeneration if player was recently damaged
        }

        // Regenerate health if not at max
        if (player.health < player.maxHealth) {
            player.health = Math.min(player.maxHealth, player.health + HEALTH_REGEN_RATE);
            io.emit('playerUpdated', player);
        }
    });
}, HEALTH_REGEN_INTERVAL);

// Move savePlayerProgress outside the socket connection handler
function savePlayerProgress(player: ServerPlayer, userId: string) {
    if (userId) {
        console.log('Saving player progress for userId:', userId);
        
        const saveResult = database.savePlayer(player.id, userId, {
            level: player.level,
            xp: player.xp,
            maxHealth: player.maxHealth,
            damage: player.damage,
            inventory: player.inventory,
            loadout: player.loadout
        });

        if (saveResult) {
            console.log('Successfully saved player progress');
        } else {
            console.error('Failed to save player progress');
        }
    } else {
        console.warn('Attempted to save player progress without userId');
    }
}

// Add periodic saving
const SAVE_INTERVAL = 60000; // Save every minute
setInterval(() => {
    Object.entries(players).forEach(([socketId, player]) => {
        const socket = io.sockets.sockets.get(socketId) as AuthenticatedSocket;
        if (socket && socket.userId) {
            socket.emit('savePlayerProgress', player);
            savePlayerProgress(player, socket.userId);
        }
    });
}, SAVE_INTERVAL);

// Add after other app.use declarations but before socket.io setup
app.post('/admin/save-progress', (req, res) => {
    const { playerId } = req.body;
    
    if (!playerId) {
        return res.status(400).json({ message: 'Player ID is required' });
    }

    const player = players[playerId];
    const socket = io.sockets.sockets.get(playerId) as AuthenticatedSocket;

    if (!player || !socket?.userId) {
        return res.status(404).json({ message: 'Player not found or not authenticated' });
    }

    try {
        savePlayerProgress(player, socket.userId);
        res.json({ message: 'Progress saved successfully' });
    } catch (error) {
        console.error('Error saving progress:', error);
        res.status(500).json({ message: 'Failed to save progress' });
    }
});

// Add console command handler after the httpsServer.listen() call
process.stdin.on('data', (data) => {
    const command = data.toString().trim();
    
    if (command.startsWith('save')) {
        const parts = command.split(' ');
        if (parts.length === 2) {
            const playerId = parts[1];
            const player = players[playerId];
            const socket = io.sockets.sockets.get(playerId) as AuthenticatedSocket;
            
            if (player && socket?.userId) {
                savePlayerProgress(player, socket.userId);
                socket.emit('savePlayerProgress', player);
                console.log(`Progress saved for player ${playerId}`);
            } else {
                console.log(`Player ${playerId} not found or not authenticated`);
            }
        } else if (parts.length === 1) {
            // Save all players
            let savedCount = 0;
            Object.entries(players).forEach(([socketId, player]) => {
                const socket = io.sockets.sockets.get(socketId) as AuthenticatedSocket;
                if (socket?.userId) {
                    savePlayerProgress(player, socket.userId);
                    savedCount++;
                }
            });
            console.log(`Saved progress for ${savedCount} players`);
        }
    } else if (command === 'list-players') {
        Object.entries(players).forEach(([socketId, player]) => {
            console.log(`Player ID: ${socketId}, Name: ${player.name}, Level: ${player.level}`);
        });
    } else if (command === 'list-sockets') {
        io.sockets.sockets.forEach((socket) => {
            console.log(`Socket ID: ${socket.id}`);
        });
    } else if (command.startsWith('set_max_enemies')) {
        const newCount = parseInt(command.split(' ')[1]);
        if (!isNaN(newCount) && newCount >= 0) {
            ENEMY_COUNT = newCount;
            console.log(`Max enemies set to ${ENEMY_COUNT}`);
            adjustEnemyCount();
        } else {
            console.log('Invalid enemy count. Please provide a valid number.');
        }
    }
});

// Add this function after the command handler
function adjustEnemyCount() {
    // Remove excess enemies if current count is higher than ENEMY_COUNT
    while (enemies.length > ENEMY_COUNT) {
        enemies.pop();
        io.emit('enemyDestroyed', enemies[enemies.length - 1].id);
    }
    
    // Add new enemies if current count is lower than ENEMY_COUNT
    while (enemies.length < ENEMY_COUNT) {
        enemies.push(createEnemy());
    }
    
    // Update all clients with the new enemy state
    io.emit('enemiesUpdate', enemies);
}

// Add after other app.use declarations
app.use('/assets', (req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Cross-Origin-Resource-Policy', 'cross-origin');
    next();
});

// If you're serving assets from a specific directory, update the static file serving
app.use('/assets', express.static(path.join(__dirname, '../assets'), {
    setHeaders: (res, path, stat) => {
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Cross-Origin-Resource-Policy', 'cross-origin');
    }
}));

// Add the moveEnemies function
function moveEnemies() {
    enemies.forEach(enemy => {
        // Apply knockback if it exists
        if (enemy.knockbackX) {
            enemy.knockbackX *= KNOCKBACK_RECOVERY_SPEED;
            enemy.x += enemy.knockbackX;
            if (Math.abs(enemy.knockbackX) < 0.1) enemy.knockbackX = 0;
        }
        if (enemy.knockbackY) {
            enemy.knockbackY *= KNOCKBACK_RECOVERY_SPEED;
            enemy.y += enemy.knockbackY;
            if (Math.abs(enemy.knockbackY) < 0.1) enemy.knockbackY = 0;
        }

        // Constrain to world boundaries
        enemy.x = Math.max(0, Math.min(ACTUAL_WORLD_WIDTH, enemy.x));
        enemy.y = Math.max(0, Math.min(ACTUAL_WORLD_HEIGHT, enemy.y));

        // Check for wall collisions
        WORLD_MAP.filter(isWall).forEach(wall => {
            const scaledWall = {
                x: wall.x * SCALE_FACTOR,
                y: wall.y * SCALE_FACTOR,
                width: wall.width * SCALE_FACTOR,
                height: wall.height * SCALE_FACTOR
            };

            if (enemy.x >= scaledWall.x && 
                enemy.x <= scaledWall.x + scaledWall.width &&
                enemy.y >= scaledWall.y && 
                enemy.y <= scaledWall.y + scaledWall.height) {
                // Push enemy away from wall
                const centerX = scaledWall.x + scaledWall.width / 2;
                const centerY = scaledWall.y + scaledWall.height / 2;
                const dx = enemy.x - centerX;
                const dy = enemy.y - centerY;
                const angle = Math.atan2(dy, dx);
                
                enemy.x = scaledWall.x + scaledWall.width / 2 + Math.cos(angle) * (scaledWall.width / 2 + 50);
                enemy.y = scaledWall.y + scaledWall.height / 2 + Math.sin(angle) * (scaledWall.height / 2 + 50);
            }
        });
    });

    io.emit('enemiesUpdate', enemies);
}