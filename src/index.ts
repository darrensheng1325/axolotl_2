// ... (keep the existing imports and Player class)

import { io, Socket } from 'socket.io-client';

interface Player {
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
}

interface Dot {
    x: number;
    y: number;
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

interface Item {
    id: string;
    type: 'health_potion' | 'speed_boost' | 'shield';
    x: number;
    y: number;
}

let currentGame: Game | null = null;

window.onload = () => {
    const singlePlayerButton = document.getElementById('singlePlayerButton');
    const multiPlayerButton = document.getElementById('multiPlayerButton');

    singlePlayerButton?.addEventListener('click', () => {
        if (currentGame) {
            // Cleanup previous game
            currentGame.cleanup();
        }
        currentGame = new Game(true);
    });

    multiPlayerButton?.addEventListener('click', () => {
        if (currentGame) {
            // Cleanup previous game
            currentGame.cleanup();
        }
        currentGame = new Game(false);
    });
};

// Add this at the top of index.ts, before the Game class
const workerCode = `
// Worker code starts here
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
const KNOCKBACK_FORCE = 100;
const KNOCKBACK_RECOVERY_SPEED = 0.9;

const ENEMY_TIERS = {
    common: { health: 20, speed: 0.5, damage: 5, probability: 0.4 },
    uncommon: { health: 40, speed: 0.75, damage: 10, probability: 0.3 },
    rare: { health: 60, speed: 1, damage: 15, probability: 0.15 },
    epic: { health: 80, speed: 1.25, damage: 20, probability: 0.1 },
    legendary: { health: 100, speed: 1.5, damage: 25, probability: 0.04 },
    mythic: { health: 150, speed: 2, damage: 30, probability: 0.01 }
};

const players = {};
const enemies = [];
const obstacles = [];
const items = [];
const dots = [];

function createEnemy() {
    const tierRoll = Math.random();
    let tier = 'common';
    let cumulativeProbability = 0;
    for (const [t, data] of Object.entries(ENEMY_TIERS)) {
        cumulativeProbability += data.probability;
        if (tierRoll < cumulativeProbability) {
            tier = t;
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

function createObstacle() {
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

function createItem() {
    return {
        id: Math.random().toString(36).substr(2, 9),
        type: ['health_potion', 'speed_boost', 'shield'][Math.floor(Math.random() * 3)],
        x: Math.random() * WORLD_WIDTH,
        y: Math.random() * WORLD_HEIGHT
    };
}

function moveEnemies() {
    enemies.forEach(enemy => {
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

class MockSocket {
    constructor() {
        this.eventHandlers = new Map();
        this.id = 'player1';
        this.broadcast = {
            emit: (event, data) => {
                // In single player, broadcast events are ignored
            }
        };
    }
    on(event, handler) {
        if (!this.eventHandlers.has(event)) {
            this.eventHandlers.set(event, []);
        }
        this.eventHandlers.get(event)?.push(handler);
    }
    emit(event, data) {
        self.postMessage({
            type: 'socketEvent',
            event,
            data
        });
    }
    getId() {
        return this.id;
    }
}

const mockIo = {
    emit: (event, data) => {
        self.postMessage({
            type: 'socketEvent',
            event,
            data
        });
    }
};

const socket = new MockSocket();

function initializeGame() {
    console.log('Initializing game state in worker');
    
    players[socket.id] = {
        id: socket.id,
        x: WORLD_WIDTH / 2,
        y: WORLD_HEIGHT / 2,
        angle: 0,
        score: 0,
        velocityX: 0,
        velocityY: 0,
        health: PLAYER_MAX_HEALTH,
        inventory: [],
        isInvulnerable: true
    };

    setTimeout(() => {
        if (players[socket.id]) {
            players[socket.id].isInvulnerable = false;
        }
    }, RESPAWN_INVULNERABILITY_TIME);

    for (let i = 0; i < ENEMY_COUNT; i++) {
        enemies.push(createEnemy());
    }

    for (let i = 0; i < OBSTACLE_COUNT; i++) {
        obstacles.push(createObstacle());
    }

    for (let i = 0; i < ITEM_COUNT; i++) {
        items.push(createItem());
    }

    for (let i = 0; i < 20; i++) {
        dots.push({
            x: Math.random() * WORLD_WIDTH,
            y: Math.random() * WORLD_HEIGHT
        });
    }

    socket.emit('currentPlayers', players);
    socket.emit('enemiesUpdate', enemies);
    socket.emit('obstaclesUpdate', obstacles);
    socket.emit('itemsUpdate', items);
    socket.emit('playerMoved', players[socket.id]);
}

function respawnPlayer(player) {
    player.health = PLAYER_MAX_HEALTH;
    player.x = Math.random() * WORLD_WIDTH;
    player.y = Math.random() * WORLD_HEIGHT;
    player.score = Math.max(0, player.score - 10);
    player.inventory = [];
    player.isInvulnerable = true;

    self.postMessage({ type: 'playerDied', playerId: player.id });
    self.postMessage({ type: 'playerRespawned', player });

    setTimeout(() => {
        player.isInvulnerable = false;
    }, RESPAWN_INVULNERABILITY_TIME);
}

self.onmessage = (event) => {
    const { type, event: socketEvent, data } = event.data;
    console.log('Worker received message:', type, data);
    
    switch (type) {
        case 'init':
            initializeGame();
            break;

        case 'socketEvent':
            switch (socketEvent) {
                case 'playerMovement':
                    const player = players[socket.id];
                    if (player) {
                        let newX = data.x;
                        let newY = data.y;

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

                        for (const enemy of enemies) {
                            if (
                                newX < enemy.x + ENEMY_SIZE &&
                                newX + PLAYER_SIZE > enemy.x &&
                                newY < enemy.y + ENEMY_SIZE &&
                                newY + PLAYER_SIZE > enemy.y
                            ) {
                                collision = true;
                                if (!player.isInvulnerable) {
                                    player.health -= enemy.damage;
                                    socket.emit('playerDamaged', { playerId: player.id, health: player.health });

                                    enemy.health -= PLAYER_DAMAGE;
                                    socket.emit('enemyDamaged', { enemyId: enemy.id, health: enemy.health });

                                    const dx = enemy.x - newX;
                                    const dy = enemy.y - newY;
                                    const distance = Math.sqrt(dx * dx + dy * dy);
                                    const normalizedDx = dx / distance;
                                    const normalizedDy = dy / distance;

                                    newX -= normalizedDx * KNOCKBACK_FORCE;
                                    newY -= normalizedDy * KNOCKBACK_FORCE;
                                    
                                    player.knockbackX = -normalizedDx * KNOCKBACK_FORCE;
                                    player.knockbackY = -normalizedDy * KNOCKBACK_FORCE;

                                    if (enemy.health <= 0) {
                                        const index = enemies.findIndex(e => e.id === enemy.id);
                                        if (index !== -1) {
                                            enemies.splice(index, 1);
                                            socket.emit('enemyDestroyed', enemy.id);
                                            enemies.push(createEnemy());
                                        }
                                    }

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
                                        return;
                                    }
                                }
                                break;
                            }
                        }

                        player.x = Math.max(0, Math.min(WORLD_WIDTH - PLAYER_SIZE, newX));
                        player.y = Math.max(0, Math.min(WORLD_HEIGHT - PLAYER_SIZE, newY));
                        player.angle = data.angle;
                        player.velocityX = data.velocityX;
                        player.velocityY = data.velocityY;

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
                                break;
                            case 'shield':
                                break;
                        }
                        socket.emit('itemUsed', { playerId: socket.id, itemId: data.itemId });
                    }
                    break;
            }
            break;
    }
};

setInterval(() => {
    moveEnemies();
    mockIo.emit('enemiesUpdate', enemies);
}, 100);

self.onerror = (error) => {
    console.error('Worker error:', error);
};
`;

class Game {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private socket!: Socket;  // Using the definite assignment assertion
    private players: Map<string, Player> = new Map();
    private playerSprite: HTMLImageElement;
    private dots: Dot[] = [];
    private readonly DOT_SIZE = 5;
    private readonly DOT_COUNT = 20;
    private readonly PLAYER_ACCELERATION = 1.5; // Increased from 0.5 to 1.5
    private readonly MAX_SPEED = 20; // Increased from 15 to 20
    private readonly FRICTION = 0.98;
    private cameraX = 0;
    private cameraY = 0;
    private readonly WORLD_WIDTH = 2000;
    private readonly WORLD_HEIGHT = 2000;
    private keysPressed: Set<string> = new Set();
    private enemies: Map<string, Enemy> = new Map();
    private octopusSprite: HTMLImageElement;
    private fishSprite: HTMLImageElement;
    private readonly PLAYER_MAX_HEALTH = 100;
    private readonly ENEMY_MAX_HEALTH: Record<Enemy['tier'], number> = {
        common: 20,
        uncommon: 40,
        rare: 60,
        epic: 80,
        legendary: 100,
        mythic: 150
    };
    private readonly PLAYER_DAMAGE = 10;
    private readonly ENEMY_DAMAGE = 5;
    private readonly DAMAGE_COOLDOWN = 1000; // 1 second cooldown
    private lastDamageTime: number = 0;
    private readonly ENEMY_COLORS = {
        common: '#808080',
        uncommon: '#008000',
        rare: '#0000FF',
        epic: '#800080',
        legendary: '#FFA500',
        mythic: '#FF0000'
    };
    private obstacles: Obstacle[] = [];
    private coralSprite: HTMLImageElement;
    private readonly ENEMY_CORAL_MAX_HEALTH = 50;
    private items: Item[] = [];
    private itemSprites: Record<string, HTMLImageElement> = {};
    private isInventoryOpen: boolean = false;
    private isSinglePlayer: boolean = false;
    private worker: Worker | null = null;
    private gameLoopId: number | null = null;
    private socketHandlers: Map<string, Function> = new Map();

