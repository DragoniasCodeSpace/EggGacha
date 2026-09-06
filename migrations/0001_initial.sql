CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    twitch_user_id TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    collection_token TEXT NOT NULL UNIQUE,
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
    expires_at INTEGER NOT NULL,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS twitch_rewards (
    broadcaster_id TEXT PRIMARY KEY,
    reward_id TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_eggs_user_id
ON user_eggs(user_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_collection_token
ON users(collection_token);