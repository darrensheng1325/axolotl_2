import { Server } from 'socket.io';

interface Player {
    id: string;
    x: number;
    y: number;
    angle: number;
    score: number;
    velocityX: number;
    velocityY: number;
    health: number;
    maxHealth: number;
    damage: number;
    inventory: Item[];
    isInvulnerable?: boolean;
    knockbackX?: number;
    knockbackY?: number;
    level: number;
    xp: number;
    xpToNextLevel: number;
}

interface Enemy {
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
}

interface Item {
    id: string;
    type: 'health_potion' | 'speed_boost' | 'shield';
    x: number;
    y: number;
}

interface Obstacle {
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    type: 'coral';
    isEnemy: boolean;
    health?: number;
}

interface Dot {
    x: number;
    y: number;
}

// Add constants at the top
const WORLD_WIDTH = 2000;
const WORLD_HEIGHT = 2000;
const ENEMY_COUNT = 10;
const OBSTACLE_COUNT = 20;
const ENEMY_CORAL_PROBABILITY = 0.3;
const ENEMY_CORAL_HEALTH = 50;
const ENEMY_CORAL_DAMAGE = 5;
const PLAYER_MAX_HEALTH = 100;
const PLAYER_DAMAGE = 10;
const ITEM_COUNT = 10;
const MAX_INVENTORY_SIZE = 5;
const PLAYER_SIZE = 40;
const COLLISION_RADIUS = PLAYER_SIZE / 2;
const ENEMY_SIZE = 40;
const RESPAWN_INVULNERABILITY_TIME = 3000;
const KNOCKBACK_FORCE = 100; // Increased from 20 to 100
const KNOCKBACK_RECOVERY_SPEED = 0.9;

const ENEMY_TIERS = {
    common: { health: 20, speed: 0.5, damage: 5, probability: 0.4 },
    uncommon: { health: 40, speed: 0.75, damage: 10, probability: 0.3 },
    rare: { health: 60, speed: 1, damage: 15, probability: 0.15 },
    epic: { health: 80, speed: 1.25, damage: 20, probability: 0.1 },
    legendary: { health: 100, speed: 1.5, damage: 25, probability: 0.04 },
    mythic: { health: 150, speed: 2, damage: 30, probability: 0.01 }
};

const players: Record<string, Player> = {};
const enemies: Enemy[] = [];
const obstacles: Obstacle[] = [];
const items: Item[] = [];
const dots: Dot[] = [];

// Add XP-related constants to the worker
const BASE_XP_REQUIREMENT = 100;
const XP_MULTIPLIER = 1.5;
const MAX_LEVEL = 50;
const HEALTH_PER_LEVEL = 10;
const DAMAGE_PER_LEVEL = 2;

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

function addXPToPlayer(player: Player, xp: number): void {
    if (player.level >= MAX_LEVEL) return;

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

    socket.emit('xpGained', {
        playerId: player.id,
        xp: xp,
        totalXp: player.xp,
        level: player.level,
        xpToNextLevel: player.xpToNextLevel,
        maxHealth: player.maxHealth,
        damage: player.damage
    });
}

function handleLevelUp(player: Player): void {
    player.maxHealth += HEALTH_PER_LEVEL;
    player.health = player.maxHealth;
    player.damage += DAMAGE_PER_LEVEL;

    socket.emit('levelUp', {
        playerId: player.id,
        level: player.level,
        maxHealth: player.maxHealth,
        damage: player.damage
    });
}

function createEnemy(): Enemy {
    const tierRoll = Math.random();
    let tier: keyof typeof ENEMY_TIERS = 'common';
    let cumulativeProbability = 0;

    for (const [t, data] of Object.entries(ENEMY_TIERS)) {
        cumulativeProbability += data.probability;
        if (tierRoll < cumulativeProbability) {
            tier = t as keyof typeof ENEMY_TIERS;
            break;
        }
    }

    const tierData = ENEMY_TIERS[tier];

    return {
        id: Math.random().toString(36).substr(2, 9),
        type: Math.random() < 0.5 ? 'octopus' : 'fish',
        tier,
        x: Math.random() * WORLD_WIDTH,
        y: Math.random() * WORLD_HEIGHT,
        angle: Math.random() * Math.PI * 2,
        health: tierData.health,
        speed: tierData.speed,
        damage: tierData.damage,
        knockbackX: 0,
        knockbackY: 0
    };
}

function createObstacle(): Obstacle {
    const isEnemy = Math.random() < ENEMY_CORAL_PROBABILITY;
    return {
        id: Math.random().toString(36).substr(2, 9),
        x: Math.random() * WORLD_WIDTH,
        y: Math.random() * WORLD_HEIGHT,
        width: 50 + Math.random() * 50,
        height: 50 + Math.random() * 50,
        type: 'coral',
        isEnemy,
        health: isEnemy ? ENEMY_CORAL_HEALTH : undefined
    };
}

