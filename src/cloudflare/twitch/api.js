export async function getCustomRewards(
    env,
    accessToken,
    broadcasterId
) {
    const url = new URL(
        "https://api.twitch.tv/helix/channel_points/custom_rewards"
    );

    url.searchParams.set(
        "broadcaster_id",
        broadcasterId
    );

    url.searchParams.set(
        "only_manageable_rewards",
        "true"
    );

    const response = await fetch(
        url,
        {
            headers: {
                "Client-ID":
                    env.TWITCH_CLIENT_ID,

                "Authorization":
                    `Bearer ${accessToken}`
            }
        }
    );

    const data = await response.json();

    if (!response.ok) {
        throw new Error(
            `Failed to get Twitch rewards: ${
                data.message ??
                response.status
            }`
        );
    }

    return data.data ?? [];
}

export async function getCustomRewardById(
    env,
    accessToken,
    broadcasterId,
    rewardId
) {
    const url = new URL(
        "https://api.twitch.tv/helix/channel_points/custom_rewards"
    );

    url.searchParams.set(
        "broadcaster_id",
        broadcasterId
    );

    url.searchParams.set(
        "id",
        rewardId
    );

    const response = await fetch(
        url,
        {
            headers: {
                "Client-ID":
                    env.TWITCH_CLIENT_ID,

                "Authorization":
                    `Bearer ${accessToken}`
            }
        }
    );

    const data = await response.json();

    if (!response.ok) {
        throw new Error(
            `Failed to get Twitch reward: ${
                data.message ??
                response.status
            }`
        );
    }

    return data.data?.[0] ?? null;
}

export async function createCustomReward(
    env,
    accessToken,
    broadcasterId,
    title,
    cost
) {
    const url = new URL(
        "https://api.twitch.tv/helix/channel_points/custom_rewards"
    );

    url.searchParams.set(
        "broadcaster_id",
        broadcasterId
    );

    const response = await fetch(
        url,
        {
            method: "POST",

            headers: {
                "Client-ID":
                    env.TWITCH_CLIENT_ID,

                "Authorization":
                    `Bearer ${accessToken}`,

                "Content-Type":
                    "application/json"
            },

            body: JSON.stringify({
                title,
                cost
            })
        }
    );

    const data = await response.json();

    if (!response.ok) {
        throw new Error(
            `Failed to create Twitch reward: ${
                data.message ??
                response.status
            }`
        );
    }

    const reward = data.data?.[0];

    if (!reward) {
        throw new Error(
            "Twitch did not return the created reward."
        );
    }

    return reward;
}

export async function updateCustomReward(
    env,
    accessToken,
    broadcasterId,
    rewardId,
    {
        title,
        cost
    }
) {
    const url = new URL(
        "https://api.twitch.tv/helix/channel_points/custom_rewards"
    );

    url.searchParams.set(
        "broadcaster_id",
        broadcasterId
    );

    url.searchParams.set(
        "id",
        rewardId
    );

    const response = await fetch(
        url,
        {
            method: "PATCH",

            headers: {
                "Client-ID":
                    env.TWITCH_CLIENT_ID,

                "Authorization":
                    `Bearer ${accessToken}`,

                "Content-Type":
                    "application/json"
            },

            body: JSON.stringify({
                title,
                cost
            })
        }
    );

    const data = await response.json();

    if (!response.ok) {
        throw new Error(
            `Failed to update Twitch reward: ${
                data.message ??
                response.status
            }`
        );
    }

    return data.data?.[0] ?? null;
}