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
import { WebSocketServer } from 'ws';

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
    private connections: Map<string, MessagePort> = new Map();
    private messageHandlers: ((message: any) => void)[] = [];
    private server: MessagePort | null = null;

    constructor() {
        if (typeof self !== 'undefined' && 
            typeof Window === 'undefined' && 
            typeof WorkerGlobalScope !== 'undefined') {
            this.initializeServer();
        }
    }

    private initializeServer(): void {
        try {
            // Create a message channel for server communication
            const channel = new MessageChannel();
            
            // Store port1 for server communication
            this.server = channel.port1;
            
            // Start listening on port1
            this.server.onmessage = this.handleServerMessage.bind(this);
            this.server.start(); // Start the port

            // Send port2 to the main thread
            self.postMessage({ 
                type: 'server_init', 
                port: channel.port2 
            }, [channel.port2]);

            console.log('Server initialized');
        } catch (error) {
            console.error('Failed to initialize server:', error);
        }
    }

    private handleServerMessage(event: MessageEvent): void {
        const { type, data, clientId } = event.data;
        console.log('Server received message:', type, data, clientId);
        
        switch (type) {
            case 'connection':
                this.handleNewConnection(clientId);
                break;
            case 'message':
                this.handleClientMessage(clientId, data);
                break;
            case 'disconnect':
                this.handleDisconnect(clientId);
                break;
        }
    }

    private handleNewConnection(clientId: string): void {
        console.log('New connection:', clientId);
        // Create a new message channel for this client
        const channel = new MessageChannel();
        
        // Configure port1
        channel.port1.onmessage = (event) => {
            this.handleClientMessage(clientId, event.data);
        };
        channel.port1.start(); // Start the port
        
        // Store the port
        this.connections.set(clientId, channel.port1);

        // Send port2 to the main thread
        self.postMessage({
            type: 'client_connection',
            clientId: clientId,
            port: channel.port2
        }, [channel.port2]);

        // Notify about new connection
        this.messageHandlers.forEach(handler => handler({
            type: 'connection',
            peerId: clientId
        }));
    }

    private handleClientMessage(clientId: string, message: any): void {
        console.log('Client message received:', clientId, message);
        // Add client ID to message and pass to handlers
        message.peerId = clientId;
        this.messageHandlers.forEach(handler => handler(message));
    }

    private handleDisconnect(clientId: string): void {
        console.log('Client disconnected:', clientId);
        const connection = this.connections.get(clientId);
        if (connection) {
            connection.close();
            this.connections.delete(clientId);
            
            // Notify about disconnection
            this.messageHandlers.forEach(handler => handler({
                type: 'disconnect',
                peerId: clientId
            }));
        }
    }

    onMessage(handler: (message: any) => void): void {
        this.messageHandlers.push(handler);
    }

    isConnected(peerId: string): boolean {
        return this.connections.has(peerId);
    }

    sendToPeer(peerId: string, message: any): void {
        console.log('Sending to peer:', peerId, message);
        const connection = this.connections.get(peerId);
        if (connection) {
            connection.postMessage({
                type: 'server_message',
                data: message
            });
        } else {
            console.error(`No active connection for peer ${peerId}`);
        }
    }

    broadcast(message: any): void {
        console.log('Broadcasting message:', message);
        this.connections.forEach((connection, clientId) => {
            console.log('Broadcasting to client:', clientId);
            connection.postMessage({
                type: 'server_message',
                data: message
            });
        });
    }

    close(): void {
        // Close all connections
        this.connections.forEach((connection) => {
            connection.close();
        });
        this.connections.clear();
        this.messageHandlers = [];

        // Close server connection
        if (this.server) {
            this.server.close();
            this.server = null;
        }
    }
} 