function createItem(): Item {
    return {
        id: Math.random().toString(36).substr(2, 9),
        type: ['health_potion', 'speed_boost', 'shield'][Math.floor(Math.random() * 3)] as Item['type'],
        x: Math.random() * WORLD_WIDTH,
        y: Math.random() * WORLD_HEIGHT
    };
}

function moveEnemies() {
    enemies.forEach(enemy => {
        // Apply knockback recovery
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

        // Regular movement
        if (enemy.type === 'octopus') {
            enemy.x += (Math.random() * 4 - 2) * enemy.speed;
            enemy.y += (Math.random() * 4 - 2) * enemy.speed;
        } else {
            enemy.x += Math.cos(enemy.angle) * 2 * enemy.speed;
            enemy.y += Math.sin(enemy.angle) * 2 * enemy.speed;
        }

        enemy.x = (enemy.x + WORLD_WIDTH) % WORLD_WIDTH;
        enemy.y = (enemy.y + WORLD_HEIGHT) % WORLD_HEIGHT;

        if (enemy.type === 'fish' && Math.random() < 0.02) {
            enemy.angle = Math.random() * Math.PI * 2;
        }
    });
}

// Mock socket connection for single player
class MockSocket {
    private eventHandlers: Map<string, Function[]> = new Map();
    public readonly id: string = 'player1';  // Changed to public readonly

    on(event: string, handler: Function) {
        if (!this.eventHandlers.has(event)) {
            this.eventHandlers.set(event, []);
        }
        this.eventHandlers.get(event)?.push(handler);
    }

    emit(event: string, data: any) {
        // Forward to main thread
        self.postMessage({
            type: 'socketEvent',
            event,
            data
        });
    }

    broadcast = {
        emit: (event: string, data: any) => {
            // In single player, broadcast events are ignored
        }
    };

    // Add getter for id if needed
    getId(): string {
        return this.id;
    }
}

// Mock io for single player
const mockIo = {
    emit: (event: string, data: any) => {
        self.postMessage({
            type: 'socketEvent',
            event,
            data
        });
    }
};

const socket = new MockSocket();

// Initialize game state
function initializeGame(messageData?: { savedProgress?: any }) {
    console.log('Initializing game state in worker', messageData);  // Debug log
    
    const savedProgress = messageData?.savedProgress || {
        level: 1,
        xp: 0,
        maxHealth: PLAYER_MAX_HEALTH,
        damage: PLAYER_DAMAGE
    };

    console.log('Using saved progress:', savedProgress);  // Debug log
    
    // Initialize player with saved progress
    players[socket.id] = {
        id: socket.id,
        x: WORLD_WIDTH / 2,
        y: WORLD_HEIGHT / 2,
        angle: 0,
        score: 0,
        velocityX: 0,
        velocityY: 0,
        health: savedProgress.maxHealth,
        maxHealth: savedProgress.maxHealth,
        damage: savedProgress.damage,
        inventory: [],
        isInvulnerable: true,
        level: savedProgress.level,
        xp: savedProgress.xp,
        xpToNextLevel: calculateXPRequirement(savedProgress.level)
    };

    // Remove initial invulnerability after the specified time
    setTimeout(() => {
        if (players[socket.id]) {
            players[socket.id].isInvulnerable = false;
        }
    }, RESPAWN_INVULNERABILITY_TIME);

    // Create enemies
    for (let i = 0; i < ENEMY_COUNT; i++) {
        enemies.push(createEnemy());
    }

    // Create obstacles
    for (let i = 0; i < OBSTACLE_COUNT; i++) {
        obstacles.push(createObstacle());
    }

    // Create items
    for (let i = 0; i < ITEM_COUNT; i++) {
        items.push(createItem());
    }

    // Create dots
    for (let i = 0; i < 20; i++) {
        dots.push({
            x: Math.random() * WORLD_WIDTH,
            y: Math.random() * WORLD_HEIGHT
        });
    }

    console.log('Sending initial game state');
    
    // Send all initial state in the correct order
    socket.emit('currentPlayers', players);
    socket.emit('enemiesUpdate', enemies);
    socket.emit('obstaclesUpdate', obstacles);
    socket.emit('itemsUpdate', items);
    socket.emit('playerMoved', players[socket.id]); // Ensure player position is set
}

