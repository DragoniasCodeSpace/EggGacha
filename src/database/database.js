import Database from "better-sqlite3";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(__dirname, "../..");

const dbPath = process.env.DATABASE_PATH
    ? path.resolve(process.env.DATABASE_PATH)
    : path.join(projectRoot, "egggacha.db");

const dbDirectory = path.dirname(dbPath);

if (!fs.existsSync(dbDirectory)) {
    fs.mkdirSync(dbDirectory, { recursive: true });
}

console.log(`Using database: ${dbPath}`);

const db = new Database(dbPath);

db.pragma("journal_mode = WAL");

db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        twitch_user_id TEXT NOT NULL UNIQUE,
        display_name TEXT NOT NULL,
        collection_token TEXT UNIQUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS user_eggs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        egg_id TEXT NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 1,
        first_obtained_at DATETIME DEFAULT CURRENT_TIMESTAMP,

        UNIQUE(user_id, egg_id),

        FOREIGN KEY (user_id)
            REFERENCES users(id)
            ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS twitch_sessions (
        broadcaster_id TEXT PRIMARY KEY,
        login TEXT NOT NULL,
        display_name TEXT NOT NULL,
        access_token TEXT NOT NULL,
        refresh_token TEXT NOT NULL,
        expires_at INTEGER NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS twitch_rewards (
        broadcaster_id TEXT PRIMARY KEY,
        reward_id TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
`);

const userColumns = db
    .prepare("PRAGMA table_info(users)")
    .all();

const hasCollectionToken = userColumns.some(
    column => column.name === "collection_token"
);

if (!hasCollectionToken) {
    db.exec(`
        ALTER TABLE users
        ADD COLUMN collection_token TEXT
    `);
}

const usersWithoutCollectionToken = db.prepare(`
    SELECT id
    FROM users
    WHERE collection_token IS NULL
       OR collection_token = ''
`).all();

const updateCollectionToken = db.prepare(`
    UPDATE users
    SET collection_token = ?
    WHERE id = ?
`);

const updateTokens = db.transaction(users => {
    for (const user of users) {
        const collectionToken = crypto
            .randomBytes(32)
            .toString("base64url");

        updateCollectionToken.run(
            collectionToken,
            user.id
        );
    }
});

updateTokens(usersWithoutCollectionToken);

db.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_users_collection_token
    ON users(collection_token)
`);

export default db;