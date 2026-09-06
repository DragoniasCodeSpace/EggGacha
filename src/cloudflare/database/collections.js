import { eggs } from "../../gacha/eggs.js";

export async function addEggToCollection(
    db,
    userId,
    eggId
) {
    await db
        .prepare(`
            INSERT INTO user_eggs (
                user_id,
                egg_id,
                quantity
            )
            VALUES (?, ?, 1)

            ON CONFLICT(user_id, egg_id)
            DO UPDATE SET
                quantity = quantity + 1
        `)
        .bind(
            userId,
            eggId
        )
        .run();

    return await db
        .prepare(`
            SELECT *
            FROM user_eggs
            WHERE user_id = ?
            AND egg_id = ?
        `)
        .bind(
            userId,
            eggId
        )
        .first();
}

export async function getUserCollection(
    db,
    userId
) {
    const result = await db
        .prepare(`
            SELECT
                egg_id,
                quantity,
                first_obtained_at
            FROM user_eggs
            WHERE user_id = ?
        `)
        .bind(userId)
        .all();

    return result.results.map(entry => {
        const egg = eggs.find(
            egg => egg.id === entry.egg_id
        );

        return {
            ...entry,
            egg
        };
    });
}