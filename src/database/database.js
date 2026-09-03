import Database from "better-sqlite3";

const db = new Database("egggacha.db");

db.pragma("journal_mode = WAL");

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
`);

export default db;