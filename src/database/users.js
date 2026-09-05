import crypto from "crypto";

import db from "./database.js";


export function getOrCreateUser(
    twitchUserId,
    displayName
) {

    let user =
        db.prepare(`
            SELECT *
            FROM users
            WHERE twitch_user_id = ?
        `).get(
            twitchUserId
        );


    if (user) {

        if (
            user.display_name !==
            displayName
        ) {

            db.prepare(`
                UPDATE users
                SET display_name = ?
                WHERE id = ?
            `).run(
                displayName,
                user.id
            );


            user.display_name =
                displayName;

        }


        // Safety fallback for users created before
        // collection tokens were introduced.

        if (!user.collection_token) {

            const collectionToken =
                generateCollectionToken();


            db.prepare(`
                UPDATE users
                SET collection_token = ?
                WHERE id = ?
            `).run(
                collectionToken,
                user.id
            );


            user.collection_token =
                collectionToken;

        }


        return user;

    }


    const collectionToken =
        generateCollectionToken();


    const result =
        db.prepare(`
            INSERT INTO users (
                twitch_user_id,
                display_name,
                collection_token
            )
            VALUES (?, ?, ?)
        `).run(
            twitchUserId,
            displayName,
            collectionToken
        );


    return db.prepare(`
        SELECT *
        FROM users
        WHERE id = ?
    `).get(
        result.lastInsertRowid
    );

}


export function getUserByTwitchId(
    twitchUserId
) {

    return db.prepare(`
        SELECT *
        FROM users
        WHERE twitch_user_id = ?
    `).get(
        twitchUserId
    );

}


export function getUserByCollectionToken(
    collectionToken
) {

    return db.prepare(`
        SELECT *
        FROM users
        WHERE collection_token = ?
    `).get(
        collectionToken
    );

}


// ======================================================
// Generate private collection token
// ======================================================

function generateCollectionToken() {

    return crypto
        .randomBytes(32)
        .toString("base64url");

}