    constructor(isSinglePlayer: boolean = false) {
        console.log('Game constructor called');
        this.canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
        this.ctx = this.canvas.getContext('2d')!;
        
        // Set initial canvas size
        this.resizeCanvas();
        
        // Add resize listener
        window.addEventListener('resize', () => this.resizeCanvas());
        
        this.isSinglePlayer = isSinglePlayer;

        // Initialize sprites and other resources with relative paths
        this.playerSprite = new Image();
        this.playerSprite.src = './assets/player.png';
        this.playerSprite.onload = () => {
            console.log('Player sprite loaded successfully');
            this.gameLoop();
        };
        this.playerSprite.onerror = (e) => {
            console.error('Error loading player sprite:', e);
        };
        this.octopusSprite = new Image();
        this.octopusSprite.src = './assets/octopus.png';
        this.fishSprite = new Image();
        this.fishSprite.src = './assets/fish.png';
        this.coralSprite = new Image();
        this.coralSprite.src = './assets/coral.png';

        this.setupEventListeners();
        this.setupItemSprites();

        // Initialize game mode after resource loading
        if (this.isSinglePlayer) {
            this.initSinglePlayerMode();
        } else {
            this.initMultiPlayerMode();
        }
    }

    private initSinglePlayerMode() {
        console.log('Initializing single player mode');
        try {
            // Create a blob URL from the worker code string
            const blob = new Blob([workerCode], { type: 'application/javascript' });
            const workerUrl = URL.createObjectURL(blob);
            
            // Create the worker using the blob URL
            this.worker = new Worker(workerUrl);
            
            // Clean up the blob URL
            URL.revokeObjectURL(workerUrl);
            
            // Create a mock socket for single player
            const mockSocket = {
                id: 'player1',
                emit: (event: string, data: any) => {
                    console.log('Emitting event:', event, data);
                    this.worker?.postMessage({
                        type: 'socketEvent',
                        event,
                        data
                    });
                },
                on: (event: string, handler: Function) => {
                    console.log('Registering handler for event:', event);
                    this.socketHandlers.set(event, handler);
                },
                disconnect: () => {
                    this.worker?.terminate();
                }
            };

            // Use mock socket instead of real socket
            this.socket = mockSocket as any;

            // Set up socket event handlers first
            this.setupSocketListeners();

            // Handle messages from worker
            this.worker.onmessage = (event) => {
                const { type, event: socketEvent, data } = event.data;
                console.log('Received message from worker:', type, socketEvent, data);
                
                if (type === 'socketEvent') {
                    // Call the appropriate socket event handler
                    const handler = this.socketHandlers.get(socketEvent);
                    if (handler) {
                        console.log('Calling handler for event:', socketEvent);
                        handler(data);
                    }
                }
            };

            // Initialize the game
            console.log('Sending init message to worker');
            this.worker.postMessage({ type: 'init' });
        } catch (error) {
            console.error('Error initializing worker:', error);
        }
    }

