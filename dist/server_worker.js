/******/ (() => { // webpackBootstrap
/******/ 	"use strict";

;// ./src/constants.ts
// Add these constants at the top with the others
const FISH_DETECTION_RADIUS = 500; // How far fish can detect players
const PLAYER_BASE_SPEED = 5; // Base player speed to match
const FISH_RETURN_SPEED = 0.5; // Speed at which fish return to their normal behavior
const players = {};
const dots = (/* unused pure expression or super */ null && ([]));
const enemies = [];
const obstacles = [];
const items = [];
const WORLD_WIDTH = 10000;
const WORLD_HEIGHT = 2000;
//export let ENEMY_COUNT = 200;
const OBSTACLE_COUNT = 20;
const ENEMY_CORAL_PROBABILITY = 0.3;
const ENEMY_CORAL_HEALTH = 50;
const ENEMY_CORAL_DAMAGE = 5;
const PLAYER_MAX_HEALTH = 100;
const ENEMY_MAX_HEALTH = 50;
const PLAYER_DAMAGE = 5;
const ENEMY_DAMAGE = 20;
const DECORATION_COUNT = 100;
const SAND_COUNT = 50; // Reduced from 200 to 50
const MIN_SAND_RADIUS = 50; // Increased from 30 to 50
const MAX_SAND_RADIUS = 120; // Increased from 80 to 120
const ENEMY_TIERS = {
    common: { health: 5, speed: 0.5, damage: 5, probability: 0.4, color: '#808080' },
    uncommon: { health: 40, speed: 0.75, damage: 10, probability: 0.3, color: '#008000' },
    rare: { health: 60, speed: 1, damage: 15, probability: 0.15, color: '#0000FF' },
    epic: { health: 80, speed: 1.25, damage: 20, probability: 0.1, color: '#800080' },
    legendary: { health: 100, speed: 1.5, damage: 25, probability: 0.04, color: '#FFA500' },
    mythic: { health: 150, speed: 2, damage: 30, probability: 0.01, color: '#FF0000' }
};
const MAX_INVENTORY_SIZE = 5;
const RESPAWN_INVULNERABILITY_TIME = 3000; // 3 seconds of invulnerability after respawn
// Add knockback constants at the top with other constants
const KNOCKBACK_FORCE = 20; // Increased from 20 to 100
const KNOCKBACK_RECOVERY_SPEED = 0.9; // How quickly the knockback effect diminishes
// Add XP-related constants
const BASE_XP_REQUIREMENT = 100;
const XP_MULTIPLIER = 1.5;
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
    common: 1, // 10% chance
    uncommon: 1, // 20% chance
    rare: 1, // 30% chance
    epic: 1, // 40% chance
    legendary: 1, // 50% chance
    mythic: 1 // 75% chance
};

;// ./src/server_utils.ts

const sands = [];
function getRandomPositionInZone(zoneIndex) {
    const zoneWidth = WORLD_WIDTH / 6; // 6 zones
    const startX = zoneIndex * zoneWidth;
    // For legendary and mythic zones, ensure they're in the rightmost areas
    if (zoneIndex >= 4) { // Legendary and Mythic zones
        const adjustedStartX = WORLD_WIDTH - (6 - zoneIndex) * (zoneWidth / 2); // Start from right side
        return {
            x: adjustedStartX + Math.random() * (WORLD_WIDTH - adjustedStartX),
            y: Math.random() * WORLD_HEIGHT
        };
    }
    return {
        x: startX + Math.random() * zoneWidth,
        y: Math.random() * WORLD_HEIGHT
    };
}
function createDecoration() {
    const zoneIndex = Math.floor(Math.random() * 6); // 6 zones
    const pos = getRandomPositionInZone(zoneIndex);
    return {
        x: pos.x,
        y: pos.y,
        scale: 0.5 + Math.random() * 1.5
    };
}
function createSand() {
    // Create sand patches with more spacing
    const sectionWidth = WORLD_WIDTH; // Divide world into sections
    const sectionIndex = sands.length;
    return {
        x: (sectionIndex * sectionWidth) + Math.random() * sectionWidth, // Spread out along x-axis
        y: Math.random() * WORLD_HEIGHT,
        radius: MIN_SAND_RADIUS + Math.random() * (MAX_SAND_RADIUS - MIN_SAND_RADIUS),
        rotation: Math.random() * Math.PI * 2
    };
}

;// ./src/signaling.ts
// SignalingClient class
class SignalingClient {
    constructor(serverUrl) {
        this.serverUrl = serverUrl;
        this.ws = null;
        this.messageHandlers = [];
        this.openHandlers = [];
        this.errorHandlers = [];
        this.clientId = `client_${Math.random().toString(36).substr(2, 9)}`;
    }
    connect() {
        try {
            console.log('[Client] Attempting to connect to:', this.serverUrl);
            this.ws = new WebSocket(this.serverUrl);
            this.ws.onopen = () => {
                console.log('[Client] WebSocket connection established');
                // Send initial connection message with client ID
                this.send({
                    type: 'connect',
                    clientId: this.clientId
                });
                this.openHandlers.forEach(handler => handler());
            };
            this.ws.onmessage = (event) => {
                try {
                    console.log('[Client] Raw message received:', event.data);
                    const message = JSON.parse(event.data);
                    console.log('[Client] Parsed message:', message);
                    this.messageHandlers.forEach(handler => handler(message));
                }
                catch (error) {
                    console.error('[Client] Error handling message:', error);
                }
            };
            this.ws.onerror = (event) => {
                console.error('[Client] WebSocket error:', event);
                const error = new Error('WebSocket error occurred');
                this.errorHandlers.forEach(handler => handler(error));
            };
            this.ws.onclose = () => {
                console.log('[Client] WebSocket connection closed');
            };
        }
        catch (error) {
            console.error('[Client] Connection error:', error);
            if (error instanceof Error) {
                this.errorHandlers.forEach(handler => handler(error));
            }
        }
    }
    send(message) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            console.error('[Client] Cannot send message - connection not open');
            return;
        }
        // Add client ID to all outgoing messages
        const fullMessage = Object.assign(Object.assign({}, message), { clientId: this.clientId });
        console.log('[Client] Sending message:', fullMessage);
        this.ws.send(JSON.stringify(fullMessage));
    }
    onMessage(handler) {
        this.messageHandlers.push(handler);
    }
    onOpen(handler) {
        this.openHandlers.push(handler);
    }
    onError(handler) {
        this.errorHandlers.push(handler);
    }
    close() {
        console.log('[Client] Closing connection');
        if (this.ws) {
            this.ws.close();
            this.ws = null;
            console.log('[Client] Connection closed');
        }
        this.messageHandlers = [];
        this.openHandlers = [];
        this.errorHandlers = [];
        console.log('[Client] All handlers cleared');
    }
}
// SignalingServer class
class SignalingServer {
    constructor(port) {
        this.port = port;
        this.connections = new Map();
        this.messageHandlers = [];
        this.server = null;
        this.wsConnections = new Map();
        if (typeof self !== 'undefined' &&
            typeof Window === 'undefined' &&
            typeof WorkerGlobalScope !== 'undefined') {
            this.initializeServer();
        }
    }
    initializeServer() {
        try {
            console.log('[Server] Initializing SignalingServer on port:', this.port);
            // Create message channel for worker communication
            const channel = new MessageChannel();
            this.server = channel.port1;
            this.server.onmessage = this.handleServerMessage.bind(this);
            this.server.start();
            // Send port info to main thread
            self.postMessage({
                type: 'server_init',
                port: channel.port2,
                serverInfo: { port: this.port }
            }, [channel.port2]);
            console.log('[Server] Server initialization complete');
        }
        catch (error) {
            console.error('[Server] Server initialization failed:', error);
        }
    }
    handleClientMessage(clientId, data) {
        console.log('[Server] Handling client message:', clientId, data);
        this.messageHandlers.forEach(handler => handler({
            type: 'client_message',
            clientId,
            data
        }));
    }
    handleDisconnect(clientId) {
        console.log('[Server] Handling disconnect:', clientId);
        const connection = this.connections.get(clientId);
        if (connection) {
            connection.close();
            this.connections.delete(clientId);
            this.messageHandlers.forEach(handler => handler({
                type: 'disconnect',
                clientId
            }));
        }
    }
    handleServerMessage(event) {
        const message = event.data;
        console.log('[Server] Received message:', message);
        switch (message.type) {
            case 'connect':
                this.handleNewConnection(message.clientId);
                break;
            case 'client_message':
                this.handleClientMessage(message.clientId, message.data);
                break;
            case 'disconnect':
                this.handleDisconnect(message.clientId);
                break;
            default:
                console.log('[Server] Unknown message type:', message.type);
        }
    }
    handleNewConnection(clientId) {
        console.log('[Server] New connection:', clientId);
        const channel = new MessageChannel();
        channel.port1.onmessage = (event) => {
            this.handleClientMessage(clientId, event.data);
        };
        channel.port1.start();
        this.connections.set(clientId, channel.port1);
        self.postMessage({
            type: 'client_connection',
            clientId: clientId,
            port: channel.port2
        }, [channel.port2]);
        // Notify handlers about new connection
        this.messageHandlers.forEach(handler => handler({
            type: 'connect',
            clientId: clientId
        }));
    }
    sendToPeer(clientId, message) {
        // Try WebSocket connection first
        const wsConnection = this.wsConnections.get(clientId);
        if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
            console.log('[Server] Sending via WebSocket to client:', clientId, message);
            wsConnection.send(JSON.stringify(message));
            return;
        }
        // Fall back to MessagePort
        const mpConnection = this.connections.get(clientId);
        if (mpConnection) {
            console.log('[Server] Sending via MessagePort to client:', clientId, message);
            mpConnection.postMessage(message);
        }
        else {
            console.error('[Server] No connection found for client:', clientId);
        }
    }
    broadcast(message) {
        console.log('[Server] Broadcasting:', message);
        const messageStr = JSON.stringify(message);
        // Broadcast to WebSocket connections
        this.wsConnections.forEach((ws, clientId) => {
            try {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(messageStr);
                    console.log('[Server] Broadcast sent to WebSocket client:', clientId);
                }
            }
            catch (error) {
                console.error('[Server] WebSocket broadcast failed for client:', clientId, error);
            }
        });
        // Broadcast to MessagePort connections
        this.connections.forEach((connection, clientId) => {
            try {
                connection.postMessage(message);
                console.log('[Server] Broadcast sent to MessagePort client:', clientId);
            }
            catch (error) {
                console.error('[Server] MessagePort broadcast failed for client:', clientId, error);
            }
        });
    }
    onMessage(handler) {
        console.log('[Server] Adding message handler');
        this.messageHandlers.push(handler);
        console.log('[Server] Total handlers:', this.messageHandlers.length);
    }
    isConnected(peerId) {
        return this.connections.has(peerId);
    }
    close() {
        console.log('[Server] Closing all connections');
        this.connections.forEach(connection => connection.close());
        this.connections.clear();
        this.messageHandlers = [];
        if (this.server) {
            this.server.close();
            this.server = null;
        }
        console.log('[Server] Server closed');
    }
}

