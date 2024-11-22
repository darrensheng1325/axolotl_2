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

// WebSocket message types
interface WebSocketMessage {
    type: string;
    data: any;
}

// SignalingClient class for game clients
export class SignalingClient {
    private ws: WebSocket | null = null;
    private messageHandlers: ((message: any) => void)[] = [];
    private openHandlers: (() => void)[] = [];
    private errorHandlers: ((error: Error) => void)[] = [];

    constructor(private serverUrl: string) {}

    connect(): void {
        try {
            this.ws = new WebSocket(this.serverUrl);

            this.ws.onopen = () => {
                console.log('Connected to signaling server');
                this.openHandlers.forEach(handler => handler());
            };

            this.ws.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    this.messageHandlers.forEach(handler => handler(message));
                } catch (error) {
                    console.error('Error parsing message:', error);
                }
            };

            this.ws.onerror = (event) => {
                const error = new Error('WebSocket error occurred');
                console.error('WebSocket error:', error);
                this.errorHandlers.forEach(handler => handler(error));
            };

        } catch (error) {
            console.error('Error connecting to signaling server:', error);
            if (error instanceof Error) {
                this.errorHandlers.forEach(handler => handler(error));
            }
        }
    }

    send(message: WebSocketMessage): void {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        } else {
            console.error('WebSocket is not connected');
        }
    }

    onMessage(handler: (message: any) => void): void {
        this.messageHandlers.push(handler);
    }

    onOpen(handler: () => void): void {
        this.openHandlers.push(handler);
    }

    onError(handler: (error: Error) => void): void {
        this.errorHandlers.push(handler);
    }

    close(): void {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.messageHandlers = [];
        this.openHandlers = [];
        this.errorHandlers = [];
    }
}

// Update SignalingServer class
export class SignalingServer {
    private connections: Map<string, WebSocket> = new Map();
    private messageHandlers: ((message: any) => void)[] = [];

    constructor() {
        // Check if we're in a worker context
        if (typeof self !== 'undefined' && 
            typeof Window === 'undefined' && 
            typeof WorkerGlobalScope !== 'undefined') {
            // Worker-specific initialization if needed
            console.log('Initializing SignalingServer in worker context');
        }
    }

    onMessage(handler: (message: any) => void): void {
        this.messageHandlers.push(handler);
    }

    isConnected(peerId: string): boolean {
        return this.connections.has(peerId) && 
               (this.connections.get(peerId)?.readyState === WebSocket.OPEN);
    }

    sendToPeer(peerId: string, message: any): void {
        const connection = this.connections.get(peerId);
        if (connection && connection.readyState === WebSocket.OPEN) {
            connection.send(JSON.stringify(message));
        } else {
            console.error(`No active connection for peer ${peerId}`);
        }
    }

    broadcast(message: any): void {
        const messageStr = JSON.stringify(message);
        this.connections.forEach((connection) => {
            if (connection.readyState === WebSocket.OPEN) {
                connection.send(messageStr);
            }
        });
    }

    // Method to handle new connections
    handleConnection(ws: WebSocket, peerId: string): void {
        this.connections.set(peerId, ws);

        ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                this.messageHandlers.forEach(handler => handler(message));
            } catch (error) {
                console.error('Error parsing message:', error);
            }
        };

        ws.onclose = () => {
            this.connections.delete(peerId);
        };

        ws.onerror = (error) => {
            console.error(`WebSocket error for peer ${peerId}:`, error);
            this.connections.delete(peerId);
        };
    }

    // Method to close all connections
    close(): void {
        this.connections.forEach((connection) => {
            connection.close();
        });
        this.connections.clear();
        this.messageHandlers = [];
    }
} 