    private initMultiPlayerMode() {
        this.socket = io(prompt("Enter the server URL eg https://localhost:3000: \n Join a public server: https://54.151.123.177:3000/") || "", { 
            secure: true,
            rejectUnauthorized: false,
            withCredentials: true
        });
        this.setupSocketListeners();
    }

    private setupSocketListeners() {
        this.socket.on('connect', () => {
            console.log('Connected to server with ID:', this.socket.id);
        });

        this.socket.on('currentPlayers', (players: Record<string, Player>) => {
            console.log('Received current players:', players);
            this.players.clear();
            Object.values(players).forEach(player => {
                this.players.set(player.id, {...player, imageLoaded: true, score: 0, velocityX: 0, velocityY: 0, health: this.PLAYER_MAX_HEALTH});
            });
        });

        this.socket.on('newPlayer', (player: Player) => {
            console.log('New player joined:', player);
            this.players.set(player.id, {...player, imageLoaded: true, score: 0, velocityX: 0, velocityY: 0, health: this.PLAYER_MAX_HEALTH});
        });

        this.socket.on('playerMoved', (player: Player) => {
            console.log('Player moved:', player);
            const existingPlayer = this.players.get(player.id);
            if (existingPlayer) {
                Object.assign(existingPlayer, player);
            } else {
                this.players.set(player.id, {...player, imageLoaded: true, score: 0, velocityX: 0, velocityY: 0, health: this.PLAYER_MAX_HEALTH});
            }
        });

        this.socket.on('playerDisconnected', (playerId: string) => {
            console.log('Player disconnected:', playerId);
            this.players.delete(playerId);
        });

        this.socket.on('dotCollected', (data: { playerId: string, dotIndex: number }) => {
            const player = this.players.get(data.playerId);
            if (player) {
                player.score++;
            }
            this.dots.splice(data.dotIndex, 1);
            this.generateDot();
        });

        this.socket.on('enemiesUpdate', (enemies: Enemy[]) => {
            this.enemies.clear();
            enemies.forEach(enemy => this.enemies.set(enemy.id, enemy));
        });

        this.socket.on('enemyMoved', (enemy: Enemy) => {
            this.enemies.set(enemy.id, enemy);
        });

        this.socket.on('playerDamaged', (data: { playerId: string, health: number }) => {
            const player = this.players.get(data.playerId);
            if (player) {
                player.health = data.health;
            }
        });

        this.socket.on('enemyDamaged', (data: { enemyId: string, health: number }) => {
            const enemy = this.enemies.get(data.enemyId);
            if (enemy) {
                enemy.health = data.health;
            }
        });

        this.socket.on('enemyDestroyed', (enemyId: string) => {
            this.enemies.delete(enemyId);
        });

        this.socket.on('obstaclesUpdate', (obstacles: Obstacle[]) => {
            this.obstacles = obstacles;
        });

        this.socket.on('obstacleDamaged', (data: { obstacleId: string, health: number }) => {
            const obstacle = this.obstacles.find(o => o.id === data.obstacleId);
            if (obstacle && obstacle.isEnemy) {
                obstacle.health = data.health;
            }
        });

        this.socket.on('obstacleDestroyed', (obstacleId: string) => {
            const index = this.obstacles.findIndex(o => o.id === obstacleId);
            if (index !== -1) {
                this.obstacles.splice(index, 1);
            }
        });

        this.socket.on('itemsUpdate', (items: Item[]) => {
            this.items = items;
        });

        this.socket.on('itemCollected', (data: { playerId: string, itemId: string }) => {
            this.items = this.items.filter(item => item.id !== data.itemId);
        });

        this.socket.on('inventoryUpdate', (inventory: Item[]) => {
            const socketId = this.socket.id;
            if (socketId) {
                const player = this.players.get(socketId);
                if (player) {
                    player.inventory = inventory;
                }
            }
        });
    }

