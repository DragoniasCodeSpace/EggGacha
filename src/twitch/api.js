import { config } from "../config/config.js";

export async function getTwitchUser(accessToken) {
    const response = await fetch(
        "https://api.twitch.tv/helix/users",
        {
            headers: {
                "Client-ID": config.twitch.clientId,
                "Authorization": `Bearer ${accessToken}`
            }
        }
    );

    const data = await response.json();

    if (!response.ok) {
        throw new Error(
            `Failed to get Twitch user: ${JSON.stringify(data)}`
        );
    }

    if (!data.data || data.data.length === 0) {
        throw new Error("No Twitch user was returned.");
    }

    return data.data[0];
}


export async function getManageableRewards(twitchSession) {
    const url = new URL(
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

    const response = await fetch(url, {
        method: "GET",

        headers: {
            "Client-ID": config.twitch.clientId,
            "Authorization": `Bearer ${twitchSession.accessToken}`
        }
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(
            `Failed to get Twitch rewards: ${JSON.stringify(data)}`
        );
    }

    return data.data ?? [];
}


export async function createEggReward(twitchSession) {
    const url = new URL(
        "https://api.twitch.tv/helix/channel_points/custom_rewards"
    );

    url.searchParams.set(
        "broadcaster_id",
        twitchSession.broadcaster.id
    );

    const response = await fetch(url, {
        method: "POST",

        headers: {
            "Client-ID": config.twitch.clientId,
            "Authorization": `Bearer ${twitchSession.accessToken}`,
            "Content-Type": "application/json"
        },

        body: JSON.stringify({
            title: "🥚 Roll an Egg",
            cost: 100,

            is_enabled: true,

            is_user_input_required: false,

            should_redemptions_skip_request_queue: true
        })
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(
            `Failed to create EggGacha reward: ${JSON.stringify(data)}`
        );
    }

    if (!data.data || data.data.length === 0) {
        throw new Error(
            "Twitch created the reward but returned no reward data."
        );
    }

    return data.data[0];
}


export async function getOrCreateEggReward(twitchSession) {
    const rewards = await getManageableRewards(
        twitchSession
    );

    const existingReward = rewards.find(
        reward => reward.title === "🥚 Roll an Egg"
    );

    if (existingReward) {
        console.log(
            "EggGacha reward already exists ✓"
        );

        console.log(
            "Reward ID:",
            existingReward.id
        );

        return existingReward;
    }

    console.log(
        "Creating EggGacha Channel Point reward..."
    );

    const reward = await createEggReward(
        twitchSession
    );

    console.log(
        "EggGacha reward created ✓"
    );

    console.log(
        "Reward ID:",
        reward.id
    );

    return reward;
}