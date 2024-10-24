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
}

interface Dot {
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
        this.setupSocketListeners();
        this.setupEventListeners();
        this.generateDots();
    }

    private setupSocketListeners() {
        this.socket.on('connect', () => {
            console.log('Connected to server with ID:', this.socket.id);
        });

        this.socket.on('currentPlayers', (players: Record<string, Player>) => {
            console.log('Received current players:', players);
            this.players.clear();
            Object.values(players).forEach(player => {
                this.players.set(player.id, {...player, imageLoaded: true, score: 0, velocityX: 0, velocityY: 0});
            });
        });

        this.socket.on('newPlayer', (player: Player) => {
            console.log('New player joined:', player);
            this.players.set(player.id, {...player, imageLoaded: true, score: 0, velocityX: 0, velocityY: 0});
        });

        this.socket.on('playerMoved', (player: Player) => {
            console.log('Player moved:', player);
            const existingPlayer = this.players.get(player.id);
            if (existingPlayer) {
                Object.assign(existingPlayer, player);
            } else {
                this.players.set(player.id, {...player, imageLoaded: true, score: 0, velocityX: 0, velocityY: 0});
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
    }

    private setupEventListeners() {
        document.addEventListener('keydown', (event) => {
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
        // Apply velocity
        player.x += player.velocityX;
        player.y += player.velocityY;

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
        this.updateCamera(player);
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

    private gameLoop() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = '#00FFFF';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

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
        });

        this.ctx.restore();

        requestAnimationFrame(() => this.gameLoop());
    }
}

window.onload = () => {
    console.log('Window loaded, creating game instance');
    new Game();
};
