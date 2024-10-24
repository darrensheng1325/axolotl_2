// ... (keep the existing imports and Player class)

import { io, Socket } from 'socket.io-client';

interface Player {
    id: string;
    x: number;
    y: number;
    angle: number;
    imageLoaded: boolean;
    image: HTMLImageElement;
}

class Game {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private socket: Socket;
    private players: Map<string, Player> = new Map();
    private playerSprite: HTMLImageElement;

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
        
        // Draw a test rectangle to ensure the canvas is working
        this.ctx.fillStyle = 'green';
        this.ctx.fillRect(0, 0, 100, 100);
        
        // Remove the gameLoop call from here, it's now in the onload callback
    }

    private setupSocketListeners() {
        this.socket.on('connect', () => {
            console.log('Connected to server with ID:', this.socket.id);
        });

        this.socket.on('currentPlayers', (players: Record<string, Player>) => {
            console.log('Received current players:', players);
            this.players.clear();
            Object.values(players).forEach(player => {
                this.players.set(player.id, {...player, imageLoaded: true});
            });
        });

        this.socket.on('newPlayer', (player: Player) => {
            console.log('New player joined:', player);
            this.players.set(player.id, {...player, imageLoaded: true});
        });

        this.socket.on('playerMoved', (player: Player) => {
            console.log('Player moved:', player);
            const existingPlayer = this.players.get(player.id);
            if (existingPlayer) {
                Object.assign(existingPlayer, player);
            } else {
                this.players.set(player.id, {...player, imageLoaded: true});
            }
        });

        this.socket.on('playerDisconnected', (playerId: string) => {
            console.log('Player disconnected:', playerId);
            this.players.delete(playerId);
        });
    }

    private setupEventListeners() {
        document.addEventListener('keydown', (event) => {
            let movement = { x: 0, y: 0, angle: 0 };
            switch (event.key) {
                case 'ArrowUp':
                    movement.y -= 5;
                    break;
                case 'ArrowDown':
                    movement.y += 5;
                    break;
                case 'ArrowLeft':
                    movement.x -= 5;
                    break;
                case 'ArrowRight':
                    movement.x += 5;
                    break;
            }
            if (movement.x !== 0 || movement.y !== 0) {
                const socketId = this.socket.id;
                if (socketId) {
                    const player = this.players.get(socketId);
                    if (player) {
                        player.x += movement.x;
                        player.y += movement.y;
                        this.socket.emit('playerMovement', { x: player.x, y: player.y, angle: player.angle });
                        console.log('Emitting player movement:', { x: player.x, y: player.y, angle: player.angle });
                    }
                } else {
                    console.error('Socket ID is undefined');
                }
            }
        });
    }

    private gameLoop() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = '#e0f0ff';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        console.log('Number of players:', this.players.size);

        this.players.forEach((player, id) => {
            console.log(`Drawing player ${id} at (${player.x}, ${player.y})`);
            this.ctx.save();
            this.ctx.translate(player.x, player.y);
            this.ctx.rotate(player.angle);
            
            // Draw a colored rectangle behind the sprite for debugging
            this.ctx.fillStyle = id === this.socket.id ? 'rgba(0, 255, 0, 0.5)' : 'rgba(255, 0, 0, 0.5)';
            this.ctx.fillRect(-20, -20, 40, 40);
            
            // Draw the sprite
            this.ctx.drawImage(this.playerSprite, -this.playerSprite.width / 2, -this.playerSprite.height / 2);
            
            this.ctx.restore();
        });

        requestAnimationFrame(() => this.gameLoop());
    }
}

window.onload = () => {
    console.log('Window loaded, creating game instance');
    new Game();
};
