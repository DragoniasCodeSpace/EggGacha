import {
    getOrCreateUser
} from "../database/users.js";

import {
    getValidTwitchSession
} from "./session.js";

const COLLECTION_COMMANDS = new Set([
    "!eggs",
    "!collection"
]);

export async function handleChatMessage(
    env,
    event
) {
    const message =
        event.message?.text
            ?.trim()
            .toLowerCase();

    if (!COLLECTION_COMMANDS.has(message)) {
        return null;
    }

    const user =
        await getOrCreateUser(
            env.DB,
            event.chatter_user_id,
            event.chatter_user_name
        );

    const collectionUrl =
        `${env.PUBLIC_URL}/collection/${encodeURIComponent(
            user.collection_token
        )}`;

    await sendChatMessage(
        env,
        event.broadcaster_user_id,
        event.message_id,
        collectionUrl
    );

    console.log(
        `Sent collection link to ${event.chatter_user_name}`
    );

    return {
        user,
        collectionUrl
    };
}

async function sendChatMessage(
    env,
    broadcasterId,
    replyParentMessageId,
    message
) {
    const session =
        await getValidTwitchSession(
            env,
            broadcasterId
        );

    const response = await fetch(
        "https://api.twitch.tv/helix/chat/messages",
        {
            method: "POST",

            headers: {
                "Client-ID":
                    env.TWITCH_CLIENT_ID,

                "Authorization":
                    `Bearer ${session.accessToken}`,

                "Content-Type":
                    "application/json"
            },

            body: JSON.stringify({
                broadcaster_id:
                    broadcasterId,

                sender_id:
                    broadcasterId,

                message,

                reply_parent_message_id:
                    replyParentMessageId
            })
        }
    );

    const data = await response.json();

    if (!response.ok) {
        throw new Error(
            `Failed to send Twitch chat message: ${data.message ??
            response.status
            }`
        );
    }

    return data;
}