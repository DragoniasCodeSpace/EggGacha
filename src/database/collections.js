import db from "./database.js";
import { eggs } from "../gacha/eggs.js";

export function addEggToCollection(userId, eggId) {
    db.prepare(`
        INSERT INTO user_eggs (
            user_id,
            egg_id,
            quantity
        )
        VALUES (?, ?, 1)

        ON CONFLICT(user_id, egg_id)
        DO UPDATE SET
            quantity = quantity + 1
    `).run(
        userId,
        eggId
    );

    return db.prepare(`
        SELECT *
        FROM user_eggs
        WHERE user_id = ?
        AND egg_id = ?
    `).get(
        userId,
        eggId
    );
}

export function getUserCollection(userId) {
    const collection = db.prepare(`
        SELECT
            egg_id,
            quantity,
            first_obtained_at
        FROM user_eggs
        WHERE user_id = ?
    `).all(userId);

    return collection.map(entry => {
        const egg = eggs.find(
            egg => egg.id === entry.egg_id
        );

        return {
            ...entry,
            egg
        };
    });
}