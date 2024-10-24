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
}

interface Dot {
  x: number;
  y: number;
}

const players: Record<string, Player> = {};
const dots: Dot[] = [];

const WORLD_WIDTH = 2000;
const WORLD_HEIGHT = 2000;

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
    velocityY: 0
  };

  // Send current players to the new player
  socket.emit('currentPlayers', players);

  // Notify all other players about the new player
  socket.broadcast.emit('newPlayer', players[socket.id]);

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

  socket.on('disconnect', () => {
    console.log('A user disconnected');
    delete players[socket.id];
    io.emit('playerDisconnected', socket.id);
  });
});

httpsServer.listen(PORT, () => {
  console.log(`Server is running on https://localhost:${PORT}`);
});
