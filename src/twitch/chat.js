import { config } from "../config/config.js";
import {twitchFetch} from "./session.js";


// ======================================================
// Subscribe to Twitch chat messages
// ======================================================

export async function subscribeToChat(
    twitchSession,
    sessionId
) {

    const response =
        await twitchFetch(
            twitchSession,
            "https://api.twitch.tv/helix/eventsub/subscriptions",
            {
                method: "POST",

                headers: {
                    "Client-ID":
                        config.twitch.clientId,

                    "Authorization":
                        `Bearer ${twitchSession.accessToken}`,

                    "Content-Type":
                        "application/json"
                },

                body:
                    JSON.stringify({
                        type:
                            "channel.chat.message",

                        version:
                            "1",

                        condition: {
                            broadcaster_user_id:
                                twitchSession.broadcaster.id,

                            user_id:
                                twitchSession.broadcaster.id
                        },

                        transport: {
                            method:
                                "websocket",

                            session_id:
                                sessionId
                        }
                    })
            }
        );


    const data =
        await response.json();


    if (!response.ok) {

        throw new Error(
            `Failed to subscribe to Twitch chat: ${JSON.stringify(data)}`
        );

    }


    console.log(
        "Twitch chat subscription ready ✓"
    );


    return data;
}


// ======================================================
// Send Twitch chat message
// ======================================================

export async function sendChatMessage(
    twitchSession,
    message
) {

    const response =
        await twitchFetch(
            twitchSession,
            "https://api.twitch.tv/helix/chat/messages",
            {
                method: "POST",

                headers: {
                    "Client-ID":
                        config.twitch.clientId,

                    "Authorization":
                        `Bearer ${twitchSession.accessToken}`,

                    "Content-Type":
                        "application/json"
                },

                body:
                    JSON.stringify({
                        broadcaster_id:
                            twitchSession.broadcaster.id,

                        sender_id:
                            twitchSession.broadcaster.id,

                        message
                    })
            }
        );


    const data =
        await response.json();


    if (!response.ok) {

        throw new Error(
            `Failed to send Twitch chat message: ${JSON.stringify(data)}`
        );

    }


    const result =
        data.data?.[0];


    if (
        result &&
        result.is_sent === false
    ) {

        console.warn(
            "Twitch did not send chat message:",
            result.drop_reason
        );

    }


    return result;
}