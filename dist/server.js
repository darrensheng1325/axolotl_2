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
