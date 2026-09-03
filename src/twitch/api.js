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

    return data.data[0];
}