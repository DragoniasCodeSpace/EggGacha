import {
    getAppAccessToken
} from "./auth.js";

export async function setupEventSubSubscriptions(
    env,
    broadcasterId,
    rewardId
) {
    const appAccessToken =
        await getAppAccessToken(env);

    const callback =
        "https://egggacha.undyne.workers.dev/eventsub";

    const subscriptions = [];

    const redemptionSubscription =
        await createEventSubSubscription(
            env,
            appAccessToken,
            {
                type:
                    "channel.channel_points_custom_reward_redemption.add",

                version: "1",

                condition: {
                    broadcaster_user_id:
                        broadcasterId,

                    reward_id:
                        rewardId
                },

                transport: {
                    method: "webhook",
                    callback,
                    secret:
                        env.TWITCH_EVENTSUB_SECRET
                }
            }
        );

    subscriptions.push(
        redemptionSubscription
    );

    const chatSubscription =
        await createEventSubSubscription(
            env,
            appAccessToken,
            {
                type:
                    "channel.chat.message",

                version: "1",

                condition: {
                    broadcaster_user_id:
                        broadcasterId,

                    user_id:
                        broadcasterId
                },

                transport: {
                    method: "webhook",
                    callback,
                    secret:
                        env.TWITCH_EVENTSUB_SECRET
                }
            }
        );

    subscriptions.push(
        chatSubscription
    );

    return subscriptions;
}

async function createEventSubSubscription(
    env,
    appAccessToken,
    subscription
) {
    const response = await fetch(
        "https://api.twitch.tv/helix/eventsub/subscriptions",
        {
            method: "POST",

            headers: {
                "Client-ID":
                    env.TWITCH_CLIENT_ID,

                "Authorization":
                    `Bearer ${appAccessToken}`,

                "Content-Type":
                    "application/json"
            },

            body: JSON.stringify(
                subscription
            )
        }
    );

    const data = await response.json();

    /*
     * Twitch returns 409 if the exact
     * subscription already exists.
     *
     * That is fine for our sync process.
     */
    if (response.status === 409) {
        console.log(
            `EventSub subscription already exists: ${subscription.type}`
        );

        return {
            type:
                subscription.type,

            alreadyExists: true
        };
    }

    if (!response.ok) {
        throw new Error(
            `Failed to create ${subscription.type}: ${
                data.message ??
                response.status
            }`
        );
    }

    return data.data?.[0] ?? null;
}