export async function getSavedEggReward(
    db,
    broadcasterId
) {
    return await db
        .prepare(`
            SELECT *
            FROM twitch_rewards
            WHERE broadcaster_id = ?
        `)
        .bind(broadcasterId)
        .first();
}

export async function saveEggReward(
    db,
    broadcasterId,
    rewardId
) {
    await db
        .prepare(`
            INSERT INTO twitch_rewards (
                broadcaster_id,
                reward_id,
                updated_at
            )
            VALUES (?, ?, CURRENT_TIMESTAMP)

            ON CONFLICT(broadcaster_id)
            DO UPDATE SET
                reward_id = excluded.reward_id,
                updated_at = CURRENT_TIMESTAMP
        `)
        .bind(
            broadcasterId,
            rewardId
        )
        .run();
}

export async function deleteSavedEggReward(
    db,
    broadcasterId
) {
    await db
        .prepare(`
            DELETE FROM twitch_rewards
            WHERE broadcaster_id = ?
        `)
        .bind(broadcasterId)
        .run();
}