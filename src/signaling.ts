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

export interface SignalingMessage {
    type: 'offer' | 'answer' | 'ice-candidate' | 'game-message' | 'join-request' | 'player-movement' | 'collect-item' | 'use-item' | 'craft-items';
    sender: string;
    receiver?: string;
    data: any;
}

export class SignalingServer {
    private connections: Map<string, RTCPeerConnection> = new Map();
    private dataChannels: Map<string, RTCDataChannel> = new Map();
    private onMessageCallback: ((message: any) => void) | null = null;
    private connectionCode: string;
    
    // Game state
    private enemies: Enemy[] = [];
    private items: Item[] = [];
    private obstacles: Obstacle[] = [];
    private decorations: Decoration[] = [];
    private sands: Sand[] = [];
    private players: Map<string, ServerPlayer> = new Map();
    private ENEMY_COUNT = 200;
    private gameLoopInterval: NodeJS.Timeout | null = null;

    constructor() {
        this.connectionCode = Math.random().toString(36).substr(2, 6).toUpperCase();
        this.initializeGameState();
        this.setupHostPeer();
        this.startGameLoop();
    }

    private initializeGameState() {
        // Initialize enemies
        for (let i = 0; i < this.ENEMY_COUNT; i++) {
            this.enemies.push(this.createEnemy());
        }

        // Initialize obstacles
        for (let i = 0; i < OBSTACLE_COUNT; i++) {
            this.obstacles.push(this.createObstacle());
        }

        // Initialize decorations
        for (let i = 0; i < DECORATION_COUNT; i++) {
            this.decorations.push(createDecoration());
        }

        // Initialize sand
        for (let i = 0; i < SAND_COUNT; i++) {
            this.sands.push(createSand());
        }
    }

    private createEnemy(): Enemy {
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

    private startGameLoop() {
        this.gameLoopInterval = setInterval(() => {
            this.moveEnemies();
            this.broadcastGameState();
        }, 100);
    }

    private moveEnemies() {
        this.enemies.forEach(enemy => {
            // Apply knockback
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

            // Find nearest player
            let nearestPlayer: ServerPlayer | undefined;
            let nearestDistance = Infinity;
            
            this.players.forEach(player => {
                const dx = player.x - enemy.x;
                const dy = player.y - enemy.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                if (distance < nearestDistance) {
                    nearestDistance = distance;
                    nearestPlayer = player;
                }
            });

            // Movement behavior based on type
            if (enemy.type === 'octopus') {
                enemy.x += (Math.random() * 4 - 2) * enemy.speed;
                enemy.y += (Math.random() * 4 - 2) * enemy.speed;
            } else if (nearestPlayer && nearestDistance < FISH_DETECTION_RADIUS) {
                const dx = nearestPlayer.x - enemy.x;
                const dy = nearestPlayer.y - enemy.y;
                const angle = Math.atan2(dy, dx);
                enemy.angle = angle;
                enemy.x += Math.cos(angle) * enemy.speed;
                enemy.y += Math.sin(angle) * enemy.speed;
            }

            // Keep enemies in their zones
            const zone = ZONE_BOUNDARIES[enemy.tier];
            enemy.x = Math.max(zone.start, Math.min(zone.end - 1, enemy.x));
            enemy.y = (enemy.y + WORLD_HEIGHT) % WORLD_HEIGHT;
        });
    }

    private broadcastGameState() {
        const gameState = {
            enemies: this.enemies,
            items: this.items,
            players: Array.from(this.players.values())
        };

        this.broadcast({
            type: 'game-state',
            data: gameState
        });
    }

    private setupHostPeer() {
        // Create a BroadcastChannel for local discovery
        const channel = new BroadcastChannel(`game-${this.connectionCode}`);
        
        channel.onmessage = async (event) => {
            const message = event.data;
            if (message.type === 'join-request') {
                const peerConnection = new RTCPeerConnection({
                    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
                });

                this.setupPeerConnection(peerConnection, message.sender);

                // Create and send offer
                const offer = await peerConnection.createOffer();
                await peerConnection.setLocalDescription(offer);

                channel.postMessage({
                    type: 'offer',
                    sender: 'host',
                    receiver: message.sender,
                    data: offer
                });
            } else if (message.type === 'answer' && message.receiver === 'host') {
                const peerConnection = this.connections.get(message.sender);
                if (peerConnection) {
                    await peerConnection.setRemoteDescription(new RTCSessionDescription(message.data));
                }
            } else if (message.type === 'ice-candidate' && message.receiver === 'host') {
                const peerConnection = this.connections.get(message.sender);
                if (peerConnection) {
                    await peerConnection.addIceCandidate(new RTCIceCandidate(message.data));
                }
            }
        };

        // Post the connection code to the worker
        self.postMessage({ 
            type: 'connection-code', 
            data: { code: this.connectionCode } 
        });
    }

    private setupPeerConnection(peerConnection: RTCPeerConnection, peerId: string) {
        this.connections.set(peerId, peerConnection);

        // Create data channel
        const dataChannel = peerConnection.createDataChannel('gameData');
        this.setupDataChannel(dataChannel, peerId);

        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                const channel = new BroadcastChannel(`game-${this.connectionCode}`);
                channel.postMessage({
                    type: 'ice-candidate',
                    sender: 'host',
                    receiver: peerId,
                    data: event.candidate
                });
            }
        };

