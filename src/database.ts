import Database from 'better-sqlite3';

const db = new Database('game.db');

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

export interface PlayerProgress {
    level: number;
    xp: number;
    maxHealth: number;
    damage: number;
}

export interface User {
    id: string;
    username: string;
    password: string;
}

export const database = {
    // User-related functions
    createUser: (username: string, password: string): User | null => {
        const stmt = db.prepare(`
            INSERT INTO users (id, username, password)
            VALUES (?, ?, ?)
        `);
        
        try {
            const userId = Math.random().toString(36).substr(2, 9);
            stmt.run(userId, username, password);
            return { id: userId, username, password };
        } catch (error) {
            console.error('Error creating user:', error);
            return null;
        }
    },

    getUser: (username: string, password: string): User | null => {
        const stmt = db.prepare('SELECT * FROM users WHERE username = ? AND password = ?');
        return stmt.get(username, password) as User | null;
    },

    // Player-related functions
    savePlayer: (playerId: string, userId: string, progress: PlayerProgress) => {
        const stmt = db.prepare(`
            INSERT OR REPLACE INTO players (id, userId, level, xp, maxHealth, damage, lastSeen)
            VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `);
        stmt.run(playerId, userId, progress.level, progress.xp, progress.maxHealth, progress.damage);
    },

    getPlayer: (playerId: string): PlayerProgress | null => {
        const stmt = db.prepare('SELECT level, xp, maxHealth, damage FROM players WHERE id = ?');
        const result = stmt.get(playerId) as PlayerProgress | undefined;
        return result || null;
    },

    getPlayerByUserId: (userId: string): PlayerProgress | null => {
        const stmt = db.prepare('SELECT level, xp, maxHealth, damage FROM players WHERE userId = ?');
        const result = stmt.get(userId) as PlayerProgress | undefined;
        return result || null;
    },

    cleanupOldPlayers: (daysOld: number = 30) => {
        const stmt = db.prepare(`
            DELETE FROM players 
            WHERE lastSeen < datetime('now', '-' || ? || ' days')
        `);
        stmt.run(daysOld);
    }
}; 