import {
    getSavedEggReward,
    saveEggReward,
    deleteSavedEggReward
} from "../database/twitchRewards.js";

import {
    getCustomRewards,
    getCustomRewardById,
    createCustomReward,
    updateCustomReward
} from "./api.js";

import {
    getValidTwitchSession
} from "./session.js";

export async function syncEggReward(
    env,
    broadcasterId
) {
    const session =
        await getValidTwitchSession(
            env,
            broadcasterId
        );

    const title =
        env.EGG_REWARD_TITLE ??
        "🥚 Roll an Egg";

    const cost =
        Number(
            env.EGG_REWARD_COST ??
            100
        );

    if (
        !Number.isInteger(cost) ||
        cost <= 0
    ) {
        throw new Error(
            "EGG_REWARD_COST must be a positive integer."
        );
    }

    const savedReward =
        await getSavedEggReward(
            env.DB,
            broadcasterId
        );

    if (savedReward) {
        const existingReward =
            await getCustomRewardById(
                env,
                session.accessToken,
                broadcasterId,
                savedReward.reward_id
            );

        if (existingReward) {
            if (
                existingReward.title !== title ||
                existingReward.cost !== cost
            ) {
                const updatedReward =
                    await updateCustomReward(
                        env,
                        session.accessToken,
                        broadcasterId,
                        existingReward.id,
                        {
                            title,
                            cost
                        }
                    );

                return updatedReward;
            }

            return existingReward;
        }

        await deleteSavedEggReward(
            env.DB,
            broadcasterId
        );
    }

    // Important for the Cloudflare migration:
    // the reward may already exist from the old Node version,
    // while the new D1 twitch_rewards table is still empty.
    const manageableRewards =
        await getCustomRewards(
            env,
            session.accessToken,
            broadcasterId
        );

    const matchingReward =
        manageableRewards.find(
            reward =>
                reward.title === title
        );

    if (matchingReward) {
        await saveEggReward(
            env.DB,
            broadcasterId,
            matchingReward.id
        );

        if (matchingReward.cost !== cost) {
            const updatedReward =
                await updateCustomReward(
                    env,
                    session.accessToken,
                    broadcasterId,
                    matchingReward.id,
                    {
                        title,
                        cost
                    }
                );

            return updatedReward;
        }

        return matchingReward;
    }

    const newReward =
        await createCustomReward(
            env,
            session.accessToken,
            broadcasterId,
            title,
            cost
        );

    await saveEggReward(
        env.DB,
        broadcasterId,
        newReward.id
    );

    return newReward;
}