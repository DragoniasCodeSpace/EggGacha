import db from "./database.js";

export function getOrCreateUser(twitchUserId, displayName) {
    let user = db.prepare(`
        SELECT *
        FROM users
        WHERE twitch_user_id = ?
    `).get(twitchUserId);

    if (user) {
        if (user.display_name !== displayName) {
            db.prepare(`
                UPDATE users
                SET display_name = ?
                WHERE id = ?
            `).run(displayName, user.id);

            user.display_name = displayName;
        }

        return user;
    }

    const result = db.prepare(`
        INSERT INTO users (
            twitch_user_id,
            display_name
        )
        VALUES (?, ?)
    `).run(
        twitchUserId,
        displayName
    );

    return db.prepare(`
        SELECT *
        FROM users
        WHERE id = ?
    `).get(result.lastInsertRowid);
}

export function getUserByTwitchId(twitchUserId) {
    return db.prepare(`
        SELECT *
        FROM users
        WHERE twitch_user_id = ?
    `).get(twitchUserId);
}