    private setupEventListeners() {
        document.addEventListener('keydown', (event) => {
            if (event.key === 'i' || event.key === 'I') {
                this.toggleInventory();
                return;
            }

            if (this.isInventoryOpen) {
                if (event.key >= '1' && event.key <= '5') {
                    const index = parseInt(event.key) - 1;
                    this.useItemFromInventory(index);
                }
                return;
            }

            this.keysPressed.add(event.key);
            this.updatePlayerVelocity();
        });

        document.addEventListener('keyup', (event) => {
            this.keysPressed.delete(event.key);
            this.updatePlayerVelocity();
        });
    }

    private updatePlayerVelocity() {
        const player = this.isSinglePlayer ? 
            this.players.get('player1') : 
            this.players.get(this.socket?.id || '');

        if (player) {
            let dx = 0;
            let dy = 0;

            if (this.keysPressed.has('ArrowUp')) dy -= 1;
            if (this.keysPressed.has('ArrowDown')) dy += 1;
            if (this.keysPressed.has('ArrowLeft')) dx -= 1;
            if (this.keysPressed.has('ArrowRight')) dx += 1;

            // Normalize diagonal movement
            if (dx !== 0 || dy !== 0) {
                // Calculate angle based on movement direction
                player.angle = Math.atan2(dy, dx);

                // Normalize the direction vector
                if (dx !== 0 && dy !== 0) {
                    const length = Math.sqrt(dx * dx + dy * dy);
                    dx /= length;
                    dy /= length;
                }

                // Apply acceleration gradually
                const acceleration = this.isSinglePlayer ? this.PLAYER_ACCELERATION * 2 : this.PLAYER_ACCELERATION;
                player.velocityX += dx * acceleration;
                player.velocityY += dy * acceleration;

                // Limit speed
                const maxSpeed = this.isSinglePlayer ? this.MAX_SPEED * 2 : this.MAX_SPEED;
                const speed = Math.sqrt(player.velocityX ** 2 + player.velocityY ** 2);
                if (speed > maxSpeed) {
                    const ratio = maxSpeed / speed;
                    player.velocityX *= ratio;
                    player.velocityY *= ratio;
                }
            } else {
                // Apply friction when no keys are pressed
                player.velocityX *= this.FRICTION;
                player.velocityY *= this.FRICTION;

                // Update angle based on velocity if moving
                const speed = Math.sqrt(player.velocityX ** 2 + player.velocityY ** 2);
                if (speed > 0.1) {  // Only update angle if moving significantly
                    player.angle = Math.atan2(player.velocityY, player.velocityX);
                }
            }

            // Update position
            const newX = player.x + player.velocityX;
            const newY = player.y + player.velocityY;

            // Check world bounds
            player.x = Math.max(0, Math.min(this.WORLD_WIDTH, newX));
            player.y = Math.max(0, Math.min(this.WORLD_HEIGHT, newY));

            // Send update to server/worker
            if (this.isSinglePlayer) {
                this.worker?.postMessage({
                    type: 'socketEvent',
                    event: 'playerMovement',
                    data: {
                        x: player.x,
                        y: player.y,
                        angle: player.angle,
                        velocityX: player.velocityX,
                        velocityY: player.velocityY
                    }
                });
            } else {
                this.socket.emit('playerMovement', {
                    x: player.x,
                    y: player.y,
                    angle: player.angle,
                    velocityX: player.velocityX,
                    velocityY: player.velocityY
                });
            }
        }
    }

