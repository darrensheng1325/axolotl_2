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

// Common interfaces
interface SignalingMessage {
    type: string;
    data?: any;
    clientId?: string;
    peerId?: string;
}

// Add WebSocket types
interface WebSocketWithListeners extends WebSocket {
    addEventListener(type: string, listener: (event: any) => void): void;
    removeEventListener(type: string, listener: (event: any) => void): void;
}

// SignalingClient class
export class SignalingClient {
    private ws: WebSocket | null = null;
    private messageHandlers: ((message: SignalingMessage) => void)[] = [];
    private openHandlers: (() => void)[] = [];
    private errorHandlers: ((error: Error) => void)[] = [];
    private clientId: string;

    constructor(private serverUrl: string) {
        this.clientId = `client_${Math.random().toString(36).substr(2, 9)}`;
    }

    connect(): void {
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
                    const message: SignalingMessage = JSON.parse(event.data);
                    console.log('[Client] Parsed message:', message);
                    this.messageHandlers.forEach(handler => handler(message));
                } catch (error) {
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

        } catch (error) {
            console.error('[Client] Connection error:', error);
            if (error instanceof Error) {
                this.errorHandlers.forEach(handler => handler(error));
            }
        }
    }

    send(message: SignalingMessage): void {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            console.error('[Client] Cannot send message - connection not open');
            return;
        }

        // Add client ID to all outgoing messages
        const fullMessage = {
            ...message,
            clientId: this.clientId
        };

        console.log('[Client] Sending message:', fullMessage);
        this.ws.send(JSON.stringify(fullMessage));
    }

    onMessage(handler: (message: SignalingMessage) => void): void {
        this.messageHandlers.push(handler);
    }

    onOpen(handler: () => void): void {
        this.openHandlers.push(handler);
    }

    onError(handler: (error: Error) => void): void {
        this.errorHandlers.push(handler);
    }

    close(): void {
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
export class SignalingServer {
    private connections: Map<string, MessagePort> = new Map();
    private messageHandlers: ((message: SignalingMessage) => void)[] = [];
    private server: MessagePort | null = null;
    private wsConnections: Map<string, WebSocketWithListeners> = new Map();

    constructor(private port: number) {
        if (typeof self !== 'undefined' && 
            typeof Window === 'undefined' && 
            typeof WorkerGlobalScope !== 'undefined') {
            this.initializeServer();
        }
    }

    private initializeServer(): void {
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
        } catch (error) {
            console.error('[Server] Server initialization failed:', error);
        }
    }

    protected handleClientMessage(clientId: string, data: any): void {
        console.log('[Server] Handling client message:', clientId, data);
        this.messageHandlers.forEach(handler => handler({
            type: 'client_message',
            clientId,
            data
        }));
    }

    protected handleDisconnect(clientId: string): void {
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

    private handleServerMessage(event: MessageEvent): void {
        const message: SignalingMessage = event.data;
        console.log('[Server] Received message:', message);

        switch (message.type) {
            case 'connect':
                this.handleNewConnection(message.clientId!);
                break;
            case 'client_message':
                this.handleClientMessage(message.clientId!, message.data);
                break;
            case 'disconnect':
                this.handleDisconnect(message.clientId!);
                break;
            default:
                console.log('[Server] Unknown message type:', message.type);
        }
    }

    private handleNewConnection(clientId: string): void {
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

    sendToPeer(clientId: string, message: SignalingMessage): void {
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
        } else {
            console.error('[Server] No connection found for client:', clientId);
        }
    }

    broadcast(message: SignalingMessage): void {
        console.log('[Server] Broadcasting:', message);
        const messageStr = JSON.stringify(message);

        // Broadcast to WebSocket connections
        this.wsConnections.forEach((ws, clientId) => {
            try {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(messageStr);
                    console.log('[Server] Broadcast sent to WebSocket client:', clientId);
                }
            } catch (error) {
                console.error('[Server] WebSocket broadcast failed for client:', clientId, error);
            }
        });

        // Broadcast to MessagePort connections
        this.connections.forEach((connection, clientId) => {
            try {
                connection.postMessage(message);
                console.log('[Server] Broadcast sent to MessagePort client:', clientId);
            } catch (error) {
                console.error('[Server] MessagePort broadcast failed for client:', clientId, error);
            }
        });
    }

    onMessage(handler: (message: SignalingMessage) => void): void {
        console.log('[Server] Adding message handler');
        this.messageHandlers.push(handler);
        console.log('[Server] Total handlers:', this.messageHandlers.length);
    }

    isConnected(peerId: string): boolean {
        return this.connections.has(peerId);
    }

    close(): void {
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