import WebSocket from "ws";
import { config } from "../config/config.js";

const EVENTSUB_URL =
    "wss://eventsub.wss.twitch.tv/ws";

export function connectToEventSub(
    twitchSession,
    onRedemption
) {
    console.log(
        "Connecting to Twitch EventSub..."
    );

    const socket =
        new WebSocket(EVENTSUB_URL);

    socket.on("open", () => {
        console.log(
            "Connected to Twitch EventSub ✓"
        );
    });

    socket.on("message", async (rawData) => {
        try {
            const message =
                JSON.parse(
                    rawData.toString()
                );

            const messageType =
                message.metadata.message_type;

            switch (messageType) {
                case "session_welcome": {
                    const sessionId =
                        message.payload.session.id;

                    console.log(
                        "EventSub session:",
                        sessionId
                    );

                    await subscribeToRedemptions(
                        twitchSession,
                        sessionId
                    );

                    break;
                }

                case "notification": {
                    const event =
                        message.payload.event;

                    console.log(
                        "Channel Point redemption received:"
                    );

                    console.log(
                        `${event.user_name} redeemed ${event.reward.title}`
                    );

                    if (onRedemption) {
                        await onRedemption(event);
                    }

                    break;
                }

                case "session_keepalive": {
                    // Nothing required.
                    break;
                }

                case "session_reconnect": {
                    console.log(
                        "Twitch requested EventSub reconnect."
                    );

                    break;
                }

                case "revocation": {
                    console.error(
                        "EventSub subscription revoked:",
                        message.payload.subscription
                    );

                    break;
                }

                default: {
                    console.log(
                        "Unknown EventSub message:",
                        messageType
                    );
                }
            }

        } catch (error) {
            console.error(
                "Failed to process EventSub message:",
                error
            );
        }
    });

    socket.on("error", (error) => {
        console.error(
            "EventSub WebSocket error:",
            error
        );
    });

    socket.on("close", () => {
        console.log(
            "Disconnected from Twitch EventSub."
        );
    });

    return socket;
}


async function subscribeToRedemptions(
    twitchSession,
    sessionId
) {
    console.log(
        "Subscribing to Channel Point redemptions..."
    );

    const response = await fetch(
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

            body: JSON.stringify({
                type:
                    "channel.channel_points_custom_reward_redemption.add",

                version:
                    "1",

                condition: {
                    broadcaster_user_id:
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
            `Failed to subscribe to redemptions: ${JSON.stringify(data)}`
        );
    }

    console.log(
        "Subscribed to Channel Point redemptions ✓"
    );
}