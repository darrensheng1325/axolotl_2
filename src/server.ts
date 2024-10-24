import express from 'express';
import { createServer } from 'https';
import { Server } from 'socket.io';
import path from 'path';
import fs from 'fs';

const app = express();
const httpsServer = createServer({
  key: fs.readFileSync('cert.key'),
  cert: fs.readFileSync('cert.crt')
}, app);
const io = new Server(httpsServer, {
  cors: {
    origin: ["https://localhost:8080", "https://0.0.0.0:3000"],
    methods: ["GET", "POST"],
    credentials: true
  }
});

const PORT = process.env.PORT || 3000;

// Serve static files from the dist directory
app.use(express.static(path.join(__dirname, '../dist')));

interface Player {
  id: string;
  x: number;
  y: number;
  angle: number;
  score: number;
  velocityX: number;
  velocityY: number;
  health: number;
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

const players: Record<string, Player> = {};
const dots: Dot[] = [];
const enemies: Enemy[] = [];

const WORLD_WIDTH = 2000;
const WORLD_HEIGHT = 2000;
const ENEMY_COUNT = 10;

const PLAYER_MAX_HEALTH = 100;
const ENEMY_MAX_HEALTH = 50;
const PLAYER_DAMAGE = 10;
const ENEMY_DAMAGE = 5;

const ENEMY_TIERS = {
  easy: { health: 30, speed: 1, damage: 5, probability: 0.5 },
  medium: { health: 50, speed: 1.5, damage: 10, probability: 0.3 },
  hard: { health: 80, speed: 2, damage: 15, probability: 0.2 }
};

function createEnemy(): Enemy {
  const tierRoll = Math.random();
  let tier: 'easy' | 'medium' | 'hard';
  if (tierRoll < ENEMY_TIERS.easy.probability) {
    tier = 'easy';
  } else if (tierRoll < ENEMY_TIERS.easy.probability + ENEMY_TIERS.medium.probability) {
    tier = 'medium';
  } else {
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
    } else {
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

// Initialize enemies
for (let i = 0; i < ENEMY_COUNT; i++) {
  enemies.push(createEnemy());
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

  socket.on('playerMovement', (movementData) => {
    const player = players[socket.id];
    if (player) {
        player.x = Math.max(0, Math.min(WORLD_WIDTH, movementData.x));
        player.y = Math.max(0, Math.min(WORLD_HEIGHT, movementData.y));
        player.angle = movementData.angle;
        player.velocityX = movementData.velocityX;
        player.velocityY = movementData.velocityY;
        console.log(`Player ${socket.id} moved to (${player.x}, ${player.y}) with velocity (${player.velocityX}, ${player.velocityY}) and angle ${player.angle}`);
        socket.broadcast.emit('playerMoved', player);
    }
  });

  socket.on('collectDot', (dotIndex: number) => {
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

  socket.on('collision', (data: { enemyId: string }) => {
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
