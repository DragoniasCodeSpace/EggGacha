export async function getOrCreateUser(
    db,
    twitchUserId,
    displayName
) {
    let user = await db
        .prepare(`
            SELECT *
            FROM users
            WHERE twitch_user_id = ?
        `)
        .bind(twitchUserId)
        .first();

    if (user) {
        if (user.display_name !== displayName) {
            await db
                .prepare(`
                    UPDATE users
                    SET display_name = ?
                    WHERE id = ?
                `)
                .bind(displayName, user.id)
                .run();

            user.display_name = displayName;
        }

        if (!user.collection_token) {
            const collectionToken = generateCollectionToken();

            await db
                .prepare(`
                    UPDATE users
                    SET collection_token = ?
                    WHERE id = ?
                `)
                .bind(collectionToken, user.id)
                .run();

            user.collection_token = collectionToken;
        }

        return user;
    }

    const collectionToken = generateCollectionToken();

    const result = await db
        .prepare(`
            INSERT INTO users (
                twitch_user_id,
                display_name,
                collection_token
            )
            VALUES (?, ?, ?)
        `)
        .bind(
            twitchUserId,
            displayName,
            collectionToken
        )
        .run();

    return await db
        .prepare(`
            SELECT *
            FROM users
            WHERE id = ?
        `)
        .bind(result.meta.last_row_id)
        .first();
}

export async function getUserByTwitchId(
    db,
    twitchUserId
) {
    return await db
        .prepare(`
            SELECT *
            FROM users
            WHERE twitch_user_id = ?
        `)
        .bind(twitchUserId)
        .first();
}

export async function getUserByCollectionToken(
    db,
    collectionToken
) {
    return await db
        .prepare(`
            SELECT *
            FROM users
            WHERE collection_token = ?
        `)
        .bind(collectionToken)
        .first();
}

function generateCollectionToken() {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);

    return bytesToBase64Url(bytes);
}

function bytesToBase64Url(bytes) {
    let binary = "";

    for (const byte of bytes) {
        binary += String.fromCharCode(byte);
    }

    return btoa(binary)
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/g, "");
}