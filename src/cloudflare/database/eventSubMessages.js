export async function hasProcessedEventSubMessage(
    db,
    messageId
) {
    const row = await db
        .prepare(`
            SELECT message_id
            FROM processed_eventsub_messages
            WHERE message_id = ?
        `)
        .bind(messageId)
        .first();

    return Boolean(row);
}

export async function markEventSubMessageProcessed(
    db,
    messageId
) {
    await db
        .prepare(`
            INSERT OR IGNORE INTO processed_eventsub_messages (
                message_id
            )
            VALUES (?)
        `)
        .bind(messageId)
        .run();
}

export async function cleanupProcessedEventSubMessages(
    db
) {
    await db
        .prepare(`
            DELETE FROM processed_eventsub_messages
            WHERE received_at < datetime(
                'now',
                '-7 days'
            )
        `)
        .run();
}