    private updateCamera(player: Player) {
        this.cameraX = player.x - this.canvas.width / 2;
        this.cameraY = player.y - this.canvas.height / 2;

        // Clamp camera position to world bounds
        this.cameraX = Math.max(0, Math.min(this.WORLD_WIDTH - this.canvas.width, this.cameraX));
        this.cameraY = Math.max(0, Math.min(this.WORLD_HEIGHT - this.canvas.height, this.cameraY));
    }

    private updatePlayerPosition(player: Player) {
        // Calculate new position
        const newX = player.x + player.velocityX;
        const newY = player.y + player.velocityY;

        // Check collision with obstacles
        let collision = false;
        for (const obstacle of this.obstacles) {
            if (
                newX < obstacle.x + obstacle.width &&
                newX + 40 > obstacle.x && // Assuming player width is 40
                newY < obstacle.y + obstacle.height &&
                newY + 40 > obstacle.y // Assuming player height is 40
            ) {
                collision = true;
                break;
            }
        }

        if (!collision) {
            // Update position if no collision
            player.x = newX;
            player.y = newY;
        } else {
            // Stop movement if collision occurs
            player.velocityX = 0;
            player.velocityY = 0;
        }

        // Update player angle based on velocity
        if (player.velocityX !== 0 || player.velocityY !== 0) {
            player.angle = Math.atan2(player.velocityY, player.velocityX);
        }

        // Apply friction only if no keys are pressed
        if (this.keysPressed.size === 0) {
            player.velocityX *= this.FRICTION;
            player.velocityY *= this.FRICTION;
        }

        // Constrain to world bounds
        player.x = Math.max(0, Math.min(this.WORLD_WIDTH, player.x));
        player.y = Math.max(0, Math.min(this.WORLD_HEIGHT, player.y));

        // Update server
        this.socket.emit('playerMovement', { 
            x: player.x, 
            y: player.y, 
            angle: player.angle, 
            velocityX: player.velocityX, 
            velocityY: player.velocityY 
        });

        this.checkDotCollision(player);
        this.checkEnemyCollision(player);
        this.updateCamera(player);
        this.checkItemCollision(player);
    }

