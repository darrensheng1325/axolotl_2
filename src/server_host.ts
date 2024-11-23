import { 
    PLAYER_DAMAGE, WORLD_WIDTH, WORLD_HEIGHT, ZONE_BOUNDARIES, 
    ENEMY_TIERS, KNOCKBACK_RECOVERY_SPEED, FISH_DETECTION_RADIUS,
    ENEMY_SIZE, ENEMY_SIZE_MULTIPLIERS, PLAYER_SIZE, KNOCKBACK_FORCE,
    DROP_CHANCES, PLAYER_MAX_HEALTH, HEALTH_PER_LEVEL, DAMAGE_PER_LEVEL,
    BASE_XP_REQUIREMENT, XP_MULTIPLIER, RESPAWN_INVULNERABILITY_TIME,
    enemies, players, items, dots, obstacles, OBSTACLE_COUNT,
    ENEMY_CORAL_PROBABILITY, ENEMY_CORAL_HEALTH, SAND_COUNT, DECORATION_COUNT
} from './constants';
import { Enemy, Obstacle, createDecoration, getRandomPositionInZone, Decoration, Sand, createSand } from './server_utils';
import { Item } from './item';
import { ServerPlayer } from './player';
import { SignalingServer } from './signaling';

// Custom WebSocket connection interface
interface GameConnection {
    id: string;
    peerId: string;
    userId?: string;
    username?: string;
}

// Add authentication interfaces
interface AuthData {
    username: string;
    password: string;
    playerName: string;
}

interface AuthenticatedUser {
    userId: string;
    username: string;
    playerName: string;
}

class GameServer {
    protected connections: Map<string, GameConnection> = new Map();
    protected isRunning: boolean = false;
    protected decorations: Decoration[] = [];
    protected sands: Sand[] = [];
    protected ENEMY_COUNT = 200;
    protected signalingServer: SignalingServer | null = null;
    protected serverAddress: string = '';
    // Add authentication storage
    protected authenticatedUsers: Map<string, AuthenticatedUser> = new Map();
    protected userCredentials: Map<string, string> = new Map(); // username -> password

    private db: IDBDatabase | null = null;
    private readonly DB_NAME = 'GameServerDB';
    private readonly STORE_NAME = 'credentials';

    constructor() {
        this.initializeGameState();
        this.initDatabase().then(() => {
            this.loadUserCredentials();
        }).catch(error => {
            console.error('Failed to initialize database:', error);
        });
    }

    private initDatabase(): Promise<void> {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.DB_NAME, 1);

