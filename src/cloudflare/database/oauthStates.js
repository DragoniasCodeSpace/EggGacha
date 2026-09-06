export async function saveOAuthState(
    db,
    state,
    expiresAt
) {
    await db
        .prepare(`
            INSERT INTO oauth_states (
                state,
                expires_at
            )
            VALUES (?, ?)
        `)
        .bind(
            state,
            expiresAt
        )
        .run();
}

export async function consumeOAuthState(
    db,
    state
) {
    const row = await db
        .prepare(`
            SELECT
                state,
                expires_at
            FROM oauth_states
            WHERE state = ?
        `)
        .bind(state)
        .first();

    if (!row) {
        return false;
    }

    await db
        .prepare(`
            DELETE FROM oauth_states
            WHERE state = ?
        `)
        .bind(state)
        .run();

    const now = Date.now();

    return row.expires_at > now;
}

export async function cleanupExpiredOAuthStates(
    db
) {
    await db
        .prepare(`
            DELETE FROM oauth_states
            WHERE expires_at <= ?
        `)
        .bind(Date.now())
        .run();
}