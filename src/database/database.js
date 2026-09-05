import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";


// ======================================================
// Database path
// ======================================================

const __filename =
    fileURLToPath(
        import.meta.url
    );

const __dirname =
    path.dirname(
        __filename
    );


// Always store the database in the EggGacha project root.
//
// src/database/database.js
//       ↓
// ../../egggacha.db

const databasePath =
    path.join(
        __dirname,
        "..",
        "..",
        "egggacha.db"
    );


const db =
    new Database(
        databasePath
    );


db.pragma(
    "journal_mode = WAL"
);


// ======================================================
// Tables
// ======================================================

db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        twitch_user_id TEXT NOT NULL UNIQUE,
        display_name TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );


    CREATE TABLE IF NOT EXISTS user_eggs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        egg_id TEXT NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 1,
        first_obtained_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

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

        updated_at TEXT NOT NULL
            DEFAULT CURRENT_TIMESTAMP
    );


    CREATE TABLE IF NOT EXISTS twitch_rewards (
        broadcaster_id TEXT PRIMARY KEY,

        reward_id TEXT NOT NULL,

        updated_at TEXT NOT NULL
            DEFAULT CURRENT_TIMESTAMP
    );
`);


export default db;