;// ./src/server_host.ts
var __awaiter = (undefined && undefined.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};



class GameServer {
    constructor() {
        this.connections = new Map();
        this.isRunning = false;
        this.decorations = [];
        this.sands = [];
        this.ENEMY_COUNT = 200;
        this.signalingServer = null;
        this.serverAddress = '';
        // Add authentication storage
        this.authenticatedUsers = new Map();
        this.userCredentials = new Map(); // username -> password
        this.db = null;
        this.DB_NAME = 'GameServerDB';
        this.STORE_NAME = 'credentials';
        this.initializeGameState();
        this.initDatabase().then(() => {
            this.loadUserCredentials();
        }).catch(error => {
            console.error('Failed to initialize database:', error);
        });
    }
    initDatabase() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.DB_NAME, 1);
            request.onerror = () => {
                console.error('Failed to open database:', request.error);
                reject(request.error);
            };
            request.onsuccess = () => {
                console.log('Database opened successfully');
                this.db = request.result;
                resolve();
            };
            request.onupgradeneeded = (event) => {
                console.log('Database upgrade needed');
                const db = event.target.result;
                if (!db.objectStoreNames.contains(this.STORE_NAME)) {
                    db.createObjectStore(this.STORE_NAME);
                    console.log('Created credentials store');
                }
            };
        });
    }
    loadUserCredentials() {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                console.error('Database not initialized');
                reject(new Error('Database not initialized'));
                return;
            }
            const transaction = this.db.transaction(this.STORE_NAME, 'readonly');
            const store = transaction.objectStore(this.STORE_NAME);
            const request = store.get('userCredentials');
            request.onsuccess = () => {
                if (request.result) {
                    console.log('Loaded user credentials');
                    this.userCredentials = new Map(JSON.parse(request.result));
                }
                else {
                    console.log('No existing credentials found');
                    this.userCredentials = new Map();
                }
                resolve();
            };
            request.onerror = () => {
                console.error('Error loading user credentials:', request.error);
                reject(request.error);
            };
        });
    }
    saveUserCredentials() {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                console.error('Database not initialized');
                reject(new Error('Database not initialized'));
                return;
            }
            const transaction = this.db.transaction(this.STORE_NAME, 'readwrite');
            const store = transaction.objectStore(this.STORE_NAME);
            const credentials = JSON.stringify(Array.from(this.userCredentials.entries()));
            const request = store.put(credentials, 'userCredentials');
            request.onsuccess = () => {
                console.log('User credentials saved successfully');
                resolve();
            };
            request.onerror = () => {
                console.error('Error saving user credentials:', request.error);
                reject(request.error);
            };
        });
    }
    calculateXPRequirement(level) {
        return Math.floor(BASE_XP_REQUIREMENT * Math.pow(XP_MULTIPLIER, level - 1));
    }
    initializeGameState() {
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
        if (this.isRunning)
            return;
        try {
            // Get port from worker message
            const port = self.port;
            if (!port) {
                throw new Error('Port not specified');
            }
            console.log('[Server] Starting server on port:', port);
            // Initialize SignalingServer with port
            this.signalingServer = new SignalingServer(port); // Pass port to constructor
            // Get the server's WebSocket address with the specified port
            const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
            this.serverAddress = `${protocol}//${location.hostname}:${port}`;
            console.log('[Server] Server address:', this.serverAddress);
            // Send server address to UI
            this.postMessage('address', {
                address: this.serverAddress,
                port: port
            });
            this.signalingServer.onMessage((message) => {
                this.handleMessage(message);
            });
            this.isRunning = true;
            this.postMessage('status', { online: true });
            this.postMessage('log', `Server started successfully at ${this.serverAddress}`);
            // Start game loops after server is running
            this.startGameLoops();
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.postMessage('log', `Failed to start server: ${errorMessage}`);
        }
    }
    handleMessage(message) {
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
        }
        catch (error) {
            console.error('Error handling message:', error);
        }
    }
    handleAuthentication(data, peerId) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            try {
                const { username, password, playerName } = data;
                // Check if this is a registration
                if (!this.userCredentials.has(username)) {
                    // Register new user
                    this.userCredentials.set(username, password);
                    yield this.saveUserCredentials();
                    console.log('New user registered:', username);
                }
                else {
                    // Verify password for existing user
                    if (this.userCredentials.get(username) !== password) {
                        console.log('Invalid credentials for user:', username);
                        (_a = this.signalingServer) === null || _a === void 0 ? void 0 : _a.sendToPeer(peerId, {
                            type: 'authenticated',
                            data: {
                                success: false,
                                error: 'Invalid credentials'
                            }
                        });
                        return;
                    }
                    console.log('User authenticated:', username);
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
                (_b = this.signalingServer) === null || _b === void 0 ? void 0 : _b.sendToPeer(peerId, {
                    type: 'authenticated',
                    data: {
                        success: true,
                        playerId: userId,
                        gameState: {
                            players: players,
                            enemies: enemies,
                            items: items,
                            obstacles: obstacles,
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
            catch (error) {
                console.error('Authentication error:', error);
                (_c = this.signalingServer) === null || _c === void 0 ? void 0 : _c.sendToPeer(peerId, {
                    type: 'authenticated',
                    data: {
                        success: false,
                        error: 'Internal server error'
                    }
                });
            }
        });
    }
    broadcast(message) {
        if (!this.signalingServer)
            return;
        this.signalingServer.broadcast(message);
    }
    stop() {
        if (!this.isRunning)
            return;
        this.connections.clear();
        this.isRunning = false;
        this.signalingServer = null;
        // Close the database connection
        if (this.db) {
            this.db.close();
            this.db = null;
            console.log('Database connection closed');
        }
        this.postMessage('status', { online: false });
        this.postMessage('log', 'Server stopped');
    }
    startGameLoops() {
        // Game update loop
        setInterval(() => {
            this.moveEnemies();
            this.updateStats();
            this.broadcast({
                type: 'gameState',
                data: {
                    players: players,
                    enemies: enemies,
                    items: items
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
    createEnemy() {
        // Enemy creation logic (unchanged)
        const x = Math.random() * WORLD_WIDTH;
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
    createObstacle() {
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
    moveEnemies() {
        // Enemy movement logic (implement your existing logic here)
    }
    updateStats() {
        this.postMessage('stats', {
            players: Object.keys(players).length,
            enemies: enemies.length
        });
    }
    postMessage(type, data) {
        self.postMessage({ type, data });
    }
    handlePlayerMovement(data) {
        const player = players[data.id];
        if (!player)
            return;
        // Update player position and movement data
        player.x = Math.max(0, Math.min(WORLD_WIDTH - PLAYER_SIZE, data.x));
        player.y = Math.max(0, Math.min(WORLD_HEIGHT - PLAYER_SIZE, data.y));
        player.angle = data.angle;
        player.velocityX = data.velocityX;
        player.velocityY = data.velocityY;
        // Check for collisions with enemies
        for (const enemy of enemies) {
            const enemySize = ENEMY_SIZE * ENEMY_SIZE_MULTIPLIERS[enemy.tier];
            if (player.x < enemy.x + enemySize &&
                player.x + PLAYER_SIZE > enemy.x &&
                player.y < enemy.y + enemySize &&
                player.y + PLAYER_SIZE > enemy.y) {
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
    isAuthenticated(peerId) {
        return this.authenticatedUsers.has(peerId);
    }
    handleDisconnect(peerId) {
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
    getIsRunning() {
        return this.isRunning;
    }
    getServerAddress() {
        return this.serverAddress;
    }
}
// Create server instance
const gameServer = new GameServer();
// Handle worker messages
self.onmessage = function (e) {
    const { type, data } = e.data;
    switch (type) {
        case 'start':
            // Store port in worker scope
            if (data && data.port) {
                console.log('[Worker] Received port:', data.port);
                self.port = data.port;
                gameServer.start();
            }
            else {
                console.error('[Worker] No port specified in start message');
            }
            break;
        case 'stop':
            gameServer.stop();
            break;
        case 'getAddress':
            if (gameServer.getIsRunning()) {
                self.postMessage({
                    type: 'address',
                    data: {
                        address: gameServer.getServerAddress(),
                        port: self.port
                    }
                });
            }
            break;
        default:
            console.warn('Unknown message type:', type);
    }
};

/******/ })()
;