        peerConnection.ondatachannel = (event) => {
            this.setupDataChannel(event.channel, peerId);
        };
    }

    private setupDataChannel(dataChannel: RTCDataChannel, peerId: string) {
        this.dataChannels.set(peerId, dataChannel);

        dataChannel.onmessage = (event) => {
            if (this.onMessageCallback) {
                this.onMessageCallback(JSON.parse(event.data));
            }
        };

        dataChannel.onopen = () => {
            console.log(`Data channel opened with peer ${peerId}`);
            self.postMessage({ 
                type: 'peer-connected', 
                data: { peerId } 
            });
        };

        dataChannel.onclose = () => {
            console.log(`Data channel closed with peer ${peerId}`);
            this.connections.delete(peerId);
            this.dataChannels.delete(peerId);
            self.postMessage({ 
                type: 'peer-disconnected', 
                data: { peerId } 
            });
        };
    }

    public isConnected(peerId: string): boolean {
        const channel = this.dataChannels.get(peerId);
        return channel?.readyState === 'open';
    }

    public sendToPeer(peerId: string, message: any): boolean {
        const channel = this.dataChannels.get(peerId);
        if (channel?.readyState === 'open') {
            channel.send(JSON.stringify(message));
            return true;
        }
        return false;
    }

    public broadcast(message: any) {
        const messageStr = JSON.stringify(message);
        this.dataChannels.forEach(channel => {
            if (channel.readyState === 'open') {
                channel.send(messageStr);
            }
        });
    }

    public onMessage(callback: (message: any) => void) {
        this.onMessageCallback = callback;
    }

    public getConnectionCode(): string {
        return this.connectionCode;
    }

    private handleMessage(message: SignalingMessage) {
        switch (message.type) {
            case 'player-movement':
                this.handlePlayerMovement(message.sender, message.data);
                break;
            case 'collect-item':
                this.handleItemCollection(message.sender, message.data);
                break;
            case 'use-item':
                this.handleItemUse(message.sender, message.data);
                break;
            case 'craft-items':
                this.handleCrafting(message.sender, message.data);
                break;
        }
    }

    // Add these methods to handle game mechanics
    private handlePlayerMovement(playerId: string, movementData: any) {
        const player = this.players.get(playerId);
        if (!player) return;

        // Update player position
        player.x = movementData.x;
        player.y = movementData.y;
        player.angle = movementData.angle;

        // Check collisions
        this.checkCollisions(player);
    }

    private handleItemCollection(playerId: string, itemId: string) {
        const player = this.players.get(playerId);
        if (!player) return;

        const itemIndex = this.items.findIndex(item => item.id === itemId);
        if (itemIndex === -1) return;

        const item = this.items[itemIndex];
        player.inventory.push(item);
        this.items.splice(itemIndex, 1);

        this.broadcast({
            type: 'item-collected',
            data: { playerId, itemId, inventory: player.inventory }
        });
    }

    private handleItemUse(playerId: string, itemId: string) {
        const player = this.players.get(playerId);
        if (!player) return;

        // Find item in player's loadout
        const loadoutSlot = player.loadout.findIndex(item => item?.id === itemId);
        if (loadoutSlot === -1) return;

        const item = player.loadout[loadoutSlot];
        if (!item) return;

        // Apply item effects
        this.applyItemEffect(player, item);
    }

    private handleCrafting(playerId: string, craftingData: { items: Item[] }) {
        const player = this.players.get(playerId);
        if (!player) return;

        // Verify items are valid for crafting
        if (!this.validateCrafting(player, craftingData.items)) {
            return;
        }

        // Create upgraded item
        const newItem = this.createUpgradedItem(craftingData.items[0]);

        // Remove used items from inventory
        player.inventory = player.inventory.filter(invItem => 
            !craftingData.items.some(craftItem => craftItem.id === invItem.id)
        );

        // Add new item to inventory
        player.inventory.push(newItem);

        this.broadcast({
            type: 'crafting-success',
            data: { playerId, newItem, inventory: player.inventory }
        });
    }

    public cleanup() {
        if (this.gameLoopInterval) {
            clearInterval(this.gameLoopInterval);
        }
        this.connections.forEach(conn => conn.close());
        this.connections.clear();
        this.dataChannels.clear();
        const channel = new BroadcastChannel(`game-${this.connectionCode}`);
        channel.close();
    }

    private checkCollisions(player: ServerPlayer) {
        // Check enemy collisions
        this.enemies.forEach(enemy => {
            const enemySize = ENEMY_SIZE * ENEMY_SIZE_MULTIPLIERS[enemy.tier];
            
            if (
                player.x < enemy.x + enemySize &&
                player.x + PLAYER_SIZE > enemy.x &&
                player.y < enemy.y + enemySize &&
                player.y + PLAYER_SIZE > enemy.y
            ) {
                if (!player.isInvulnerable) {
                    // Apply damage and knockback
                    player.health -= enemy.damage;
                    
                    // Calculate knockback
                    const dx = enemy.x - player.x;
                    const dy = enemy.y - player.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    const normalizedDx = dx / distance;
                    const normalizedDy = dy / distance;

                    player.knockbackX = -normalizedDx * KNOCKBACK_FORCE;
                    player.knockbackY = -normalizedDy * KNOCKBACK_FORCE;

                    // Damage enemy
                    enemy.health -= player.damage;

                    // Check if enemy dies
                    if (enemy.health <= 0) {
                        const index = this.enemies.findIndex(e => e.id === enemy.id);
                        if (index !== -1) {
                            // Award XP
                            const xpGained = this.getXPFromEnemy(enemy);
                            this.addXPToPlayer(player, xpGained);
                            
                            // Drop item chance
                            if (Math.random() < DROP_CHANCES[enemy.tier]) {
                                this.dropItem(enemy);
                            }

                            this.enemies.splice(index, 1);
                            this.enemies.push(this.createEnemy());
                        }
                    }

                    // Check if player dies
                    if (player.health <= 0) {
                        this.handlePlayerDeath(player);
                    }

                    // Broadcast updates
                    this.broadcast({
                        type: 'combat-update',
                        data: {
                            player: {
                                id: player.id,
                                health: player.health,
                                knockbackX: player.knockbackX,
                                knockbackY: player.knockbackY
                            },
                            enemy: {
                                id: enemy.id,
                                health: enemy.health
                            }
                        }
                    });
                }
            }
        });
    }

    private applyItemEffect(player: ServerPlayer, item: Item) {
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
                player.health = Math.min(
                    player.maxHealth, 
                    player.health + (50 * multiplier)
                );
                break;
                
            case 'speed_boost':
                player.speed_boost = true;
                setTimeout(() => {
                    if (this.players.has(player.id)) {
                        player.speed_boost = false;
                        this.broadcast({
                            type: 'effect-ended',
                            data: {
                                playerId: player.id,
                                effect: 'speed_boost'
                            }
                        });
                    }
                }, 5000 * multiplier);
                break;
                
            case 'shield':
                player.isInvulnerable = true;
                setTimeout(() => {
                    if (this.players.has(player.id)) {
                        player.isInvulnerable = false;
                        this.broadcast({
                            type: 'effect-ended',
                            data: {
                                playerId: player.id,
                                effect: 'shield'
                            }
                        });
                    }
                }, 3000 * multiplier);
                break;
        }

        this.broadcast({
            type: 'effect-applied',
            data: {
                playerId: player.id,
                effect: item.type,
                multiplier
            }
        });
    }

    private validateCrafting(player: ServerPlayer, items: Item[]): boolean {
        // Check if all items exist in player's inventory
        const validItems = items.every(craftItem => 
            player.inventory.some(invItem => invItem.id === craftItem.id)
        );

        if (!validItems) return false;

        // Check if all items are the same type and rarity
        const firstItem = items[0];
        return items.every(item => 
            item.type === firstItem.type && 
            item.rarity === firstItem.rarity
        );
    }

    private createUpgradedItem(baseItem: Item): Item {
        const rarityUpgrades: Record<string, string> = {
            common: 'uncommon',
            uncommon: 'rare',
            rare: 'epic',
            epic: 'legendary',
            legendary: 'mythic'
        };

        return {
            id: Math.random().toString(36).substr(2, 9),
            type: baseItem.type,
            x: 0,
            y: 0,
            rarity: rarityUpgrades[baseItem.rarity || 'common'] as Item['rarity']
        };
    }

    private getXPFromEnemy(enemy: Enemy): number {
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

    private addXPToPlayer(player: ServerPlayer, xp: number) {
        player.xp += xp;
        
        while (player.xp >= player.xpToNextLevel) {
            player.xp -= player.xpToNextLevel;
            player.level++;
            player.maxHealth += HEALTH_PER_LEVEL;
            player.damage += DAMAGE_PER_LEVEL;
            player.xpToNextLevel = Math.floor(BASE_XP_REQUIREMENT * Math.pow(XP_MULTIPLIER, player.level - 1));
            
            this.broadcast({
                type: 'level-up',
                data: {
                    playerId: player.id,
                    level: player.level,
                    maxHealth: player.maxHealth,
                    damage: player.damage
                }
            });
        }

        this.broadcast({
            type: 'xp-gained',
            data: {
                playerId: player.id,
                xp,
                totalXp: player.xp,
                xpToNextLevel: player.xpToNextLevel
            }
        });
    }

    private handlePlayerDeath(player: ServerPlayer) {
        player.isInvulnerable = true;
        player.health = player.maxHealth;
        player.x = 200;
        player.y = WORLD_HEIGHT / 2;
        
        this.broadcast({
            type: 'player-died',
            data: {
                playerId: player.id
            }
        });

        setTimeout(() => {
            if (this.players.has(player.id)) {
                player.isInvulnerable = false;
                this.broadcast({
                    type: 'player-respawned',
                    data: player
                });
            }
        }, RESPAWN_INVULNERABILITY_TIME);
    }

    private dropItem(enemy: Enemy): void {
        const itemTypes = ['health_potion', 'speed_boost', 'shield'] as const;
        const randomType = itemTypes[Math.floor(Math.random() * itemTypes.length)];
        
        const item: Item = {
            id: Math.random().toString(36).substr(2, 9),
            type: randomType,
            x: enemy.x,
            y: enemy.y,
            rarity: enemy.tier
        };

        this.items.push(item);
        this.broadcast({
            type: 'item-dropped',
            data: item
        });
    }
} 