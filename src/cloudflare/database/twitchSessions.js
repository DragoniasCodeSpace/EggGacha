import {
    encryptValue,
    decryptValue
} from "../security/encryption.js";

export async function saveTwitchSession(
    db,
    encryptionKey,
    session
) {
    const encryptedAccessToken =
        await encryptValue(
            encryptionKey,
            session.accessToken
        );

    const encryptedRefreshToken =
        await encryptValue(
            encryptionKey,
            session.refreshToken
        );

    await db
        .prepare(`
            INSERT INTO twitch_sessions (
                broadcaster_id,
                login,
                display_name,
                access_token,
                refresh_token,
                expires_at,
                updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)

            ON CONFLICT(broadcaster_id)
            DO UPDATE SET
                login = excluded.login,
                display_name = excluded.display_name,
                access_token = excluded.access_token,
                refresh_token = excluded.refresh_token,
                expires_at = excluded.expires_at,
                updated_at = CURRENT_TIMESTAMP
        `)
        .bind(
            session.broadcasterId,
            session.login,
            session.displayName,
            encryptedAccessToken,
            encryptedRefreshToken,
            session.expiresAt
        )
        .run();
}

export async function getTwitchSession(
    db,
    encryptionKey,
    broadcasterId
) {
    const row = await db
        .prepare(`
            SELECT *
            FROM twitch_sessions
            WHERE broadcaster_id = ?
        `)
        .bind(broadcasterId)
        .first();

    if (!row) {
        return null;
    }

    return {
        broadcasterId:
            row.broadcaster_id,

        login:
            row.login,

        displayName:
            row.display_name,

        accessToken:
            await decryptValue(
                encryptionKey,
                row.access_token
            ),

        refreshToken:
            await decryptValue(
                encryptionKey,
                row.refresh_token
            ),

        expiresAt:
            row.expires_at,

        updatedAt:
            row.updated_at
    };
}

export async function deleteTwitchSession(
    db,
    broadcasterId
) {
    await db
        .prepare(`
            DELETE FROM twitch_sessions
            WHERE broadcaster_id = ?
        `)
        .bind(broadcasterId)
        .run();
}