"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const https_1 = require("https");
const socket_io_1 = require("socket.io");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const app = (0, express_1.default)();
const httpsServer = (0, https_1.createServer)({
    key: fs_1.default.readFileSync('cert.key'),
    cert: fs_1.default.readFileSync('cert.crt')
}, app);
const io = new socket_io_1.Server(httpsServer, {
    cors: {
        origin: ["https://localhost:8080", "https://0.0.0.0:3000"],
        methods: ["GET", "POST"],
        credentials: true
    }
});
const PORT = process.env.PORT || 3000;
// Serve static files from the dist directory
app.use(express_1.default.static(path_1.default.join(__dirname, '../dist')));
const players = {};
const dots = [];
const enemies = [];
const obstacles = [];
const WORLD_WIDTH = 2000;
const WORLD_HEIGHT = 2000;
const ENEMY_COUNT = 10;
const OBSTACLE_COUNT = 20;
const ENEMY_CORAL_PROBABILITY = 0.3;
const ENEMY_CORAL_HEALTH = 50;
const ENEMY_CORAL_DAMAGE = 5;
const PLAYER_MAX_HEALTH = 100;
const ENEMY_MAX_HEALTH = 50;
const PLAYER_DAMAGE = 10;
const ENEMY_DAMAGE = 5;
const ENEMY_TIERS = {
    easy: { health: 30, speed: 1, damage: 5, probability: 0.5 },
    medium: { health: 50, speed: 1.5, damage: 10, probability: 0.3 },
    hard: { health: 80, speed: 2, damage: 15, probability: 0.2 }
};
function createEnemy() {
    const tierRoll = Math.random();
    let tier;
    if (tierRoll < ENEMY_TIERS.easy.probability) {
        tier = 'easy';
    }
    else if (tierRoll < ENEMY_TIERS.easy.probability + ENEMY_TIERS.medium.probability) {
        tier = 'medium';
    }
    else {
        tier = 'hard';
    }
    const tierData = ENEMY_TIERS[tier];
    return {
        id: Math.random().toString(36).substr(2, 9),
        type: Math.random() < 0.5 ? 'octopus' : 'fish',
        tier: tier,
        x: Math.random() * WORLD_WIDTH,
        y: Math.random() * WORLD_HEIGHT,
        angle: Math.random() * Math.PI * 2,
        health: tierData.health,
        speed: tierData.speed,
        damage: tierData.damage
    };
}
function moveEnemies() {
    enemies.forEach(enemy => {
        if (enemy.type === 'octopus') {
            // Octopus moves randomly
            enemy.x += (Math.random() * 4 - 2) * enemy.speed;
            enemy.y += (Math.random() * 4 - 2) * enemy.speed;
        }
        else {
            // Fish moves in a straight line
            enemy.x += Math.cos(enemy.angle) * 2 * enemy.speed;
            enemy.y += Math.sin(enemy.angle) * 2 * enemy.speed;
        }
        // Wrap around the world
        enemy.x = (enemy.x + WORLD_WIDTH) % WORLD_WIDTH;
        enemy.y = (enemy.y + WORLD_HEIGHT) % WORLD_HEIGHT;
        // Change fish direction occasionally
        if (enemy.type === 'fish' && Math.random() < 0.02) {
            enemy.angle = Math.random() * Math.PI * 2;
        }
    });
}
function createObstacle() {
    const isEnemy = Math.random() < ENEMY_CORAL_PROBABILITY;
    return {
        id: Math.random().toString(36).substr(2, 9),
        x: Math.random() * WORLD_WIDTH,
        y: Math.random() * WORLD_HEIGHT,
        width: 50 + Math.random() * 50, // Random width between 50 and 100
        height: 50 + Math.random() * 50, // Random height between 50 and 100
        type: 'coral',
        isEnemy: isEnemy,
        health: isEnemy ? ENEMY_CORAL_HEALTH : undefined
    };
}
// Initialize enemies
for (let i = 0; i < ENEMY_COUNT; i++) {
    enemies.push(createEnemy());
}
// Initialize obstacles
for (let i = 0; i < OBSTACLE_COUNT; i++) {
    obstacles.push(createObstacle());
}
io.on('connection', (socket) => {
    console.log('A user connected');
    // Initialize new player
    players[socket.id] = {
        id: socket.id,
        x: Math.random() * WORLD_WIDTH,
        y: Math.random() * WORLD_HEIGHT,
        angle: 0,
        score: 0,
        velocityX: 0,
        velocityY: 0,
        health: PLAYER_MAX_HEALTH
    };
    // Send current players to the new player
    socket.emit('currentPlayers', players);
    // Notify all other players about the new player
    socket.broadcast.emit('newPlayer', players[socket.id]);
    // Send initial enemies state
    socket.emit('enemiesUpdate', enemies);
    // Send initial obstacles state
    socket.emit('obstaclesUpdate', obstacles);
    socket.on('playerMovement', (movementData) => {
        const player = players[socket.id];
        if (player) {
            const newX = Math.max(0, Math.min(WORLD_WIDTH, movementData.x));
            const newY = Math.max(0, Math.min(WORLD_HEIGHT, movementData.y));
            // Check collision with obstacles
            let collision = false;
            for (const obstacle of obstacles) {
                if (newX < obstacle.x + obstacle.width &&
                    newX + 40 > obstacle.x && // Assuming player width is 40
                    newY < obstacle.y + obstacle.height &&
                    newY + 40 > obstacle.y // Assuming player height is 40
                ) {
                    collision = true;
                    if (obstacle.isEnemy) {
                        // Player collides with enemy coral
                        player.health -= ENEMY_CORAL_DAMAGE;
                        io.emit('playerDamaged', { playerId: player.id, health: player.health });
                        // Damage the enemy coral
                        if (obstacle.health) {
                            obstacle.health -= PLAYER_DAMAGE;
                            if (obstacle.health <= 0) {
                                // Destroy the enemy coral
                                const index = obstacles.findIndex(o => o.id === obstacle.id);
                                if (index !== -1) {
                                    obstacles.splice(index, 1);
                                    io.emit('obstacleDestroyed', obstacle.id);
                                    obstacles.push(createObstacle()); // Replace the destroyed obstacle
                                }
                            }
                            else {
                                io.emit('obstacleDamaged', { obstacleId: obstacle.id, health: obstacle.health });
                            }
                        }
                    }
                    break;
                }
            }
            if (!collision) {
                player.x = newX;
                player.y = newY;
                player.angle = movementData.angle;
                player.velocityX = movementData.velocityX;
                player.velocityY = movementData.velocityY;
                console.log(`Player ${socket.id} moved to (${player.x}, ${player.y}) with velocity (${player.velocityX}, ${player.velocityY}) and angle ${player.angle}`);
                socket.broadcast.emit('playerMoved', player);
            }
        }
    });
    socket.on('collectDot', (dotIndex) => {
        if (dotIndex >= 0 && dotIndex < dots.length) {
            dots.splice(dotIndex, 1);
            players[socket.id].score++;
            io.emit('dotCollected', { playerId: socket.id, dotIndex });
            // Generate a new dot
            dots.push({
                x: Math.random() * 800,
                y: Math.random() * 600
            });
        }
    });
    socket.on('collision', (data) => {
        const player = players[socket.id];
        const enemy = enemies.find(e => e.id === data.enemyId);
        if (player && enemy) {
            // Player damages enemy
            enemy.health -= PLAYER_DAMAGE;
            io.emit('enemyDamaged', { enemyId: enemy.id, health: enemy.health });
            if (enemy.health <= 0) {
                const index = enemies.findIndex(e => e.id === enemy.id);
                if (index !== -1) {
                    enemies.splice(index, 1);
                    io.emit('enemyDestroyed', enemy.id);
                    enemies.push(createEnemy()); // Replace the destroyed enemy
                }
            }
            // Enemy damages player
            player.health -= enemy.damage;
            io.emit('playerDamaged', { playerId: player.id, health: player.health });
            if (player.health <= 0) {
                // Player is defeated, respawn
                player.health = PLAYER_MAX_HEALTH;
                player.x = Math.random() * WORLD_WIDTH;
                player.y = Math.random() * WORLD_HEIGHT;
                io.emit('playerMoved', player);
            }
        }
    });
    socket.on('disconnect', () => {
        console.log('A user disconnected');
        delete players[socket.id];
        io.emit('playerDisconnected', socket.id);
    });
});
// Move enemies every 100ms
setInterval(() => {
    moveEnemies();
    io.emit('enemiesUpdate', enemies);
}, 100);
httpsServer.listen(PORT, () => {
    console.log(`Server is running on https://localhost:${PORT}`);
});
