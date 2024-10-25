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
    inventory: Item[];
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
        damage: tierData.damage
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
function initializeGame() {
    console.log('Initializing game state in worker');
    
    // Create player
    players[socket.id] = {
        id: socket.id,
        x: WORLD_WIDTH / 2,  // Start in the middle
        y: WORLD_HEIGHT / 2,
        angle: 0,
        score: 0,
        velocityX: 0,
        velocityY: 0,
        health: PLAYER_MAX_HEALTH,
        inventory: []
    };

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
    const { type, event: socketEvent, data } = event.data;
    console.log('Worker received message:', type, data);
    
    switch (type) {
        case 'init':
            initializeGame();
            break;

        case 'socketEvent':
            // Handle socket events like the server does
            switch (socketEvent) {
                case 'playerMovement':
                    const player = players[socket.id];
                    if (player) {
                        // Check collision with obstacles
                        let collision = false;
                        for (const obstacle of obstacles) {
                            if (
                                data.x < obstacle.x + obstacle.width &&
                                data.x + 40 > obstacle.x &&
                                data.y < obstacle.y + obstacle.height &&
                                data.y + 40 > obstacle.y
                            ) {
                                collision = true;
                                break;
                            }
                        }

                        if (!collision) {
                            // Update player position
                            player.x = Math.max(0, Math.min(WORLD_WIDTH, data.x));
                            player.y = Math.max(0, Math.min(WORLD_HEIGHT, data.y));
                            player.angle = data.angle;
                            player.velocityX = data.velocityX;
                            player.velocityY = data.velocityY;

                            // Emit the updated position back to the client
                            socket.emit('playerMoved', player);
                        }
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
