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
}

const players: Record<string, Player> = {};

io.on('connection', (socket) => {
  console.log('A user connected');

  // Initialize new player
  players[socket.id] = {
    id: socket.id,
    x: Math.random() * 800,
    y: Math.random() * 600,
    angle: 0
  };

  // Send current players to the new player
  socket.emit('currentPlayers', players);

  // Notify all other players about the new player
  socket.broadcast.emit('newPlayer', players[socket.id]);

  socket.on('playerMovement', (movementData) => {
    const player = players[socket.id];
    if (player) {
        player.x = movementData.x;
        player.y = movementData.y;
        player.angle = movementData.angle;
        console.log(`Player ${socket.id} moved to (${player.x}, ${player.y})`);
        socket.broadcast.emit('playerMoved', player);
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
