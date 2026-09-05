import db from "./database.js";


// ======================================================
// Get saved EggGacha reward
// ======================================================

export function getSavedEggReward(
    broadcasterId
) {

    return db.prepare(`
        SELECT *
        FROM twitch_rewards
        WHERE broadcaster_id = ?
    `).get(
        broadcasterId
    );

}


// ======================================================
// Save EggGacha reward
// ======================================================

export function saveEggReward(
    broadcasterId,
    rewardId
) {

    db.prepare(`
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
    `).run(
        broadcasterId,
        rewardId
    );

}


// ======================================================
// Delete saved EggGacha reward
// ======================================================

export function deleteSavedEggReward(
    broadcasterId
) {

    db.prepare(`
        DELETE FROM twitch_rewards
        WHERE broadcaster_id = ?
    `).run(
        broadcasterId
    );

}