    private generateDots() {
        for (let i = 0; i < this.DOT_COUNT; i++) {
            this.generateDot();
        }
    }

    private generateDot() {
        const dot: Dot = {
            x: Math.random() * this.WORLD_WIDTH,
            y: Math.random() * this.WORLD_HEIGHT
        };
        this.dots.push(dot);
    }

    private checkDotCollision(player: Player) {
        for (let i = this.dots.length - 1; i >= 0; i--) {
            const dot = this.dots[i];
            const dx = player.x - dot.x;
            const dy = player.y - dot.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < this.DOT_SIZE + 20) {
                this.socket.emit('collectDot', i);
                player.score++;
                this.dots.splice(i, 1);
                this.generateDot();
            }
        }
    }

    private checkEnemyCollision(player: Player) {
        const currentTime = Date.now();
        if (currentTime - this.lastDamageTime < this.DAMAGE_COOLDOWN) {
            return;
        }

        this.enemies.forEach((enemy, enemyId) => {
            const dx = player.x - enemy.x;
            const dy = player.y - enemy.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < 40) { // Assuming both player and enemy are 40x40 pixels
                this.lastDamageTime = currentTime;
                this.socket.emit('collision', { enemyId });
            }
        });
    }

    private checkItemCollision(player: Player) {
        this.items.forEach(item => {
            const dx = player.x - item.x;
            const dy = player.y - item.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < 40) { // Assuming player radius is 20
                this.socket.emit('collectItem', item.id);
            }
        });
    }

    private toggleInventory() {
        this.isInventoryOpen = !this.isInventoryOpen;
    }

    private useItemFromInventory(index: number) {
        const socketId = this.socket.id;
        if (socketId) {
            const player = this.players.get(socketId);
            if (player && player.inventory[index]) {
                this.socket.emit('useItem', player.inventory[index].id);
            }
        }
    }

    private renderInventoryMenu() {
        const socketId = this.socket.id;
        if (!socketId) return;

        const player = this.players.get(socketId);
        if (!player) return;

        // Darken the background
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw inventory background
        this.ctx.fillStyle = 'rgba(200, 200, 200, 0.8)';
        this.ctx.fillRect(200, 100, 400, 400);

        // Draw inventory title
        this.ctx.fillStyle = 'black';
        this.ctx.font = '24px Arial';
        this.ctx.fillText('Inventory', 350, 140);

        // Draw inventory slots
        player.inventory.forEach((item, index) => {
            const x = 250 + (index % 3) * 100;
            const y = 200 + Math.floor(index / 3) * 100;

            this.ctx.fillStyle = 'white';
            this.ctx.fillRect(x, y, 80, 80);

            const sprite = this.itemSprites[item.type];
            this.ctx.drawImage(sprite, x + 10, y + 10, 60, 60);

            this.ctx.fillStyle = 'black';
            this.ctx.font = '16px Arial';
            this.ctx.fillText(`${index + 1}`, x + 5, y + 20);
        });

        // Draw instructions
        this.ctx.fillStyle = 'black';
        this.ctx.font = '16px Arial';
        this.ctx.fillText('Press 1-5 to use an item', 300, 480);
        this.ctx.fillText('Press I to close inventory', 300, 510);
    }

    private handlePlayerMoved(playerData: Player) {
        // Update player position in single-player mode
        const player = this.players.get(playerData.id);
        if (player) {
            Object.assign(player, playerData);
            // Update camera position for the local player
            if (this.isSinglePlayer) {
                this.updateCamera(player);
            }
        }
    }

    private handleEnemiesUpdate(enemiesData: Enemy[]) {
        // Update enemies in single-player mode
        this.enemies.clear();
        enemiesData.forEach(enemy => this.enemies.set(enemy.id, enemy));
    }

    private gameLoop() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = '#00FFFF';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        if (!this.isInventoryOpen) {
            // Get current player
            const currentPlayer = this.isSinglePlayer ? 
                this.players.get('player1') : 
                this.players.get(this.socket?.id || '');

            if (currentPlayer) {
                // Always update position based on velocity
                const newX = currentPlayer.x + currentPlayer.velocityX;
                const newY = currentPlayer.y + currentPlayer.velocityY;

                // Check world bounds
                currentPlayer.x = Math.max(0, Math.min(this.WORLD_WIDTH, newX));
                currentPlayer.y = Math.max(0, Math.min(this.WORLD_HEIGHT, newY));

                // Apply friction
                currentPlayer.velocityX *= this.FRICTION;
                currentPlayer.velocityY *= this.FRICTION;

                // Update camera
                this.updateCamera(currentPlayer);

                // Send update to server/worker
                if (this.isSinglePlayer) {
                    this.worker?.postMessage({
                        type: 'socketEvent',
                        event: 'playerMovement',
                        data: {
                            x: currentPlayer.x,
                            y: currentPlayer.y,
                            angle: currentPlayer.angle,
                            velocityX: currentPlayer.velocityX,
                            velocityY: currentPlayer.velocityY
                        }
                    });
                } else {
                    this.socket.emit('playerMovement', {
                        x: currentPlayer.x,
                        y: currentPlayer.y,
                        angle: currentPlayer.angle,
                        velocityX: currentPlayer.velocityX,
                        velocityY: currentPlayer.velocityY
                    });
                }
            }

            this.ctx.save();
            this.ctx.translate(-this.cameraX, -this.cameraY);

            // Draw world bounds
            this.ctx.strokeStyle = 'black';
            this.ctx.strokeRect(0, 0, this.WORLD_WIDTH, this.WORLD_HEIGHT);

            // Draw dots
            this.ctx.fillStyle = 'yellow';
            this.dots.forEach(dot => {
                this.ctx.beginPath();
                this.ctx.arc(dot.x, dot.y, this.DOT_SIZE, 0, Math.PI * 2);
                this.ctx.fill();
            });

            // Draw players
            this.players.forEach((player, id) => {
                this.ctx.save();
                this.ctx.translate(player.x, player.y);
                this.ctx.rotate(player.angle);
                
                // Draw the sprite
                this.ctx.drawImage(this.playerSprite, -this.playerSprite.width / 2, -this.playerSprite.height / 2);
                
                this.ctx.restore();

                // Draw score and health
                this.ctx.fillStyle = 'black';
                this.ctx.font = '16px Arial';
                this.ctx.fillText(`Score: ${player.score}`, player.x - 30, player.y - 30);

                // Draw health bar
                this.ctx.fillStyle = 'red';
                this.ctx.fillRect(player.x - 25, player.y - 40, 50, 5);
                this.ctx.fillStyle = 'green';
                this.ctx.fillRect(player.x - 25, player.y - 40, 50 * (player.health / this.PLAYER_MAX_HEALTH), 5);
            });

            // Draw enemies
            this.enemies.forEach(enemy => {
                this.ctx.save();
                this.ctx.translate(enemy.x, enemy.y);
                this.ctx.rotate(enemy.angle);
                
                // Draw enemy with color based on tier
                this.ctx.fillStyle = this.ENEMY_COLORS[enemy.tier];
                this.ctx.beginPath();
                this.ctx.arc(0, 0, 20, 0, Math.PI * 2);
                this.ctx.fill();

                if (enemy.type === 'octopus') {
                    this.ctx.drawImage(this.octopusSprite, -20, -20, 40, 40);
                } else {
                    this.ctx.drawImage(this.fishSprite, -20, -20, 40, 40);
                }
                
                this.ctx.restore();

                // Draw health bar and tier indicator
                const maxHealth = this.ENEMY_MAX_HEALTH[enemy.tier];
                this.ctx.fillStyle = 'red';
                this.ctx.fillRect(enemy.x - 25, enemy.y - 30, 50, 5);
                this.ctx.fillStyle = 'green';
                this.ctx.fillRect(enemy.x - 25, enemy.y - 30, 50 * (enemy.health / maxHealth), 5);
                this.ctx.fillStyle = 'white';
                this.ctx.font = '12px Arial';
                this.ctx.fillText(enemy.tier.toUpperCase(), enemy.x - 25, enemy.y + 35);
            });

            // Draw obstacles
            this.obstacles.forEach(obstacle => {
                if (obstacle.type === 'coral') {
                    this.ctx.save();
                    this.ctx.translate(obstacle.x, obstacle.y);
                    
                    if (obstacle.isEnemy) {
                        // Draw enemy coral with a reddish tint
                        this.ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
                        this.ctx.fillRect(0, 0, obstacle.width, obstacle.height);
                    }
                    
                    this.ctx.drawImage(this.coralSprite, 0, 0, obstacle.width, obstacle.height);
                    
                    if (obstacle.isEnemy && obstacle.health !== undefined) {
                        // Draw health bar for enemy coral
                        this.ctx.fillStyle = 'red';
                        this.ctx.fillRect(0, -10, obstacle.width, 5);
                        this.ctx.fillStyle = 'green';
                        this.ctx.fillRect(0, -10, obstacle.width * (obstacle.health / this.ENEMY_CORAL_MAX_HEALTH), 5);
                    }
                    
                    this.ctx.restore();
                }
            });

            // Draw items
            this.items.forEach(item => {
                const sprite = this.itemSprites[item.type];
                this.ctx.drawImage(sprite, item.x - 15, item.y - 15, 30, 30);
            });

            // Draw player inventory
            const socketId = this.socket.id;
            if (socketId) {
                const player = this.players.get(socketId);
                if (player) {
                    player.inventory.forEach((item, index) => {
                        const sprite = this.itemSprites[item.type];
                        this.ctx.drawImage(sprite, 10 + index * 40, 10, 30, 30);
                    });
                }
            }

            this.ctx.restore();
        } else {
            this.renderInventoryMenu();
        }

        this.gameLoopId = requestAnimationFrame(() => this.gameLoop());
    }

    private setupItemSprites() {
        const itemTypes = ['health_potion', 'speed_boost', 'shield'];
        itemTypes.forEach(type => {
            const sprite = new Image();
            sprite.src = `./assets/${type}.png`;
            this.itemSprites[type] = sprite;
        });
    }

    private resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        
        // Update any viewport-dependent calculations here
        // For example, you might want to adjust the camera bounds
        console.log('Canvas resized to:', this.canvas.width, 'x', this.canvas.height);
    }

    public cleanup() {
        // Stop the game loop
        if (this.gameLoopId) {
            cancelAnimationFrame(this.gameLoopId);
        }

        // Terminate the web worker if it exists
        if (this.worker) {
            this.worker.terminate();
            this.worker = null;
        }

        // Disconnect socket if it exists
        if (this.socket) {
            this.socket.disconnect();
        }

        // Clear all game data
        this.players.clear();
        this.enemies.clear();
        this.dots = [];
        this.obstacles = [];
        this.items = [];

        // Clear the canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
}