            request.onerror = () => reject(request.error);

            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;
                if (!db.objectStoreNames.contains(this.STORE_NAME)) {
                    db.createObjectStore(this.STORE_NAME);
                }
            };
        });
    }

    private loadUserCredentials() {
        if (!this.db) {
            console.error('Database not initialized');
            return;
        }

        const transaction = this.db.transaction(this.STORE_NAME, 'readonly');
        const store = transaction.objectStore(this.STORE_NAME);
        const request = store.get('userCredentials');

        request.onsuccess = () => {
            if (request.result) {
                this.userCredentials = new Map(JSON.parse(request.result));
            }
        };

        request.onerror = () => {
            console.error('Error loading user credentials:', request.error);
        };
    }

    private saveUserCredentials() {
        if (!this.db) {
            console.error('Database not initialized');
            return;
        }

        const transaction = this.db.transaction(this.STORE_NAME, 'readwrite');
        const store = transaction.objectStore(this.STORE_NAME);
        const credentials = JSON.stringify(Array.from(this.userCredentials.entries()));
        
        const request = store.put(credentials, 'userCredentials');

        request.onerror = () => {
            console.error('Error saving user credentials:', request.error);
        };
    }

    private calculateXPRequirement(level: number): number {
        return Math.floor(BASE_XP_REQUIREMENT * Math.pow(XP_MULTIPLIER, level - 1));
    }

    private initializeGameState() {
        // Initialize game elements
        for (let i = 0; i < this.ENEMY_COUNT; i++) {
            enemies.push(this.createEnemy());
        }

        for (let i = 0; i < OBSTACLE_COUNT; i++) {
            obstacles.push(this.createObstacle());
        }

        for (let i = 0; i < DECORATION_COUNT; i++) {
            this.decorations.push(createDecoration());
        }

        for (let i = 0; i < SAND_COUNT; i++) {
            this.sands.push(createSand());
        }
    }

    start() {
        if (this.isRunning) return;
        
        try {
            // Initialize SignalingServer
            this.signalingServer = new SignalingServer();
            
            // Get the server's WebSocket address
            const port = 8080; // Use the same port as in SignalingServer
            const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
            this.serverAddress = `${protocol}//${location.hostname}:${port}`;
            
            // Send server address to UI
            this.postMessage('address', { address: this.serverAddress });
            
            this.signalingServer.onMessage((message) => {
                this.handleMessage(message);
            });

            this.isRunning = true;
            this.postMessage('status', { online: true });
            this.postMessage('log', `Server started successfully at ${this.serverAddress}`);

            // Start game loops after server is running
            this.startGameLoops();

        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.postMessage('log', `Failed to start server: ${errorMessage}`);
        }
    }

    private handleMessage(message: any) {
        try {
            switch (message.type) {
                case 'authenticate':
                    this.handleAuthentication(message.data, message.peerId);
                    break;
                case 'playerMovement':
                    if (this.isAuthenticated(message.peerId)) {
                        this.handlePlayerMovement(message.data);
                    }
                    break;
                // Add other message handlers
                case 'disconnect':
                    this.handleDisconnect(message.peerId);
                    break;
            }
        } catch (error) {
            console.error('Error handling message:', error);
        }
    }

    private handleAuthentication(data: AuthData, peerId: string) {
        const { username, password, playerName } = data;

        // Check if this is a registration
        if (!this.userCredentials.has(username)) {
            // Register new user
            this.userCredentials.set(username, password);
            this.saveUserCredentials();
        } else {
            // Verify password for existing user
            if (this.userCredentials.get(username) !== password) {
                this.signalingServer?.sendToPeer(peerId, {
                    type: 'authenticated',
                    data: { 
                        success: false, 
                        error: 'Invalid credentials' 
                    }
                });
                return;
            }
        }

        // Generate userId and store authenticated user
        const userId = `user_${Math.random().toString(36).substr(2, 9)}`;
        const authenticatedUser = { userId, username, playerName };
        this.authenticatedUsers.set(peerId, authenticatedUser);

        // Create initial player state
        players[userId] = {
            id: userId,
            name: playerName,
            x: 200,
            y: WORLD_HEIGHT / 2,
            angle: 0,
            score: 0,
            velocityX: 0,
            velocityY: 0,
            health: PLAYER_MAX_HEALTH,
            maxHealth: PLAYER_MAX_HEALTH,
            damage: PLAYER_DAMAGE,
            inventory: [],
            loadout: Array(10).fill(null),
            isInvulnerable: true,
            level: 1,
            xp: 0,
            xpToNextLevel: this.calculateXPRequirement(1)
        };

        // Send success response with game state
        this.signalingServer?.sendToPeer(peerId, {
            type: 'authenticated',
            data: {
                success: true,
                playerId: userId,
                gameState: {
                    players,
                    enemies,
                    items,
                    obstacles,
                    decorations: this.decorations,
                    sands: this.sands
                }
            }
        });

        // Broadcast new player to others
        this.broadcast({
            type: 'playerJoined',
            data: players[userId]
        });
    }

    private broadcast(message: any) {
        if (!this.signalingServer) return;
        this.signalingServer.broadcast(message);
    }

    stop() {
        if (!this.isRunning) return;
        
        this.connections.clear();
        this.isRunning = false;
        this.signalingServer = null;
        
        // Close the database connection
        if (this.db) {
            this.db.close();
            this.db = null;
        }
        
        this.postMessage('status', { online: false });
        this.postMessage('log', 'Server stopped');
    }

    private startGameLoops() {
        // Game update loop
        setInterval(() => {
            this.moveEnemies();
            this.updateStats();
            this.broadcast({
                type: 'gameState',
                data: {
                    players,
                    enemies,
                    items
                }
            });
        }, 100);

        // Health regeneration loop
        setInterval(() => {
            Object.values(players).forEach(player => {
                if (player.health < player.maxHealth) {
                    player.health = Math.min(player.maxHealth, player.health + 5);
                }
            });
        }, 1000);
    }

    private createEnemy(): Enemy {
        // Enemy creation logic (unchanged)
        const x = Math.random() * WORLD_WIDTH;
        let tier: Enemy['tier'] = 'common';
        
        for (const [t, zone] of Object.entries(ZONE_BOUNDARIES)) {
            if (x >= zone.start && x < zone.end) {
                tier = t as Enemy['tier'];
                break;
            }
        }

        const tierData = ENEMY_TIERS[tier];

        return {
            id: Math.random().toString(36).substr(2, 9),
            type: Math.random() < 0.5 ? 'octopus' : 'fish',
            tier,
            x: x,
            y: Math.random() * WORLD_HEIGHT,
            angle: Math.random() * Math.PI * 2,
            health: tierData.health,
            speed: tierData.speed,
            damage: tierData.damage,
            knockbackX: 0,
            knockbackY: 0
        };
    }

    private createObstacle(): Obstacle {
        // Obstacle creation logic (unchanged)
        const isEnemy = Math.random() < ENEMY_CORAL_PROBABILITY;
        return {
            id: Math.random().toString(36).substr(2, 9),
            x: Math.random() * WORLD_WIDTH,
            y: Math.random() * WORLD_HEIGHT,
            width: 50 + Math.random() * 50,
            height: 50 + Math.random() * 50,
            type: 'coral',
            isEnemy: isEnemy,
            health: isEnemy ? ENEMY_CORAL_HEALTH : undefined
        };
    }

    private moveEnemies() {
        // Enemy movement logic (implement your existing logic here)
    }

    private updateStats() {
        this.postMessage('stats', {
            players: Object.keys(players).length,
            enemies: enemies.length
        });
    }

    private postMessage(type: string, data: any) {
        self.postMessage({ type, data });
    }

    private handlePlayerMovement(data: {
        id: string;
        x: number;
        y: number;
        angle: number;
        velocityX: number;
        velocityY: number;
    }) {
        const player = players[data.id];
        if (!player) return;

        // Update player position and movement data
        player.x = Math.max(0, Math.min(WORLD_WIDTH - PLAYER_SIZE, data.x));
        player.y = Math.max(0, Math.min(WORLD_HEIGHT - PLAYER_SIZE, data.y));
        player.angle = data.angle;
        player.velocityX = data.velocityX;
        player.velocityY = data.velocityY;

        // Check for collisions with enemies
        for (const enemy of enemies) {
            const enemySize = ENEMY_SIZE * ENEMY_SIZE_MULTIPLIERS[enemy.tier];
            
            if (
                player.x < enemy.x + enemySize &&
                player.x + PLAYER_SIZE > enemy.x &&
                player.y < enemy.y + enemySize &&
                player.y + PLAYER_SIZE > enemy.y
            ) {
                if (!player.isInvulnerable) {
                    // Handle collision
                    player.health -= enemy.damage;
                    
                    // Calculate knockback
                    const dx = enemy.x - player.x;
                    const dy = enemy.y - player.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    const normalizedDx = dx / distance;
                    const normalizedDy = dy / distance;

                    player.x -= normalizedDx * KNOCKBACK_FORCE;
                    player.y -= normalizedDy * KNOCKBACK_FORCE;

                    // Check if player dies
                    if (player.health <= 0) {
                        this.broadcast({
                            type: 'playerDied',
                            data: { playerId: player.id }
                        });
                        
                        // Reset player
                        player.health = player.maxHealth;
                        player.x = 200;
                        player.y = WORLD_HEIGHT / 2;
                        player.isInvulnerable = true;
                        
                        setTimeout(() => {
                            if (players[player.id]) {
                                players[player.id].isInvulnerable = false;
                            }
                        }, RESPAWN_INVULNERABILITY_TIME);
                    }
                }
            }
        }

        // Broadcast updated player state
        this.broadcast({
            type: 'playerMoved',
            data: player
        });
    }

    private isAuthenticated(peerId: string): boolean {
        return this.authenticatedUsers.has(peerId);
    }

    private handleDisconnect(peerId: string) {
        const user = this.authenticatedUsers.get(peerId);
        if (user) {
            // Remove player from game
            delete players[user.userId];
            // Remove from authenticated users
            this.authenticatedUsers.delete(peerId);
            // Broadcast disconnect
            this.broadcast({
                type: 'playerDisconnected',
                data: { playerId: user.userId }
            });
        }
    }

    // Add public getters for the properties we need to access
    public getIsRunning(): boolean {
        return this.isRunning;
    }

    public getServerAddress(): string {
        return this.serverAddress;
    }
}

// Create server instance
const gameServer = new GameServer();

// Handle worker messages
self.onmessage = function(e) {
    const { type, data } = e.data;
    
    switch(type) {
        case 'start':
            gameServer.start();
            break;
        case 'stop':
            gameServer.stop();
            break;
        case 'getAddress':
            // Use the getter methods instead of accessing properties directly
            if (gameServer.getIsRunning()) {
                self.postMessage({
                    type: 'address',
                    data: { address: gameServer.getServerAddress() }
                });
            }
            break;
        default:
            console.warn('Unknown message type:', type);
    }
};