import {
    getOrCreateUser
} from "../database/users.js";

import {
    addEggToCollection
} from "../database/collections.js";

import {
    getSavedEggReward
} from "../database/twitchRewards.js";

import {
    rollEgg
} from "../../gacha/rollEgg.js";


// ======================================================
// Handle EggGacha redemption
// ======================================================

export async function handleEggRedemption(
    env,
    event
) {

    // ==================================================
    // Saved EggGacha reward
    // ==================================================

    const reward =
        await getSavedEggReward(
            env.DB,
            event.broadcaster_user_id
        );


    if (!reward) {

        console.warn(
            "No saved EggGacha reward found."
        );

        return null;

    }


    // ==================================================
    // Ignore other Channel Point rewards
    // ==================================================

    if (
        event.reward?.id !==
        reward.reward_id
    ) {

        return null;

    }


    // ==================================================
    // Viewer
    // ==================================================

    const user =
        await getOrCreateUser(
            env.DB,
            event.user_id,
            event.user_name
        );


    // ==================================================
    // Roll egg
    // ==================================================

    const egg =
        rollEgg();


    // ==================================================
    // Save collection
    // ==================================================

    const collectionEntry =
        await addEggToCollection(
            env.DB,
            user.id,
            egg.id
        );


    console.log(
        `${user.display_name} rolled ${egg.name}`
    );


    console.log(
        `Owned: ${collectionEntry.quantity}`
    );


    // ==================================================
    // Send to OBS overlay
    // ==================================================

    try {

        await sendEggRollToOverlay(
            env,
            user,
            egg,
            collectionEntry.quantity
        );

    } catch (error) {

        console.error(
            "Failed to send egg roll to overlay:",
            error
        );

    }


    return {
        user,
        egg,
        collectionEntry
    };

}


// ======================================================
// Send roll to Durable Object
// ======================================================

async function sendEggRollToOverlay(
    env,
    user,
    egg,
    quantity
) {

    const durableObjectId =
        env.OVERLAY.idFromName(
            "main"
        );


    const overlay =
        env.OVERLAY.get(
            durableObjectId
        );


    const response =
        await overlay.fetch(
            "https://overlay.internal/broadcast",
            {
                method:
                    "POST",

                headers: {
                    "Content-Type":
                        "application/json"
                },

                body:
                    JSON.stringify({

                        user: {
                            displayName:
                                user.display_name
                        },

                        egg: {
                            id:
                                egg.id,

                            name:
                                egg.name,

                            rarity:
                                egg.rarity,

                            image:
                                egg.image ?? null
                        },

                        collection: {
                            quantity
                        }

                    })
            }
        );


    if (!response.ok) {

        const text =
            await response.text();


        throw new Error(
            `Overlay broadcast failed: ${response.status} ${text}`
        );

    }

}