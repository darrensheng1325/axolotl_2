import Database from 'better-sqlite3';

const db = new Database('game.db');

// Initialize database with required tables
db.exec(`
    CREATE TABLE IF NOT EXISTS players (
        id TEXT PRIMARY KEY,
        level INTEGER DEFAULT 1,
        xp INTEGER DEFAULT 0,
        maxHealth INTEGER DEFAULT 100,
        damage INTEGER DEFAULT 10,
        lastSeen DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`);

export interface PlayerProgress {
    level: number;
    xp: number;
    maxHealth: number;
    damage: number;
}

export const database = {
    savePlayer: (playerId: string, progress: PlayerProgress) => {
        const stmt = db.prepare(`
            INSERT OR REPLACE INTO players (id, level, xp, maxHealth, damage, lastSeen)
            VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `);
        stmt.run(playerId, progress.level, progress.xp, progress.maxHealth, progress.damage);
    },

    getPlayer: (playerId: string): PlayerProgress | null => {
        const stmt = db.prepare('SELECT level, xp, maxHealth, damage FROM players WHERE id = ?');
        const result = stmt.get(playerId) as PlayerProgress | undefined;
        return result || null;
    },

    // Optional: Clean up old players who haven't been seen in a while
    cleanupOldPlayers: (daysOld: number = 30) => {
        const stmt = db.prepare(`
            DELETE FROM players 
            WHERE lastSeen < datetime('now', '-' || ? || ' days')
        `);
        stmt.run(daysOld);
    }
}; 