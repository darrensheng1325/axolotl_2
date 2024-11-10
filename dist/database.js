"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.database = void 0;
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const db = new better_sqlite3_1.default('game.db');
// Initialize database with required tables
db.exec(`
    CREATE TABLE IF NOT EXISTS players (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        level INTEGER DEFAULT 1,
        xp INTEGER DEFAULT 0,
        maxHealth INTEGER DEFAULT 100,
        damage INTEGER DEFAULT 10,
        lastSeen DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
`);
exports.database = {
    // User-related functions
    createUser: (username, password) => {
        const stmt = db.prepare(`
            INSERT INTO users (id, username, password)
            VALUES (?, ?, ?)
        `);
        try {
            const userId = Math.random().toString(36).substr(2, 9);
            stmt.run(userId, username, password);
            return { id: userId, username, password };
        }
        catch (error) {
            console.error('Error creating user:', error);
            return null;
        }
    },
    getUser: (username, password) => {
        const stmt = db.prepare('SELECT * FROM users WHERE username = ? AND password = ?');
        return stmt.get(username, password);
    },
    // Player-related functions
    savePlayer: (playerId, userId, progress) => {
        const stmt = db.prepare(`
            INSERT OR REPLACE INTO players (id, userId, level, xp, maxHealth, damage, lastSeen)
            VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `);
        stmt.run(playerId, userId, progress.level, progress.xp, progress.maxHealth, progress.damage);
    },
    getPlayer: (playerId) => {
        const stmt = db.prepare('SELECT level, xp, maxHealth, damage FROM players WHERE id = ?');
        const result = stmt.get(playerId);
        return result || null;
    },
    getPlayerByUserId: (userId) => {
        const stmt = db.prepare('SELECT level, xp, maxHealth, damage FROM players WHERE userId = ?');
        const result = stmt.get(userId);
        return result || null;
    },
    cleanupOldPlayers: (daysOld = 30) => {
        const stmt = db.prepare(`
            DELETE FROM players 
            WHERE lastSeen < datetime('now', '-' || ? || ' days')
        `);
        stmt.run(daysOld);
    }
};