// Handle messages from main thread
self.onmessage = (event) => {
    const { type, event: socketEvent, data, savedProgress } = event.data;
    console.log('Worker received message:', type, { data, savedProgress });  // Debug log
    
    switch (type) {
        case 'init':
            // Pass savedProgress directly from the event.data
            initializeGame({ savedProgress: event.data.savedProgress });
            break;

        case 'socketEvent':
            switch (socketEvent) {
                case 'playerMovement':
                    const player = players[socket.id];
                    if (player) {
                        let newX = data.x;
                        let newY = data.y;

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

                        let collision = false;

                        // Check collision with enemies first
                        for (const enemy of enemies) {
                            if (
                                newX < enemy.x + ENEMY_SIZE &&
                                newX + PLAYER_SIZE > enemy.x &&
                                newY < enemy.y + ENEMY_SIZE &&
                                newY + PLAYER_SIZE > enemy.y
                            ) {
                                collision = true;
                                if (!player.isInvulnerable) {
                                    // Enemy damages player
                                    player.health -= enemy.damage;
                                    socket.emit('playerDamaged', { playerId: player.id, health: player.health });

                                    // Player damages enemy
                                    enemy.health -= player.damage;  // Use player.damage instead of PLAYER_DAMAGE
                                    socket.emit('enemyDamaged', { enemyId: enemy.id, health: enemy.health });

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
                                            
                                            // Remove the dead enemy and create a new one
                                            enemies.splice(index, 1);
                                            socket.emit('enemyDestroyed', enemy.id);
                                            enemies.push(createEnemy());
                                        }
                                    }

                                    // Check if player dies
                                    if (player.health <= 0) {
                                        respawnPlayer(player);
                                        socket.emit('playerDied', player.id);
                                        socket.emit('playerRespawned', player);
                                        return;
                                    }
                                }
                                break;
                            }
                        }

                        // Check collision with obstacles
                        for (const obstacle of obstacles) {
                            if (
                                newX < obstacle.x + obstacle.width &&
                                newX + PLAYER_SIZE > obstacle.x &&
                                newY < obstacle.y + obstacle.height &&
                                newY + PLAYER_SIZE > obstacle.y
                            ) {
                                collision = true;
                                if (obstacle.isEnemy && !player.isInvulnerable) {
                                    player.health -= ENEMY_CORAL_DAMAGE;
                                    socket.emit('playerDamaged', { playerId: player.id, health: player.health });

                                    if (player.health <= 0) {
                                        respawnPlayer(player);
                                        socket.emit('playerDied', player.id);
                                        socket.emit('playerRespawned', player);
                                        return; // Exit early if player dies
                                    }
                                }
                                break;
                            }
                        }

                        // Update player position
                        // Even if there was a collision, we want to apply the knockback
                        player.x = Math.max(0, Math.min(WORLD_WIDTH - PLAYER_SIZE, newX));
                        player.y = Math.max(0, Math.min(WORLD_HEIGHT - PLAYER_SIZE, newY));
                        player.angle = data.angle;
                        player.velocityX = data.velocityX;
                        player.velocityY = data.velocityY;

                        // Always emit the player's position
                        socket.emit('playerMoved', player);
                    }
                    break;

                case 'collectItem':
                    const itemIndex = items.findIndex(item => item.id === data.itemId);
                    if (itemIndex !== -1 && players[socket.id].inventory.length < MAX_INVENTORY_SIZE) {
                        const item = items[itemIndex];
                        players[socket.id].inventory.push(item);
                        items.splice(itemIndex, 1);
                        items.push(createItem());
                        socket.emit('itemCollected', { playerId: socket.id, itemId: data.itemId });
                    }
                    break;

                case 'useItem':
                    const playerUsingItem = players[socket.id];
                    const inventoryIndex = playerUsingItem.inventory.findIndex(item => item.id === data.itemId);
                    if (inventoryIndex !== -1) {
                        const item = playerUsingItem.inventory[inventoryIndex];
                        playerUsingItem.inventory.splice(inventoryIndex, 1);
                        switch (item.type) {
                            case 'health_potion':
                                playerUsingItem.health = Math.min(playerUsingItem.health + 50, PLAYER_MAX_HEALTH);
                                break;
                            case 'speed_boost':
                                // Implement speed boost
                                break;
                            case 'shield':
                                // Implement shield
                                break;
                        }
                        socket.emit('itemUsed', { playerId: socket.id, itemId: data.itemId });
                    }
                    break;

                // ... (handle other socket events)
            }
            break;
    }
};

// Game loop (like server's setInterval)
setInterval(() => {
    moveEnemies();
    mockIo.emit('enemiesUpdate', enemies);
}, 100);

// Add error handling
self.onerror = (error) => {
    console.error('Worker error:', error);
};

// Add the respawn function
function respawnPlayer(player: Player) {
  player.health = PLAYER_MAX_HEALTH;
  player.x = Math.random() * WORLD_WIDTH;
  player.y = Math.random() * WORLD_HEIGHT;
  player.score = Math.max(0, player.score - 10);
  player.inventory = [];
  player.isInvulnerable = true;

  // Notify the main thread
  self.postMessage({ type: 'playerDied', playerId: player.id });
  self.postMessage({ type: 'playerRespawned', player });

  setTimeout(() => {
    player.isInvulnerable = false;
  }, RESPAWN_INVULNERABILITY_TIME);
}
