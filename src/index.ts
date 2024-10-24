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
    tier: 'easy' | 'medium' | 'hard';
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

class Game {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private socket: Socket;
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
    private readonly ENEMY_MAX_HEALTH = 50;
    private readonly PLAYER_DAMAGE = 10;
    private readonly ENEMY_DAMAGE = 5;
    private readonly DAMAGE_COOLDOWN = 1000; // 1 second cooldown
    private lastDamageTime: number = 0;
    private readonly ENEMY_COLORS = {
        easy: 'green',
        medium: 'orange',
        hard: 'red'
    };
    private obstacles: Obstacle[] = [];
    private coralSprite: HTMLImageElement;
    private readonly ENEMY_CORAL_MAX_HEALTH = 50;
    private items: Item[] = [];
    private itemSprites: Record<string, HTMLImageElement> = {};
    private isInventoryOpen: boolean = false;

    constructor() {
        console.log('Game constructor called');
        this.canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
        this.ctx = this.canvas.getContext('2d')!;
        console.log('Canvas dimensions:', this.canvas.width, 'x', this.canvas.height);
        this.socket = io('https://localhost:3000', { 
            secure: true,
            rejectUnauthorized: false, // Only use this in development
            withCredentials: true
        });
        this.playerSprite = new Image();
        this.playerSprite.src = '/assets/player.png';
        this.playerSprite.onload = () => {
            console.log('Player sprite loaded successfully');
            this.gameLoop();
        };
        this.playerSprite.onerror = (e) => {
            console.error('Error loading player sprite:', e);
        };
        this.octopusSprite = new Image();
        this.octopusSprite.src = '/assets/octopus.png';
        this.fishSprite = new Image();
        this.fishSprite.src = '/assets/fish.png';
        this.coralSprite = new Image();
        this.coralSprite.src = '/assets/coral.png';
        this.setupSocketListeners();
        this.setupEventListeners();
        this.generateDots();
        this.setupItemSprites();
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
        const socketId = this.socket.id;
        if (socketId) {
            const player = this.players.get(socketId);
            if (player) {
                let dx = 0;
                let dy = 0;

                if (this.keysPressed.has('ArrowUp')) dy -= 1;
                if (this.keysPressed.has('ArrowDown')) dy += 1;
                if (this.keysPressed.has('ArrowLeft')) dx -= 1;
                if (this.keysPressed.has('ArrowRight')) dx += 1;

                // Normalize diagonal movement
                if (dx !== 0 && dy !== 0) {
                    const length = Math.sqrt(dx * dx + dy * dy);
                    dx /= length;
                    dy /= length;
                }

                player.velocityX = dx * this.PLAYER_ACCELERATION;
                player.velocityY = dy * this.PLAYER_ACCELERATION;

                // Limit speed
                const speed = Math.sqrt(player.velocityX ** 2 + player.velocityY ** 2);
                if (speed > this.MAX_SPEED) {
                    const ratio = this.MAX_SPEED / speed;
                    player.velocityX *= ratio;
                    player.velocityY *= ratio;
                }
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

    private gameLoop() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = '#00FFFF';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        if (!this.isInventoryOpen) {
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

            this.players.forEach((player, id) => {
                if (id === this.socket.id) {
                    this.updatePlayerPosition(player);
                }

                this.ctx.save();
                this.ctx.translate(player.x, player.y);
                this.ctx.rotate(player.angle);
                
                // Draw the sprite
                this.ctx.drawImage(this.playerSprite, -this.playerSprite.width / 2, -this.playerSprite.height / 2);
                
                this.ctx.restore();

                // Draw score
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

                // Draw health bar
                const maxHealth = enemy.tier === 'easy' ? 30 : enemy.tier === 'medium' ? 50 : 80;
                this.ctx.fillStyle = 'red';
                this.ctx.fillRect(enemy.x - 25, enemy.y - 30, 50, 5);
                this.ctx.fillStyle = 'green';
                this.ctx.fillRect(enemy.x - 25, enemy.y - 30, 50 * (enemy.health / maxHealth), 5);

                // Draw tier indicator
                this.ctx.fillStyle = 'white';
                this.ctx.font = '12px Arial';
                this.ctx.fillText(enemy.tier.toUpperCase(), enemy.x - 15, enemy.y + 35);
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

        requestAnimationFrame(() => this.gameLoop());
    }

    private setupItemSprites() {
        const itemTypes = ['health_potion', 'speed_boost', 'shield'];
        itemTypes.forEach(type => {
            const sprite = new Image();
            sprite.src = `/assets/${type}.png`;
            this.itemSprites[type] = sprite;
        });
    }
}

window.onload = () => {
    console.log('Window loaded, creating game instance');
    new Game();
};
