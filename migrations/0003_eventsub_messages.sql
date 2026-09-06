CREATE TABLE IF NOT EXISTS processed_eventsub_messages (
    message_id TEXT PRIMARY KEY,
    received_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_processed_eventsub_received_at
ON processed_eventsub_messages(received_at);