import { config } from "../config/config.js";
import { twitchFetch } from "./session.js";

import {
    getSavedEggReward,
    saveEggReward,
    deleteSavedEggReward
} from "../database/twitchRewards.js";


// ======================================================
// Get authenticated Twitch user
// ======================================================

export async function getTwitchUser(
    accessToken
) {

    const response =
        await fetch(
            "https://api.twitch.tv/helix/users",
            {
                headers: {
                    "Client-ID":
                        config.twitch.clientId,

                    "Authorization":
                        `Bearer ${accessToken}`
                }
            }
        );


    const data =
        await response.json();


    if (!response.ok) {

        throw new Error(
            `Failed to get Twitch user: ${JSON.stringify(data)}`
        );

    }


    if (
        !data.data ||
        data.data.length === 0
    ) {

        throw new Error(
            "No Twitch user was returned."
        );

    }


    return data.data[0];

}


// ======================================================
// Get manageable rewards
// ======================================================

export async function getManageableRewards(
    twitchSession
) {

    const url =
        new URL(
            "https://api.twitch.tv/helix/channel_points/custom_rewards"
        );


    url.searchParams.set(
        "broadcaster_id",
        twitchSession.broadcaster.id
    );


    url.searchParams.set(
        "only_manageable_rewards",
        "true"
    );


    const response =
        await twitchFetch(
            twitchSession,
            url,
            {
                method:
                    "GET"
            }
        );


    const data =
        await response.json();


    if (!response.ok) {

        throw new Error(
            `Failed to get Twitch rewards: ${JSON.stringify(data)}`
        );

    }


    return data.data ?? [];

}


// ======================================================
// Create EggGacha reward
// ======================================================

export async function createEggReward(
    twitchSession
) {

    const url =
        new URL(
            "https://api.twitch.tv/helix/channel_points/custom_rewards"
        );


    url.searchParams.set(
        "broadcaster_id",
        twitchSession.broadcaster.id
    );


    const response =
        await twitchFetch(
            twitchSession,
            url,
            {
                method:
                    "POST",

                headers: {
                    "Content-Type":
                        "application/json"
                },

                body:
                    JSON.stringify({
                        title:
                            config.twitch.reward.title,

                        cost:
                            config.twitch.reward.cost,

                        is_enabled:
                            true,

                        is_user_input_required:
                            false,

                        should_redemptions_skip_request_queue:
                            true
                    })
            }
        );


    const data =
        await response.json();


    if (!response.ok) {

        throw new Error(
            `Failed to create EggGacha reward: ${JSON.stringify(data)}`
        );

    }


    if (
        !data.data ||
        data.data.length === 0
    ) {

        throw new Error(
            "Twitch created the reward but returned no reward data."
        );

    }


    const reward =
        data.data[0];


    saveEggReward(
        twitchSession.broadcaster.id,
        reward.id
    );


    console.log(
        "EggGacha reward ID saved ✓"
    );


    return reward;

}


// ======================================================
// Get or create EggGacha reward
// ======================================================

export async function getOrCreateEggReward(
    twitchSession
) {

    const rewards =
        await getManageableRewards(
            twitchSession
        );


    const savedReward =
        getSavedEggReward(
            twitchSession.broadcaster.id
        );


    let existingReward =
        null;


    // ==================================================
    // First try the persisted Twitch reward ID
    // ==================================================

    if (savedReward) {

        existingReward =
            rewards.find(
                reward =>
                    reward.id ===
                    savedReward.reward_id
            );


        if (existingReward) {

            console.log(
                "Existing EggGacha reward found by saved ID ✓"
            );

        } else {

            console.warn(
                "Saved EggGacha reward no longer exists on Twitch."
            );


            deleteSavedEggReward(
                twitchSession.broadcaster.id
            );

        }

    }


    // ==================================================
    // Fallback for existing installations
    // ==================================================
    //
    // This lets people upgrade without creating a
    // duplicate reward.
    //

    if (!existingReward) {

        existingReward =
            rewards.find(
                reward =>
                    reward.title ===
                    config.twitch.reward.title
            );


        if (existingReward) {

            console.log(
                "Existing EggGacha reward found by title."
            );


            saveEggReward(
                twitchSession.broadcaster.id,
                existingReward.id
            );


            console.log(
                "EggGacha reward ID saved ✓"
            );

        }

    }


    // ==================================================
    // Existing reward
    // ==================================================

    if (existingReward) {

        const needsUpdate =
            existingReward.title !==
                config.twitch.reward.title ||
            existingReward.cost !==
                config.twitch.reward.cost ||
            existingReward.is_enabled !==
                true ||
            existingReward.is_user_input_required !==
                false ||
            existingReward.should_redemptions_skip_request_queue !==
                true;


        if (needsUpdate) {

            console.log(
                "EggGacha reward configuration changed. Updating Twitch..."
            );


            const updatedReward =
                await updateEggReward(
                    twitchSession,
                    existingReward.id
                );


            saveEggReward(
                twitchSession.broadcaster.id,
                updatedReward.id
            );


            return updatedReward;

        }


        console.log(
            "EggGacha reward already matches configuration ✓"
        );


        return existingReward;

    }


    // ==================================================
    // No reward exists
    // ==================================================

    console.log(
        "EggGacha reward not found. Creating it..."
    );


    return await createEggReward(
        twitchSession
    );

}


// ======================================================
// Update EggGacha reward
// ======================================================

export async function updateEggReward(
    twitchSession,
    rewardId
) {

    const url =
        new URL(
            "https://api.twitch.tv/helix/channel_points/custom_rewards"
        );


    url.searchParams.set(
        "broadcaster_id",
        twitchSession.broadcaster.id
    );


    url.searchParams.set(
        "id",
        rewardId
    );


    const response =
        await twitchFetch(
            twitchSession,
            url,
            {
                method:
                    "PATCH",

                headers: {
                    "Content-Type":
                        "application/json"
                },

                body:
                    JSON.stringify({
                        title:
                            config.twitch.reward.title,

                        cost:
                            config.twitch.reward.cost,

                        is_enabled:
                            true,

                        is_user_input_required:
                            false,

                        should_redemptions_skip_request_queue:
                            true
                    })
            }
        );


    const data =
        await response.json();


    if (!response.ok) {

        throw new Error(
            `Failed to update EggGacha reward: ${JSON.stringify(data)}`
        );

    }


    const reward =
        data.data?.[0];


    if (!reward) {

        throw new Error(
            "Twitch updated the reward but returned no reward data."
        );

    }


    saveEggReward(
        twitchSession.broadcaster.id,
        reward.id
    );


    console.log(
        `EggGacha reward synchronized: ${config.twitch.reward.cost} points ✓`
    );


    return reward;

}